import db from '../config/database';
import { Redis } from 'ioredis';
import crypto from 'crypto';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

/**
 * Service for managing student authentication tokens
 */
export class TokenService {
  /**
   * Generate campaign-level tokens for provided student emails
   */
  async generateCampaignTokens(campaignId: string, studentEmails: string[]) {
    const created: any[] = [];
    for (const email of studentEmails) {
      // Check if token already exists for this student and campaign
      const existing = await db.query(
        `SELECT id, token, campaign_id, student_email, used, is_completed, blockchain_submitted, created_at, used_at, completed_at
         FROM survey_tokens WHERE campaign_id = $1 AND student_email = $2 LIMIT 1`,
        [campaignId, email]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        // Token already exists, use existing one
        const row = existing.rows[0];
        const record = {
          id: row.id,
          campaignId: row.campaign_id,
          token: row.token,
          studentEmail: row.student_email,
          used: !!row.used,
          isCompleted: !!row.is_completed,
          blockchainSubmitted: !!row.blockchain_submitted,
          createdAt: row.created_at,
          usedAt: row.used_at,
          completedAt: row.completed_at
        };
        created.push(record);
        continue;
      }

      // Create new token
      const tokenValue = this.generateToken();
      const id = crypto.randomUUID();
      const result = await db.query(
        `INSERT INTO survey_tokens (id, token, campaign_id, student_email)
         VALUES ($1, $2, $3, $4)
         RETURNING id, token, campaign_id, student_email, used, is_completed, blockchain_submitted, created_at, used_at, completed_at`,
        [id, tokenValue, campaignId, email]
      );
      const row = result.rows[0];
      const record = {
        id: row.id,
        campaignId: row.campaign_id,
        token: row.token,
        studentEmail: row.student_email,
        used: !!row.used,
        isCompleted: !!row.is_completed,
        blockchainSubmitted: !!row.blockchain_submitted,
        createdAt: row.created_at,
        usedAt: row.used_at,
        completedAt: row.completed_at
      };
      created.push(record);
      await redis.set(`token:${record.token}`, JSON.stringify(record), 'EX', 3600);
    }
    return created;
  }

  /**
   * Validate a campaign token (survey_tokens)
   * Only returns valid token data if campaign is in "launched" status
   */
  async validateCampaignToken(token: string) {
    const cached = await redis.get(`token:${token}`);
    if (cached) {
      const tokenData = JSON.parse(cached);
      // Check campaign status even for cached tokens
      const campaignStatus = await db.query(
        `SELECT status FROM survey_campaigns WHERE id = $1 LIMIT 1`,
        [tokenData.campaignId]
      );
      if (!campaignStatus.rows[0] || campaignStatus.rows[0].status !== 'launched') {
        return null;
      }
      return tokenData;
    }

    const result = await db.query(
      `SELECT st.id, st.token, st.campaign_id, st.student_email, st.used, st.is_completed, st.blockchain_submitted, st.created_at, st.used_at, st.completed_at,
              sc.status as campaign_status
       FROM survey_tokens st
       JOIN survey_campaigns sc ON st.campaign_id = sc.id
       WHERE st.token = $1 LIMIT 1`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;

    // Only allow access if campaign is launched
    if (row.campaign_status !== 'launched') {
      return null;
    }

    const tokenData = {
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      blockchainSubmitted: !!row.blockchain_submitted,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    };
    await redis.set(`token:${token}`, JSON.stringify(tokenData), 'EX', 3600);
    return tokenData;
  }

  /**
   * Mark campaign token as used
   */
  async markCampaignTokenUsed(token: string) {
    const result = await db.query(
      `UPDATE survey_tokens SET used = true, used_at = NOW() WHERE token = $1
       RETURNING id, token, campaign_id, student_email, used, is_completed, blockchain_submitted, created_at, used_at, completed_at`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;
    const updated = {
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      blockchainSubmitted: !!row.blockchain_submitted,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    };
    await redis.set(`token:${token}`, JSON.stringify(updated), 'EX', 3600);
    return updated;
  }

  /**
   * Mark campaign token as completed
   */
  async markCampaignTokenCompleted(token: string) {
    const result = await db.query(
      `UPDATE survey_tokens SET is_completed = true, completed_at = NOW() WHERE token = $1
       RETURNING id, token, campaign_id, student_email, used, is_completed, blockchain_submitted, created_at, used_at, completed_at`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;
    const updated = {
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      blockchainSubmitted: !!row.blockchain_submitted,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    };
    await redis.set(`token:${token}`, JSON.stringify(updated), 'EX', 3600);
    return updated;
  }

  /**
   * Mark campaign token as blockchain submitted
   */
  async markTokenBlockchainSubmitted(token: string) {
    const result = await db.query(
      `UPDATE survey_tokens SET blockchain_submitted = true WHERE token = $1
       RETURNING id, token, campaign_id, student_email, used, is_completed, blockchain_submitted, created_at, used_at, completed_at`,
      [token]
    );
    const row = result.rows[0];
    if (!row) return null;
    const updated = {
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      blockchainSubmitted: !!row.blockchain_submitted,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    };
    await redis.set(`token:${token}`, JSON.stringify(updated), 'EX', 3600);
    return updated;
  }

  /**
   * Get tokens for a campaign
   */
  async getCampaignTokens(campaignId: string) {
    const result = await db.query(
      `SELECT id, token, campaign_id, student_email, used, is_completed, blockchain_submitted, created_at, used_at, completed_at
       FROM survey_tokens WHERE campaign_id = $1 ORDER BY created_at DESC`,
      [campaignId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      blockchainSubmitted: !!row.blockchain_submitted,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    }));
  }

  /**
   * Get tokens for a student (optionally filtered by campaign)
   */
  async getStudentTokens(studentEmail: string, campaignId?: string) {
    const result = await db.query(
      `SELECT id, token, campaign_id, student_email, ticket, used, is_completed, blockchain_submitted, created_at, used_at, completed_at
       FROM survey_tokens
       WHERE student_email = $1 ${campaignId ? 'AND campaign_id = $2' : ''}
       ORDER BY created_at DESC`,
      campaignId ? [studentEmail, campaignId] : [studentEmail]
    );
    return result.rows.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      token: row.token,
      studentEmail: row.student_email,
      ticket: !!row.ticket,
      used: !!row.used,
      isCompleted: !!row.is_completed,
      blockchainSubmitted: !!row.blockchain_submitted,
      createdAt: row.created_at,
      usedAt: row.used_at,
      completedAt: row.completed_at
    }));
  }

  // Generate a secure random token (shared)
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Double Blind Signature Workflow Methods
   */

  /**
   * Generate ticket commitment (SHA-256)
   * Phase 1: All students with same survey count get identical commitment
   */
  generateTicketCommitment(surveyCount: number): string {
    const ticketData = JSON.stringify({ type: surveyCount });
    return crypto.createHash('sha256').update(ticketData).digest('hex');
  }

  /**
   * Get surveys for token with enrollments
   * Phase 1: Returns surveys student is enrolled in
   */
  async getSurveysForToken(token: string) {
    // Get token data
    const tokenResult = await db.query(
      `SELECT campaign_id, student_email, ticket, used FROM survey_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );

    if (tokenResult.rowCount === 0) {
      return null;
    }

    const { campaign_id, student_email, ticket, used } = tokenResult.rows[0];

    // Return token data with ticket status
    const tokenData = {
      campaignId: campaign_id,
      studentEmail: student_email,
      ticket: !!ticket,
      used: !!used
    };

    // Get student ID from email
    const studentResult = await db.query(
      `SELECT id FROM students WHERE email = $1 LIMIT 1`,
      [student_email]
    );

    if (studentResult.rowCount === 0) {
      return { ...tokenData, surveys: [] };
    }

    const studentId = studentResult.rows[0].id;

    // Get enrollments for this student in this campaign
    const enrollmentsResult = await db.query(
      `SELECT course_id FROM enrollments
       WHERE student_id = $1 AND campaign_id = $2`,
      [studentId, campaign_id]
    );

    const courseIds = enrollmentsResult.rows.map(row => row.course_id);

    if (courseIds.length === 0) {
      return { ...tokenData, surveys: [] };
    }

    // Get surveys for these courses
    const surveysResult = await db.query(
      `SELECT s.id, s.title, s.description, s.course_id, s.teacher_id,
              c.code as course_code, c.name as course_name,
              t.name as teacher_name
       FROM surveys s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       WHERE s.campaign_id = $1 AND s.course_id = ANY($2)
       ORDER BY c.code, t.name`,
      [campaign_id, courseIds]
    );

    const surveys = surveysResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      courseCode: row.course_code,
      courseName: row.course_name,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name
    }));

    return { ...tokenData, surveys };
  }

  /**
   * Mark token ticket as issued
   * Phase 1: Prevents multiple ticket requests
   */
  async markTicketIssued(token: string) {
    await db.query(
      `UPDATE survey_tokens SET ticket = true WHERE token = $1`,
      [token]
    );
    // Invalidate Redis cache so validateCampaignToken gets fresh data
    await redis.del(`token:${token}`);
  }
} 