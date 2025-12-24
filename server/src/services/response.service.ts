import db from '../config/database';
import crypto from 'crypto';
import { CryptoService } from './crypto.service';
import { BlockchainService } from './blockchain.service';
import { TokenService } from './token.service';
const cryptoService = new CryptoService();
const tokenService = new TokenService();

/**
 * Service for managing survey responses and blind signatures
 */
export class ResponseService {
  // ============================================================================
  // PARSING HELPERS
  // ============================================================================
  /**
   * Parse full answer string "surveyId|courseCode|teacherId|123451...123"
   */
  parseAnswerString(answerString: string) {
    const parts = answerString.split('|');
    if (parts.length < 4) throw new Error('Invalid answer string format');
    const surveyId = parts[0];
    const courseCode = parts[1];
    const teacherId = parts[2];
    const answersRaw = parts.slice(3).join('|');
    const answers: number[] = [];
    for (let i = 0; i < answersRaw.length; i++) {
      const v = parseInt(answersRaw[i]);
      if (isNaN(v) || v < 1 || v > 5) throw new Error(`Invalid answer value at index ${i}`);
      answers.push(v);
    }
    return { surveyId, courseCode, teacherId, answers };
  }

  /** Get parsed responses by survey from parsed_responses */
  async getParsedResponsesBySurvey(surveyId: string) {
    const result = await db.query(
      `SELECT pr.*, dr.answer_string, sr.commitment
       FROM parsed_responses pr
       JOIN decrypted_responses dr ON pr.decrypted_response_id = dr.id
       JOIN survey_responses sr ON dr.response_id = sr.id
       WHERE pr.survey_id = $1
       ORDER BY dr.created_at DESC`,
      [surveyId]
    );
    return result.rows;
  }

  /**
   * Verify response integrity by checking commitment
   * @param {string} responseId - Response ID
   * @returns {Promise<boolean>} True if integrity is valid
   */
  async verifyResponseIntegrity(decryptedResponseId: string): Promise<boolean> {
    const result = await db.query(
      `SELECT dr.answer_string, sr.commitment
       FROM decrypted_responses dr
       JOIN survey_responses sr ON dr.response_id = sr.id
       WHERE dr.id = $1 LIMIT 1`,
      [decryptedResponseId]
    );
    if (result.rowCount === 0) throw new Error('Response not found');
    const row = result.rows[0];
    const calc = await cryptoService.generateCommitment(row.answer_string);
    const calcHex = Buffer.from(calc).toString('hex');
    return calcHex === row.commitment;
  }

  /**
   * Get response by commitment hash
   * @param {string} commitmentHash - Hex encoded commitment hash
   * @returns {Promise<Object|null>} Response object or null
   */
  async getResponseByCommitment(commitmentHex: string) {
    const result = await db.query(
      `SELECT sr.id as response_id, sr.campaign_id, sr.commitment,
              dr.id as decrypted_id, dr.answer_string,
              pr.survey_id, pr.answers
       FROM survey_responses sr
       LEFT JOIN decrypted_responses dr ON dr.response_id = sr.id
       LEFT JOIN parsed_responses pr ON pr.decrypted_response_id = dr.id
       WHERE sr.commitment = $1 LIMIT 1`,
      [commitmentHex]
    );
    return result.rows[0] || null;
  }

  // ============================================================================
  // NOTE: Old blockchain submission methods removed (NEW ARCHITECTURE)
  // ============================================================================
  // - Responses are stored in DATABASE only (not on-chain)
  // - Only Merkle roots are published to blockchain
  // - submitBatchResponses() below is the CORRECT Phase 3 implementation
  // ============================================================================

  /**
   * Get encrypted responses for a campaign (check if ingested)
   */
  async getEncryptedResponsesByCampaign(campaignId: string) {
    const result = await db.query(
      'SELECT * FROM survey_responses WHERE campaign_id = $1',
      [campaignId]
    );
    return result.rows;
  }

  /**
   * Get decrypted responses for a campaign (check if decrypted)
   */
  async getDecryptedResponsesByCampaign(campaignId: string) {
    const result = await db.query(
      `SELECT dr.*
       FROM decrypted_responses dr
       JOIN survey_responses sr ON dr.response_id = sr.id
       WHERE sr.campaign_id = $1`,
      [campaignId]
    );
    return result.rows;
  }

  /**
   * Phase 3: Submit batch responses with blind signature authorization
   * Processes encrypted responses, validates, stores, and returns receipt signature
   */
  async submitBatchResponses(
    campaignId: string,
    responses: Array<{ surveyId: string; encryptedAnswer: string; commitment: string }>,
    ticketCommitment: string,
    blindedReceipt: string
  ) {
    // Verify ticket commitment matches response count
    const expectedCommitment = tokenService.generateTicketCommitment(responses.length);
    if (ticketCommitment !== expectedCommitment) {
      throw new Error('Ticket commitment mismatch');
    }

    // Process each response
    const processedResponses = [];
    for (const response of responses) {
      const { surveyId, encryptedAnswer, commitment } = response;

      // Check if commitment already exists
      const existing = await db.query(
        `SELECT id FROM survey_responses WHERE commitment = $1 LIMIT 1`,
        [commitment]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        throw new Error(`Response with commitment ${commitment} already exists`);
      }

      // Decrypt and validate response
      const encryptedBuffer = Buffer.from(encryptedAnswer, 'base64');
      const ab = encryptedBuffer.buffer.slice(
        encryptedBuffer.byteOffset,
        encryptedBuffer.byteOffset + encryptedBuffer.byteLength
      );
      const decryptedAnswer = await cryptoService.decryptForCampaign(campaignId, ab);

      // Verify commitment
      const calculatedCommitment = await cryptoService.generateCommitment(decryptedAnswer);
      const calculatedHex = Buffer.from(calculatedCommitment).toString('hex');
      if (calculatedHex !== commitment) {
        throw new Error(`Commitment verification failed for survey ${surveyId}`);
      }

      // Parse answer string to extract survey info
      const parsed = this.parseAnswerString(decryptedAnswer);
      if (parsed.surveyId !== surveyId) {
        throw new Error(`Survey ID mismatch: expected ${surveyId}, got ${parsed.surveyId}`);
      }

      // Store encrypted response
      const responseId = crypto.randomUUID();
      await db.query(
        `INSERT INTO survey_responses (id, campaign_id, encrypted_data, commitment, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [responseId, campaignId, encryptedAnswer, commitment]
      );

      // Store decrypted response
      const decryptedId = crypto.randomUUID();
      await db.query(
        `INSERT INTO decrypted_responses (id, response_id, answer_string, survey_id, course_code, teacher_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [decryptedId, responseId, decryptedAnswer, parsed.surveyId, parsed.courseCode, parsed.teacherId]
      );

      // Store parsed response
      const parsedId = crypto.randomUUID();
      await db.query(
        `INSERT INTO parsed_responses (id, decrypted_response_id, survey_id, course_code, teacher_id, answers, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [parsedId, decryptedId, parsed.surveyId, parsed.courseCode, parsed.teacherId, parsed.answers]
      );

      processedResponses.push({
        responseId,
        decryptedId,
        parsedId,
        surveyId: parsed.surveyId
      });
    }

    // Sign blinded receipt
    const blindedReceiptBuffer = Buffer.from(blindedReceipt, 'base64');
    const receiptSignature = await cryptoService.blindSignCampaign(campaignId, blindedReceiptBuffer);

    return {
      processedCount: processedResponses.length,
      responses: processedResponses,
      blindSignature: Buffer.from(receiptSignature).toString('base64')
    };
  }
} 