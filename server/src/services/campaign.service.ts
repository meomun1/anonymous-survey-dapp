import db from '../config/database';
import Redis from 'ioredis';
import crypto from 'crypto';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';
import { BlockchainService } from './blockchain.service';
import { CryptoService } from './crypto.service';
import { TokenService } from './token.service';
import { SurveyService } from './survey.service';
import { EmailService } from './email.service';
import { MerkleService } from './merkle.service';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Transform database row from snake_case to camelCase
 */
function transformCampaign(row: any) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    semesterId: row.semester_id,
    semesterName: row.semester_name,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    blockchainAddress: row.blockchain_address,
    encryptedPrivateKey: row.encrypted_private_key,
    // New blockchain fields
    responsesMerkleRoot: row.responses_merkle_root,
    totalResponses: row.total_responses,
    responsesPublishedAt: row.responses_published_at,
    claimedReceiptsRoot: row.claimed_receipts_root,
    totalClaimed: row.total_claimed,
    claimsUpdatedAt: row.claims_updated_at,
    blockchainClosed: row.blockchain_closed,
    blockchainClosedAt: row.blockchain_closed_at,
    blockchainSignature: row.blockchain_signature,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Service for campaign-based survey management
 */
export class CampaignService {
  private static readonly CAMPAIGN_CACHE_PREFIX = 'campaign:';
  private static readonly CACHE_TTL = 3600; // 1 hour

  private blockchainService: BlockchainService | null = null;
  private fallbackMode: boolean;
  private tokenService: TokenService;
  private surveyService: SurveyService;
  private emailService: EmailService;
  private merkleService: MerkleService;

  constructor() {
    this.tokenService = new TokenService();
    this.surveyService = new SurveyService();
    this.emailService = new EmailService();
    this.merkleService = new MerkleService();
    this.fallbackMode = process.env.SOLANA_FALLBACK_MODE === 'true';

    // Only initialize blockchain service if not in fallback mode
    if (!this.fallbackMode) {
      try {
        this.blockchainService = new BlockchainService();
        console.log('✅ Blockchain service initialized for campaigns');
      } catch (error) {
        console.warn('⚠️ Failed to initialize blockchain service, enabling fallback mode:', error);
        this.fallbackMode = true;
      }
    } else {
      console.log('📋 Running in fallback mode - blockchain operations disabled');
    }
  }

  // ============================================================================
  // CAMPAIGN CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new campaign with automatic key generation
   */
  async createCampaign(data: {
    name: string;
    type: 'course' | 'event';
    semesterId: string;
    createdBy: string;
  }) {
    const campaignId = crypto.randomUUID();
    
    // Generate blind signature key pair
    const blindSuite = RSABSSA.SHA384.PSS.Randomized();
    const { privateKey: blindSignaturePrivateKey, publicKey: blindSignaturePublicKey } = 
      await blindSuite.generateKey({
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1])
      });

    // Generate encryption key pair
    const { privateKey: encryptionPrivateKey, publicKey: encryptionPublicKey } = 
      await webcrypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

    // Export keys for storage
    const blindPrivateKey = await webcrypto.subtle.exportKey('pkcs8', blindSignaturePrivateKey);
    const blindPublicKey = await webcrypto.subtle.exportKey('spki', blindSignaturePublicKey);
    const encryptionPrivateKeyExported = await webcrypto.subtle.exportKey('pkcs8', encryptionPrivateKey);
    const encryptionPublicKeyExported = await webcrypto.subtle.exportKey('spki', encryptionPublicKey);

    // Create campaign in database
    const result = await db.query(
      `INSERT INTO survey_campaigns (
         id, name, type, semester_id, status, created_by,
         blind_signature_public_key, encryption_public_key,
         blind_signature_private_key, encryption_private_key
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        campaignId,
        data.name,
        data.type,
        data.semesterId,
        'draft',
        data.createdBy,
        Buffer.from(blindPublicKey).toString('base64'),
        Buffer.from(encryptionPublicKeyExported).toString('base64'),
        Buffer.from(blindPrivateKey).toString('base64'),
        Buffer.from(encryptionPrivateKeyExported).toString('base64')
      ]
    );

    let campaign = result.rows[0];

    // Initialize campaign on blockchain (NEW ARCHITECTURE)
    if (!this.fallbackMode && this.blockchainService) {
      try {
        // NEW: Simple initialization with just campaignId
        const signature = await this.blockchainService.initializeCampaign(campaignId);

        // Store blockchain signature
        await db.query(
          'UPDATE survey_campaigns SET blockchain_signature = $1 WHERE id = $2',
          [signature, campaignId]
        );

        campaign.blockchain_signature = signature;
        console.log(`✅ Campaign ${campaignId} initialized on blockchain`);
      } catch (error) {
        console.warn('⚠️ Failed to initialize blockchain campaign:', error);
        // Continue without blockchain integration
      }
    }

    // Clear cache
    await this.clearCampaignsCache();

    return transformCampaign(campaign);
  }

  /**
   * Get all campaigns
   */
  async getCampaigns(filters?: { status?: string; type?: string; semesterId?: string }) {
    // Build cache key based on filters
    const filterKey = filters ? JSON.stringify(filters) : 'all';
    const cacheKey = `${CampaignService.CAMPAIGN_CACHE_PREFIX}${filterKey}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let query = `
      SELECT sc.*, s.name as semester_name, a.name as created_by_name
      FROM survey_campaigns sc
      JOIN semesters s ON sc.semester_id = s.id
      JOIN admins a ON sc.created_by = a.id
    `;
    
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`sc.status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    if (filters?.type) {
      conditions.push(`sc.type = $${paramCount}`);
      values.push(filters.type);
      paramCount++;
    }

    if (filters?.semesterId) {
      conditions.push(`sc.semester_id = $${paramCount}`);
      values.push(filters.semesterId);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY sc.created_at DESC`;

    const result = await db.query(query, values);
    const campaigns = result.rows.map(transformCampaign);

    // Cache the result
    await redis.setex(cacheKey, CampaignService.CACHE_TTL, JSON.stringify(campaigns));

    return campaigns;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(id: string) {
    const cacheKey = `${CampaignService.CAMPAIGN_CACHE_PREFIX}${id}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(
      `SELECT sc.*, s.name as semester_name, a.name as created_by_name
       FROM survey_campaigns sc
       JOIN semesters s ON sc.semester_id = s.id
       JOIN admins a ON sc.created_by = a.id
       WHERE sc.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    const campaign = transformCampaign(result.rows[0]);

    // Cache the result
    await redis.setex(cacheKey, CampaignService.CACHE_TTL, JSON.stringify(campaign));

    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, data: {
    name?: string;
    type?: 'course' | 'event';
    status?: 'draft' | 'teachers_input' | 'open' | 'launched' | 'closed' | 'published';
  }) {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.type !== undefined) {
      setClause.push(`type = $${paramCount++}`);
      values.push(data.type);
    }
    if (data.status !== undefined) {
      setClause.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await db.query(
      `UPDATE survey_campaigns SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    // Clear cache
    await this.clearCampaignCache(id);
    await this.clearCampaignsCache();

    return transformCampaign(result.rows[0]);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string) {
    // Check if campaign has surveys or responses
    const checkResult = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM surveys WHERE campaign_id = $1) as survey_count,
         (SELECT COUNT(*) FROM survey_responses WHERE campaign_id = $1) as response_count`,
      [id]
    );

    const counts = checkResult.rows[0];
    if (parseInt(counts.survey_count) > 0 || parseInt(counts.response_count) > 0) {
      throw new Error('Cannot delete campaign with existing surveys or responses');
    }

    const result = await db.query(
      'DELETE FROM survey_campaigns WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    // Clear cache
    await this.clearCampaignCache(id);
    await this.clearCampaignsCache();

    return transformCampaign(result.rows[0]);
  }

  // ============================================================================
  // CAMPAIGN WORKFLOW OPERATIONS
  // ============================================================================

  /**
   * Open campaign for teacher input
   */
  async openCampaign(id: string) {
    const result = await db.query(
      `UPDATE survey_campaigns 
       SET status = 'teachers_input', opened_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'draft'
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Campaign not found or not in draft status');
    }

    // Clear cache
    await this.clearCampaignCache(id);
    await this.clearCampaignsCache();

    return result.rows[0];
  }

  /**
   * Close campaign (stop teacher input OR stop accepting student responses)
   */
  async closeCampaign(id: string) {
    // First check current status to determine target status
    const currentCampaign = await db.query(
      'SELECT status FROM survey_campaigns WHERE id = $1',
      [id]
    );

    if (currentCampaign.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    const currentStatus = currentCampaign.rows[0].status;
    let targetStatus: string;

    // Determine target status based on current status
    if (currentStatus === 'teachers_input') {
      targetStatus = 'open';
    } else if (currentStatus === 'launched') {
      targetStatus = 'closed';
    } else {
      throw new Error(`Cannot close campaign from status: ${currentStatus}`);
    }

    const result = await db.query(
      `UPDATE survey_campaigns
       SET status = $2, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, targetStatus]
    );

    // Clear cache
    await this.clearCampaignCache(id);
    await this.clearCampaignsCache();

    return result.rows[0];
  }

  /**
   * Launch campaign (generate surveys and tokens)
   */
  async launchCampaign(id: string) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get campaign details
      const campaignResult = await client.query(
        'SELECT * FROM survey_campaigns WHERE id = $1 AND status = $2',
        [id, 'open']
      );

      if (campaignResult.rowCount === 0) {
        throw new Error('Campaign not found or not in open status');
      }

      const campaign = campaignResult.rows[0];

      // Generate surveys from course assignments for course campaigns (delegate to SurveyService)
      if (campaign.type === 'course') {
        // Check if surveys already exist for this campaign
        const existingSurveysResult = await client.query(
          'SELECT COUNT(*)::int as count FROM surveys WHERE campaign_id = $1',
          [campaign.id]
        );

        if (existingSurveysResult.rows[0].count > 0) {
          // Surveys already exist, skip creation
          console.log(`⚠️ Surveys already exist for campaign ${campaign.id}, skipping creation`);
        } else {
          const assignmentsResult = await client.query(
            `SELECT ca.teacher_id, ca.course_id, ca.campaign_id, ca.semester_id,
                    t.name as teacher_name, c.name as course_name, c.code as course_code
             FROM course_assignments ca
             JOIN teachers t ON ca.teacher_id = t.id
             JOIN courses c ON ca.course_id = c.id
             WHERE ca.campaign_id = $1`,
            [campaign.id]
          );

          console.log(`📝 Creating ${assignmentsResult.rowCount} surveys for campaign ${campaign.id}`);

          for (const assignment of assignmentsResult.rows) {
            await this.surveyService.createSurvey({
              campaignId: campaign.id,
              title: `${assignment.course_name} - ${assignment.teacher_name}`,
              description: `Course evaluation for ${assignment.course_code}`,
              templateId: 'teaching_quality_25q',
              courseId: assignment.course_id,
              teacherId: assignment.teacher_id,
              status: 'active'
            });
          }
        }
      }

      // Generate tokens for all enrolled students in this campaign (campaign-specific)
      const enrollmentsResult = await client.query(
        `SELECT DISTINCT s.email
         FROM enrollments e
         JOIN students s ON e.student_id = s.id
         WHERE e.campaign_id = $1`,
        [campaign.id]
      );
      const studentEmails = enrollmentsResult.rows.map((r: any) => r.email);

      console.log(`🎫 Generating tokens for ${studentEmails.length} students in campaign ${campaign.id}`);

      await this.tokenService.generateCampaignTokens(campaign.id, studentEmails);

      // Update campaign status to launched (surveys are now active for students)
      await client.query(
        'UPDATE survey_campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['launched', campaign.id]
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearCampaignCache(id);
      await this.clearCampaignsCache();

      const surveysCountRes = await client.query('SELECT COUNT(*)::int AS cnt FROM surveys WHERE campaign_id = $1', [campaign.id]);

      // Send campaign emails (best-effort)
      try {
        await this.emailService.sendCampaignTokens(campaign.id);
      } catch (e) {
        console.warn('⚠️ Failed to send campaign emails:', e);
      }

      // Fetch and return the updated campaign
      const updatedCampaign = await this.getCampaign(campaign.id);

      return updatedCampaign;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Publish campaign responses to blockchain (Tree #1)
   * NEW: Replaces old publishCampaign() - now splits into two separate methods
   */
  async publishCampaignResponses(campaignId: string) {
    // Calculate responses Merkle root using MerkleService
    const { merkleRoot, totalCommitments } =
      await this.merkleService.calculateCampaignResponsesRoot(campaignId);

    console.log(`📊 Publishing responses Merkle root for campaign: ${campaignId}`);
    console.log(`   Total responses: ${totalCommitments}`);
    console.log(`   Merkle root: ${merkleRoot}`);

    // Publish to blockchain
    if (!this.fallbackMode && this.blockchainService) {
      try {
        const signature = await this.blockchainService.publishResponsesMerkleRoot(
          campaignId,
          merkleRoot,
          totalCommitments
        );
        console.log(`✅ Responses Merkle root published to blockchain: ${signature}`);
      } catch (error) {
        console.warn('⚠️ Failed to publish responses Merkle root to blockchain:', error);
        // Continue without blockchain integration
      }
    }

    // Store in database
    await db.query(
      `UPDATE survey_campaigns
       SET responses_merkle_root = $1,
           total_responses = $2,
           responses_published_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [merkleRoot, totalCommitments, campaignId]
    );

    // Clear cache
    await this.clearCampaignCache(campaignId);
    await this.clearCampaignsCache();

    return { merkleRoot, totalResponses: totalCommitments };
  }

  /**
   * Publish claimed receipts to blockchain (Tree #2)
   * Can be called multiple times for batched updates
   */
  async publishClaimedReceipts(campaignId: string) {
    // Calculate claimed receipts Merkle root using MerkleService
    const { merkleRoot, totalClaimed } =
      await this.merkleService.calculateCampaignClaimedReceiptsRoot(campaignId);

    console.log(`📊 Publishing claimed receipts Merkle root for campaign: ${campaignId}`);
    console.log(`   Total claimed: ${totalClaimed}`);
    console.log(`   Merkle root: ${merkleRoot}`);

    // Publish to blockchain (can be called multiple times)
    if (!this.fallbackMode && this.blockchainService) {
      try {
        const signature = await this.blockchainService.updateClaimedReceiptsRoot(
          campaignId,
          merkleRoot,
          totalClaimed
        );
        console.log(`✅ Claimed receipts root published to blockchain: ${signature}`);
      } catch (error) {
        console.warn('⚠️ Failed to publish claimed receipts root to blockchain:', error);
        // Continue without blockchain integration
      }
    }

    // Store in database
    await db.query(
      `UPDATE survey_campaigns
       SET claimed_receipts_root = $1,
           total_claimed = $2,
           claims_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [merkleRoot, totalClaimed, campaignId]
    );

    // Clear cache
    await this.clearCampaignCache(campaignId);
    await this.clearCampaignsCache();

    return { merkleRoot, totalClaimed };
  }

  /**
   * Close campaign on blockchain (prevents further updates)
   * NEW METHOD
   */
  async closeCampaignOnBlockchain(campaignId: string) {
    if (!this.fallbackMode && this.blockchainService) {
      try {
        const signature = await this.blockchainService.closeCampaign(campaignId);

        await db.query(
          `UPDATE survey_campaigns
           SET blockchain_closed = true,
               blockchain_closed_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [campaignId]
        );

        // Clear cache
        await this.clearCampaignCache(campaignId);
        await this.clearCampaignsCache();

        console.log(`✅ Campaign closed on blockchain: ${signature}`);
        return signature;
      } catch (error: any) {
        console.error('⚠️ Failed to close campaign on blockchain:', error);
        throw error;
      }
    } else {
      throw new Error('Blockchain service not available');
    }
  }

  // ============================================================================
  // SURVEY MANAGEMENT WITHIN CAMPAIGNS
  // ============================================================================

  /**
   * Get surveys for a campaign
   */
  async getCampaignSurveys(campaignId: string) {
    const result = await db.query(
      `SELECT s.*, c.name as course_name, c.code as course_code, t.name as teacher_name
       FROM surveys s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       WHERE s.campaign_id = $1
       ORDER BY c.code ASC, t.name ASC`,
      [campaignId]
    );

    return result.rows;
  }

  /**
   * Create surveys from assignments (for course campaigns)
   */
  async createSurveysFromAssignments(campaignId: string) {
    const campaign = await this.getCampaign(campaignId);
    
    if (campaign.type !== 'course') {
      throw new Error('Can only create surveys from assignments for course campaigns');
    }

    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const assignmentsResult = await client.query(
        `SELECT ca.teacher_id, ca.course_id, ca.semester_id,
                t.name as teacher_name, c.name as course_name, c.code as course_code
         FROM course_assignments ca
         JOIN teachers t ON ca.teacher_id = t.id
         JOIN courses c ON ca.course_id = c.id
         WHERE ca.semester_id = $1`,
        [campaign.semester_id]
      );

      const createdSurveys = [];

      for (const assignment of assignmentsResult.rows) {
        const surveyId = crypto.randomUUID();
        
        const result = await client.query(
          `INSERT INTO surveys (
             id, campaign_id, title, description, template_id, total_questions,
             course_id, teacher_id, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            surveyId,
            campaign.id,
            `${assignment.course_name} - ${assignment.teacher_name}`,
            `Course evaluation for ${assignment.course_code}`,
            'teaching_quality_25q',
            25,
            assignment.course_id,
            assignment.teacher_id,
            'draft'
          ]
        );

        createdSurveys.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return createdSurveys;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // CAMPAIGN STATISTICS AND ANALYTICS
  // ============================================================================

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string) {
    const result = await db.query(
      `SELECT 
         sc.id,
         sc.name,
         sc.status,
         sc.total_responses,
         COUNT(DISTINCT s.id) as total_surveys,
         COUNT(DISTINCT st.student_email) as total_tokens,
         COUNT(DISTINCT CASE WHEN st.is_completed = true THEN st.student_email END) as completed_students,
         CASE 
           WHEN COUNT(DISTINCT st.student_email) > 0 
           THEN ROUND((COUNT(DISTINCT CASE WHEN st.is_completed = true THEN st.student_email END)::DECIMAL / COUNT(DISTINCT st.student_email)) * 100, 2)
           ELSE 0 
         END as completion_rate
       FROM survey_campaigns sc
       LEFT JOIN surveys s ON sc.id = s.campaign_id
       LEFT JOIN survey_tokens st ON sc.id = st.campaign_id
       WHERE sc.id = $1
       GROUP BY sc.id, sc.name, sc.status, sc.total_responses`,
      [campaignId]
    );

    if (result.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    return result.rows[0];
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string) {
    const campaign = await this.getCampaign(campaignId);
    
    // Get survey analytics if available
    const analyticsResult = await db.query(
      'SELECT * FROM survey_analytics WHERE campaign_id = $1',
      [campaignId]
    );

    const analytics = analyticsResult.rows[0] || null;

    // Get teacher performance data
    const teacherPerformanceResult = await db.query(
      `SELECT tp.*, t.name as teacher_name, c.name as course_name, c.code as course_code
       FROM teacher_performance tp
       JOIN teachers t ON tp.teacher_id = t.id
       LEFT JOIN surveys s ON tp.campaign_id = s.campaign_id AND tp.teacher_id = s.teacher_id
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE tp.campaign_id = $1
       ORDER BY tp.average_score DESC`,
      [campaignId]
    );

    return {
      campaign,
      analytics,
      teacherPerformance: teacherPerformanceResult.rows
    };
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private async clearCampaignsCache() {
    const pattern = `${CampaignService.CAMPAIGN_CACHE_PREFIX}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private async clearCampaignCache(id: string) {
    await redis.del(`${CampaignService.CAMPAIGN_CACHE_PREFIX}${id}`);
  }
}
