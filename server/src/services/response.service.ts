import db from '../config/database';
import crypto from 'crypto';
import { CryptoService } from './crypto.service';
import { BlockchainService } from './blockchain.service';
const cryptoService = new CryptoService();

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

  /**
   * Decrypt all survey responses from blockchain and store in database
   * @param {string} surveyId - Survey ID
   * @returns {Promise<{processed: number}>} Number of responses processed
   */
  /** Ingest encrypted responses from blockchain for campaign */
  async ingestFromBlockchain(campaignId: string) {
    const blockchain = new BlockchainService();
    const data = await blockchain.getCampaign(campaignId);
    if (!data?.encryptedResponses || data.encryptedResponses.length === 0) return { inserted: 0 };
    let inserted = 0;
    for (let i = 0; i < data.encryptedResponses.length; i++) {
      const enc = data.encryptedResponses[i];
      const commitmentArr = data.commitments[i];
      const commitmentHex = Buffer.from(new Uint8Array(commitmentArr)).toString('hex');
      const exists = await db.query(`SELECT 1 FROM survey_responses WHERE commitment = $1 LIMIT 1`, [commitmentHex]);
      if (exists.rowCount && exists.rowCount > 0) continue;
      await db.query(
        `INSERT INTO survey_responses (id, campaign_id, encrypted_data, commitment, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [crypto.randomUUID(), campaignId, Buffer.from(enc).toString('base64'), commitmentHex]
      );
      inserted++;
    }
    return { inserted };
  }

  /** Decrypt all campaign responses and populate decrypted_responses + parsed_responses */
  async decryptCampaignResponses(campaignId: string) {
    const toDecrypt = await db.query(
      `SELECT sr.id, sr.encrypted_data
       FROM survey_responses sr
       LEFT JOIN decrypted_responses dr ON dr.response_id = sr.id
       WHERE sr.campaign_id = $1 AND dr.id IS NULL`,
      [campaignId]
    );
    let processed = 0;
    for (const row of toDecrypt.rows) {
      try {
        const encryptedBuffer = Buffer.from(row.encrypted_data, 'base64');
        const ab = encryptedBuffer.buffer.slice(
          encryptedBuffer.byteOffset,
          encryptedBuffer.byteOffset + encryptedBuffer.byteLength
        );
        const decrypted = await cryptoService.decryptForCampaign(campaignId, ab);
        const decId = crypto.randomUUID();
        await db.query(
          `INSERT INTO decrypted_responses (id, response_id, answer_string, survey_id, course_code, teacher_id, created_at, updated_at)
           VALUES ($1, $2, $3, '', '', '', NOW(), NOW())`,
          [decId, row.id, decrypted]
        );
        const parsed = this.parseAnswerString(decrypted);
        await db.query(
          `UPDATE decrypted_responses SET survey_id = $2, course_code = $3, teacher_id = $4, updated_at = NOW() WHERE id = $1`,
          [decId, parsed.surveyId, parsed.courseCode, parsed.teacherId]
        );
        await db.query(
          `INSERT INTO parsed_responses (id, decrypted_response_id, survey_id, course_code, teacher_id, answers, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [crypto.randomUUID(), decId, parsed.surveyId, parsed.courseCode, parsed.teacherId, parsed.answers]
        );
        processed++;
      } catch (e) {
        console.error('Failed to decrypt/parse response:', e);
      }
    }
    return { processed };
  }

  /**
   * Submit student responses to blockchain using school's private key
   */
  async submitStudentResponses(token: string, responses: Array<{
    surveyId: string;
    encryptedData: string;
    commitment: string;
  }>) {
    // First, validate the token and get campaign info
    const tokenResult = await db.query(
      'SELECT * FROM survey_tokens WHERE token = $1',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid token');
    }

    const tokenData = tokenResult.rows[0];
    const campaignId = tokenData.campaign_id;

    // Get campaign details
    const campaignResult = await db.query(
      'SELECT * FROM survey_campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      throw new Error('Campaign not found');
    }

    const campaign = campaignResult.rows[0];

    // Initialize blockchain service
    const blockchainService = new BlockchainService();

    try {
      // Submit responses to blockchain
      const commitments = responses.map(r => Buffer.from(r.commitment, 'hex'));
      const encryptedResponses = responses.map(r => Buffer.from(r.encryptedData, 'base64'));
      
      const transactionHash = await blockchainService.submitBatchResponses(
        campaignId,
        commitments,
        encryptedResponses
      );

      // Store responses in database
      for (const response of responses) {
        await db.query(
          `INSERT INTO survey_responses (id, campaign_id, encrypted_data, commitment, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [crypto.randomUUID(), campaignId, response.encryptedData, response.commitment]
        );
      }

      // Mark token as completed
      await db.query(
        'UPDATE survey_tokens SET is_completed = true, completed_at = NOW() WHERE token = $1',
        [token]
      );

      return { transactionHash };
    } catch (error: any) {
      console.error('Blockchain submission failed:', error);
      throw new Error(`Failed to submit to blockchain: ${error.message}`);
    }
  }
} 