import db from '../config/database';
import crypto from 'crypto';
import Redis from 'ioredis';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';
import { BlockchainService } from './blockchain.service';
import { CryptoService } from './crypto.service';
import { createHash } from 'crypto';
import { generateShortId, isValidShortId } from '../utils/shortId';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Service for survey management with automatic key generation and blockchain integration
 */
export class SurveyService {
  private static readonly SURVEY_CACHE_PREFIX = 'survey:';
  private static readonly SURVEY_LIST_CACHE_KEY = 'survey:list';
  private static readonly CACHE_TTL = 3600; // 1 hour

  private cryptoService: CryptoService;
  private blockchainService: BlockchainService | null = null;
  private fallbackMode: boolean;

  constructor() {
    this.cryptoService = new CryptoService();
    this.fallbackMode = process.env.SOLANA_FALLBACK_MODE === 'true';
    
    // Only initialize blockchain service if not in fallback mode
    if (!this.fallbackMode) {
      try {
        this.blockchainService = new BlockchainService();
        console.log('✅ Blockchain service initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize blockchain service, enabling fallback mode:', error);
        this.fallbackMode = true;
      }
    } else {
      console.log('📋 Running in fallback mode - blockchain operations disabled');
    }
  }

  /**
   * Create a new survey with automatic key generation
   * @param {Object} data - Survey data (title, description, question)
   * @returns {Promise<Object>} Created survey object
   */
  async createSurvey(data: {
    title: string;
    description?: string;
    question: string;
  }) {
    // Generate a unique short ID for blockchain operations
    let shortId: string;
    let isUnique = false;
    
    while (!isUnique) {
      shortId = generateShortId(8);
      const existing = await db.query(
        'SELECT 1 FROM surveys WHERE short_id = $1 LIMIT 1',
        [shortId]
      );
      isUnique = existing.rowCount === 0;
    }
    
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

    // Create survey in database
    const surveyId = crypto.randomUUID();
    const insertSurvey = await db.query(
      `INSERT INTO surveys (
         id, short_id, title, description, question,
         blind_signature_public_key, encryption_public_key,
         is_published, total_responses, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7,
         false, 0, NOW(), NOW()
       ) RETURNING id, short_id, title, description, question, blind_signature_public_key, encryption_public_key, is_published, total_responses, created_at, updated_at`,
      [
        surveyId,
        shortId!,
        data.title,
        data.description ?? null,
        data.question,
        Buffer.from(blindPublicKey).toString('base64'),
        Buffer.from(encryptionPublicKeyExported).toString('base64'),
      ]
    );
    const survey = {
      id: insertSurvey.rows[0].id,
      shortId: insertSurvey.rows[0].short_id,
      title: insertSurvey.rows[0].title,
      description: insertSurvey.rows[0].description,
      question: insertSurvey.rows[0].question,
      blindSignaturePublicKey: insertSurvey.rows[0].blind_signature_public_key,
      encryptionPublicKey: insertSurvey.rows[0].encryption_public_key,
      isPublished: insertSurvey.rows[0].is_published,
      totalResponses: insertSurvey.rows[0].total_responses,
      createdAt: insertSurvey.rows[0].created_at,
      updatedAt: insertSurvey.rows[0].updated_at,
    } as any;

    // Store private keys securely
    await db.query(
      `INSERT INTO survey_private_keys (id, survey_id, blind_signature_private_key, encryption_private_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [
        crypto.randomUUID(),
        survey.id,
        Buffer.from(blindPrivateKey).toString('base64'),
        Buffer.from(encryptionPrivateKeyExported).toString('base64'),
      ]
    );

    // Clear surveys list cache
    await redis.del(SurveyService.SURVEY_LIST_CACHE_KEY);

    // Check if we should use blockchain
    if (this.fallbackMode || !this.blockchainService) {
      console.log('📋 Survey created without blockchain integration (fallback mode or service unavailable)');
      return survey;
    }

    try {
      console.log('🔗 Attempting to create survey on blockchain with shortId:', survey.shortId);
      
      // Create survey on blockchain using shortId
      const surveyPda = await this.blockchainService.createSurvey(
        survey.shortId,  // Use shortId instead of UUID
        survey.title,
        survey.description || '',
        Buffer.from(blindPublicKey),
        Buffer.from(encryptionPublicKeyExported)
      );

      console.log('🎯 Blockchain survey created, PDA:', surveyPda.toString());

      // Update survey with blockchain address
      const updateRes = await db.query(
        `UPDATE surveys SET blockchain_address = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [survey.id, surveyPda.toString()]
      );
      const updatedSurvey = updateRes.rows[0];

      console.log(`✅ Survey created successfully with shortId: ${survey.shortId} and blockchain address: ${surveyPda.toString()}`);
      return updatedSurvey;
    } catch (error: any) {
      console.error('❌ Failed to create survey on blockchain:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      
      // If blockchain creation fails, rollback database changes
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM survey_private_keys WHERE survey_id = $1', [survey.id]);
        await client.query('DELETE FROM surveys WHERE id = $1', [survey.id]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      throw new Error('Failed to create survey on blockchain: ' + error.message);
    }
  }

  /**
   * Update an existing survey
   * @param {string} id - Survey ID
   * @param {Object} data - Updated survey data (title, description, question)
   * @returns {Promise<Object>} Updated survey object
   */
  async updateSurvey(id: string, data: {
    title?: string;
    description?: string;
    question?: string;
  }) {
    try {
      // Check if survey exists
      const existingSurvey = await db.query(
        'SELECT id FROM surveys WHERE id = $1 LIMIT 1',
        [id]
      );

      if (existingSurvey.rowCount === 0) {
        throw new Error('Survey not found');
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        updateValues.push(data.title);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        updateValues.push(data.description);
      }
      if (data.question !== undefined) {
        updateFields.push(`question = $${++paramCount}`);
        updateValues.push(data.question);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = $${++paramCount}`);
      updateValues.push(new Date());

      // Add survey ID as first parameter
      updateValues.unshift(id);

      const updateQuery = `
        UPDATE surveys 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(updateQuery, updateValues);
      
      // Clear cache
      await Promise.all([
        redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`),
        redis.del(SurveyService.SURVEY_LIST_CACHE_KEY)
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a survey with caching
   * @param {string} id - Survey ID
   * @returns {Promise<Object>} Survey object with tokens and responses
   */
  async getSurvey(id: string) {
    const cachedSurvey = await redis.get(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`);
    if (cachedSurvey) {
      return JSON.parse(cachedSurvey);
    }

    const surveyRes = await db.query(
      `SELECT * FROM surveys WHERE id = $1 LIMIT 1`,
      [id]
    );
    const survey = surveyRes.rows[0];
    if (!survey) {
      throw new Error('Survey not found');
    }
    const tokensRes = await db.query(
      `SELECT * FROM tokens WHERE survey_id = $1`,
      [id]
    );
    const responsesRes = await db.query(
      `SELECT * FROM survey_responses WHERE survey_id = $1`,
      [id]
    );
    const surveyWithRelations = {
      ...survey,
      tokens: tokensRes.rows,
      responses: responsesRes.rows,
    };

    if (!survey) {
      throw new Error('Survey not found');
    }

    await redis.set(
      `${SurveyService.SURVEY_CACHE_PREFIX}${id}`,
      JSON.stringify(surveyWithRelations),
      'EX',
      SurveyService.CACHE_TTL
    );

    return surveyWithRelations as any;
  }

  /**
   * Get all surveys with counts
   * @returns {Promise<Array>} Array of surveys with response and token counts
   */
  async getAllSurveys() {
    const cachedSurveys = await redis.get(SurveyService.SURVEY_LIST_CACHE_KEY);
    if (cachedSurveys) {
      return JSON.parse(cachedSurveys);
    }

    const surveysRes = await db.query(`SELECT * FROM surveys ORDER BY created_at DESC`);
    const surveys = await Promise.all(
      surveysRes.rows.map(async (s) => {
        const counts = await db.query(
          `SELECT 
             (SELECT COUNT(*) FROM survey_responses WHERE survey_id = $1) AS responses,
             (SELECT COUNT(*) FROM tokens WHERE survey_id = $1) AS tokens`,
          [s.id]
        );
        return { ...s, _count: { responses: Number(counts.rows[0].responses), tokens: Number(counts.rows[0].tokens) } };
      })
    );

    await redis.set(
      SurveyService.SURVEY_LIST_CACHE_KEY,
      JSON.stringify(surveys),
      'EX',
      SurveyService.CACHE_TTL
    );

    return surveys;
  }

  /**
   * Get survey participation statistics
   * @param {string} id - Survey ID
   * @returns {Promise<Object>} Statistics object with participation rates
   */
  async getSurveyStats(id: string) {
    const tokensRes = await db.query(`SELECT used, is_completed AS "isCompleted" FROM tokens WHERE survey_id = $1`, [id]);
    const responsesRes = await db.query(`SELECT id FROM survey_responses WHERE survey_id = $1`, [id]);

    // If there are no tokens and no responses, still return zeros

    const totalTokens = Number(tokensRes.rowCount || 0);
    const usedTokens = tokensRes.rows.filter((t) => t.used).length;
    const completedTokens = tokensRes.rows.filter((t) => t.isCompleted || t.iscompleted).length;
    const totalResponses = responsesRes.rowCount;

    return {
      totalTokens,
      usedTokens,
      completedTokens,
      totalResponses,
      participationRate: totalTokens > 0 ? (usedTokens / totalTokens) * 100 : 0,
      completionRate: totalTokens > 0 ? (completedTokens / totalTokens) * 100 : 0
    };
  }

  /**
   * Delete a survey and all related data
   * @param {string} id - Survey ID
   * @returns {Promise<{success: boolean}>} Success confirmation
   */
  async deleteSurvey(id: string) {
    const surveyRes = await db.query(`SELECT id FROM surveys WHERE id = $1 LIMIT 1`, [id]);
    const survey = surveyRes.rows[0];

    if (!survey) {
      throw new Error('Survey not found');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM survey_responses WHERE survey_id = $1', [id]);
      await client.query('DELETE FROM tokens WHERE survey_id = $1', [id]);
      await client.query('DELETE FROM survey_private_keys WHERE survey_id = $1', [id]);
      await client.query('DELETE FROM surveys WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Invalidate caches
    await Promise.all([
      redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
      redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${id}`)
    ]);

    return { success: true };
  }
  

  /**
   * Get survey public keys for client operations
   * @param {string} surveyId - Survey ID
   * @returns {Promise<{blindSignaturePublicKey: Buffer, encryptionPublicKey: Buffer}>} Public keys
   */
  async getSurveyPublicKeys(surveyId: string) {
    try {
      return await this.cryptoService.getSurveyPublicKeys(surveyId);
    } catch (error: any) {
      throw new Error(`Failed to get survey public keys: ${error.message}`);
    }
  }

  /**
   * Process and decrypt all survey responses from blockchain
   * @param {string} surveyId - Survey ID
   * @returns {Promise<{processedResponses: number, responses: Array}>} Processing results
   */
  async processResponsesFromBlockchain(surveyId: string) {
    try {
      // Get survey from database to access shortId
      const surveyRes = await db.query(`SELECT id, short_id FROM surveys WHERE id = $1 LIMIT 1`, [surveyId]);
      const survey = surveyRes.rows[0] ? { id: surveyRes.rows[0].id, shortId: surveyRes.rows[0].short_id } : null;

      if (!survey) {
        throw new Error('Survey not found');
      }

      // Get survey from blockchain using shortId
      const blockchainSurvey = await this.blockchainService?.getSurvey(survey.shortId);
      
      if (!blockchainSurvey?.data?.encryptedAnswers || blockchainSurvey.data.encryptedAnswers.length === 0) {
        throw new Error('No encrypted responses found on blockchain');
      }

      // Convert encrypted answers to ArrayBuffer format
      const encryptedAnswers = blockchainSurvey.data.encryptedAnswers.map((answer: number[]) => 
        new Uint8Array(answer).buffer
      );

      // Decrypt all responses
      const decryptedAnswers = await this.cryptoService.decryptAllResponses(surveyId, encryptedAnswers);

      // Store decrypted responses in database
      const responses = await Promise.all(
        decryptedAnswers.map(async (answer, index) => {
          const commitment = new Uint8Array(blockchainSurvey!.data.commitments[index]);
          const commitmentHash = Buffer.from(commitment).toString('hex');

          await db.query(
            `INSERT INTO survey_responses (id, survey_id, encrypted_answer, decrypted_answer, commitment_hash, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [
              crypto.randomUUID(),
              surveyId,
              Buffer.from(blockchainSurvey!.data.encryptedAnswers[index]).toString('base64'),
              answer,
              commitmentHash,
            ]
          );
          return { decryptedAnswer: answer, commitmentHash } as any;
        })
      );

      // Update survey response count
      await db.query(`UPDATE surveys SET total_responses = $2, updated_at = NOW() WHERE id = $1`, [surveyId, responses.length]);

      // Invalidate caches
      await Promise.all([
        redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
        redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${surveyId}`)
      ]);

      return {
        processedResponses: responses.length,
        responses: responses
      };
    } catch (error: any) {
      throw new Error(`Failed to process responses from blockchain: ${error.message}`);
    }
  }

  /**
   * Get decrypted survey results (after processing)
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Survey results with aggregated data
   */
  async getSurveyResults(surveyId: string) {
    try {
      const surveyRes = await db.query(
        `SELECT id, short_id, title, total_responses, is_published, published_at, merkle_root
         FROM surveys WHERE id = $1 LIMIT 1`,
        [surveyId]
      );
      const responsesDb = await db.query(
        `SELECT decrypted_answer FROM survey_responses WHERE survey_id = $1`,
        [surveyId]
      );
      const survey = surveyRes.rows[0]
        ? {
            id: surveyRes.rows[0].id,
            shortId: surveyRes.rows[0].short_id,
            title: surveyRes.rows[0].title,
            totalResponses: surveyRes.rows[0].total_responses,
            isPublished: surveyRes.rows[0].is_published,
            publishedAt: surveyRes.rows[0].published_at,
            merkleRoot: surveyRes.rows[0].merkle_root,
            responses: responsesDb.rows.map((r) => ({ decryptedAnswer: r.decrypted_answer })),
          }
        : null;

      if (!survey) {
        throw new Error('Survey not found');
      }

      if (!survey.isPublished) {
        throw new Error('Survey is not yet published');
      }

      if (this.fallbackMode) {
        // In fallback mode, return database results directly
        console.log('📋 Getting survey results in fallback mode');
        
        const answerCounts: { [key: string]: number } = {};
        survey.responses.forEach((response: any) => {
          if (response.decryptedAnswer) {
            answerCounts[response.decryptedAnswer] = (answerCounts[response.decryptedAnswer] || 0) + 1;
          }
        });

        return {
          surveyId: survey.id,
          title: survey.title,
          totalResponses: survey.totalResponses,
          answerDistribution: answerCounts,
          isPublished: survey.isPublished,
          publishedAt: survey.publishedAt,
          merkleRoot: survey.merkleRoot
        };
      }

      // Blockchain mode - verify with blockchain data
      try {
        // Get survey from blockchain using shortId
        const blockchainSurvey = await this.blockchainService?.getSurvey(survey.shortId);
        
        if (!blockchainSurvey?.data?.encryptedAnswers || blockchainSurvey.data.encryptedAnswers.length === 0) {
          throw new Error('No encrypted responses found on blockchain');
        }

        const encryptedAnswers = blockchainSurvey.data.encryptedAnswers.map((answer: any) => 
          Buffer.from(answer)
        );

        // Decrypt all responses
        const decryptedAnswers = await this.cryptoService.decryptAllResponses(surveyId, encryptedAnswers);

        // Store decrypted responses in database
        const responses = await Promise.all(
          decryptedAnswers.map(async (answer: string, index: number) => {
            const commitment = blockchainSurvey!.data.commitments[index];
            const commitmentHash = Buffer.from(commitment).toString('hex');

            await db.query(
              `INSERT INTO survey_responses (id, survey_id, encrypted_answer, decrypted_answer, commitment_hash, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
              [
                crypto.randomUUID(),
                surveyId,
                encryptedAnswers[index].toString('base64'),
                answer,
                commitmentHash,
              ]
            );
            return { decryptedAnswer: answer, commitmentHash } as any;
          })
        );

        // Update survey response count
        await db.query(`UPDATE surveys SET total_responses = $2, updated_at = NOW() WHERE id = $1`, [surveyId, responses.length]);

        // Calculate answer distribution
        const answerCounts: { [key: string]: number } = {};
        responses.forEach(response => {
          if (response.decryptedAnswer) {
            answerCounts[response.decryptedAnswer] = (answerCounts[response.decryptedAnswer] || 0) + 1;
          }
        });

        return {
          surveyId: survey.id,
          title: survey.title,
          totalResponses: blockchainSurvey.data.totalResponses,
          answerDistribution: answerCounts,
          isPublished: blockchainSurvey.data.isPublished,
          publishedAt: survey.publishedAt,
          merkleRoot: Buffer.from(blockchainSurvey.data.merkleRoot).toString('hex')
        };
      } catch (blockchainError) {
        console.warn('⚠️ Blockchain operation failed, falling back to database:', blockchainError);
        // Fallback to database results if blockchain fails
        const answerCounts: { [key: string]: number } = {};
        survey.responses.forEach((response: any) => {
          if (response.decrypted_answer) {
            answerCounts[response.decrypted_answer] = (answerCounts[response.decrypted_answer] || 0) + 1;
          }
        });

        return {
          surveyId: survey.id,
          title: survey.title,
          totalResponses: survey.totalResponses,
          answerDistribution: answerCounts,
          isPublished: survey.isPublished,
          publishedAt: survey.publishedAt,
          merkleRoot: survey.merkleRoot
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to get survey results: ${error.message}`);
    }
  }

  /**
   * Publish survey results with Merkle proof
   * @param {string} surveyId - Survey ID to publish
   * @returns {Promise<Object>} Published survey data
   */
  async publishSurveyWithMerkleProof(surveyId: string) {
    try {
      // Get survey from database to access shortId
      const surveyRes2 = await db.query(`SELECT id, short_id FROM surveys WHERE id = $1 LIMIT 1`, [surveyId]);
      const survey = surveyRes2.rows[0] ? { id: surveyRes2.rows[0].id, shortId: surveyRes2.rows[0].short_id } : null;

      if (!survey) {
        throw new Error('Survey not found');
      }

      // Get all commitments from database
      const respRes = await db.query(
        `SELECT commitment_hash FROM survey_responses WHERE survey_id = $1`,
        [surveyId]
      );
      const responses = respRes.rows.map((r: any) => ({ commitmentHash: r.commitment_hash }));

      if (responses.length === 0) {
        throw new Error('No responses found to publish');
      }

      const commitments = responses.map(r => Buffer.from(r.commitmentHash, 'hex'));

      // Create Merkle root
      const merkleRoot = await this.cryptoService.createMerkleRoot(commitments);
      const merkleRootHex = Buffer.from(merkleRoot).toString('hex');

      if (this.fallbackMode) {
        console.log('📋 Publishing survey in fallback mode - blockchain operations skipped');
        
        // Update database only
        const update = await db.query(
          `UPDATE surveys SET is_published = true, published_at = NOW(), merkle_root = $2, updated_at = NOW()
           WHERE id = $1 RETURNING id, is_published, published_at, merkle_root, total_responses`,
          [surveyId, merkleRootHex]
        );
        const publishedSurvey = update.rows[0];

        // Invalidate caches after successful publish
        await Promise.all([
          redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
          redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${surveyId}`)
        ]);

        return {
          surveyId: publishedSurvey.id,
          isPublished: publishedSurvey.is_published,
          publishedAt: publishedSurvey.published_at,
          merkleRoot: publishedSurvey.merkle_root,
          totalResponses: Number(publishedSurvey.total_responses || 0),
        };
      }

      // Publish survey on blockchain using shortId (not UUID)
      await this.blockchainService?.publishResults(survey.shortId);

      // Update database
      const update = await db.query(
        `UPDATE surveys SET is_published = true, published_at = NOW(), merkle_root = $2, updated_at = NOW()
         WHERE id = $1 RETURNING id, is_published, published_at, merkle_root, total_responses`,
        [surveyId, merkleRootHex]
      );
      const publishedSurvey = update.rows[0];

      // Invalidate caches after successful publish
      await Promise.all([
        redis.del(SurveyService.SURVEY_LIST_CACHE_KEY),
        redis.del(`${SurveyService.SURVEY_CACHE_PREFIX}${surveyId}`)
      ]);

      return {
        surveyId: publishedSurvey.id,
        isPublished: publishedSurvey.is_published,
        publishedAt: publishedSurvey.published_at,
        merkleRoot: publishedSurvey.merkle_root,
        totalResponses: Number(publishedSurvey.total_responses || 0),
      };
    } catch (error: any) {
      throw new Error(`Failed to publish survey: ${error.message}`);
    }
  }
} 