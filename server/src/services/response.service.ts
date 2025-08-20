import db from '../config/database';
import crypto from 'crypto';
import { CryptoService } from './crypto.service';
const cryptoService = new CryptoService();

/**
 * Service for managing survey responses and blind signatures
 */
export class ResponseService {
  /**
   * Generate blind signature for student's blinded message
   * @param {string} surveyId - Survey ID
   * @param {string} blindedMessage - Base64 encoded blinded message
   * @returns {Promise<string>} Base64 encoded blind signature
   */
  async generateBlindSignature(surveyId: string, blindedMessage: string): Promise<string> {
    try {
      // Convert base64 to Uint8Array
      const blindedMsgBuffer = Buffer.from(blindedMessage, 'base64');
      const blindedMsgUint8Array = new Uint8Array(blindedMsgBuffer);

      // Generate blind signature
      const blindSignature = await cryptoService.generateBlindSignature(surveyId, blindedMsgUint8Array);

      // Convert back to base64 for response
      return Buffer.from(blindSignature).toString('base64');
    } catch (error: any) {
      throw new Error(`Failed to generate blind signature: ${error.message}`);
    }
  }

  /**
   * Get all decrypted responses for a survey
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Array>} Array of survey responses
   */
  async getSurveyResponses(surveyId: string) {
    try {
      const result = await db.query(
        `SELECT id, survey_id, encrypted_answer, decrypted_answer, commitment_hash, created_at, updated_at
         FROM survey_responses
         WHERE survey_id = $1
         ORDER BY created_at DESC`,
        [surveyId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        surveyId: row.survey_id,
        encryptedAnswer: row.encrypted_answer,
        decryptedAnswer: row.decrypted_answer,
        commitmentHash: row.commitment_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error: any) {
      throw new Error(`Failed to get survey responses: ${error.message}`);
    }
  }

  /**
   * Verify response integrity by checking commitment
   * @param {string} responseId - Response ID
   * @returns {Promise<boolean>} True if integrity is valid
   */
  async verifyResponseIntegrity(responseId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `SELECT decrypted_answer, commitment_hash
         FROM survey_responses WHERE id = $1 LIMIT 1`,
        [responseId]
      );
      const response = result.rows[0]
        ? {
            decryptedAnswer: result.rows[0].decrypted_answer,
            commitmentHash: result.rows[0].commitment_hash,
          }
        : null;

      if (!response) {
        throw new Error('Response not found');
      }

      // Convert hex commitment back to Uint8Array
      const commitment = new Uint8Array(Buffer.from(response.commitmentHash, 'hex'));

      // Verify commitment matches the decrypted answer
      return await cryptoService.verifyCommitment(response.decryptedAnswer, commitment);
    } catch (error: any) {
      throw new Error(`Failed to verify response integrity: ${error.message}`);
    }
  }

  /**
   * Get response by commitment hash
   * @param {string} commitmentHash - Hex encoded commitment hash
   * @returns {Promise<Object|null>} Response object or null
   */
  async getResponseByCommitmentHash(commitmentHash: string) {
    const result = await db.query(
      `SELECT id, survey_id, encrypted_answer, decrypted_answer, commitment_hash, created_at, updated_at
       FROM survey_responses WHERE commitment_hash = $1 LIMIT 1`,
      [commitmentHash]
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          surveyId: row.survey_id,
          encryptedAnswer: row.encrypted_answer,
          decryptedAnswer: row.decrypted_answer,
          commitmentHash: row.commitment_hash,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  /**
   * Get response statistics for a survey
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Statistics object
   */
  async getResponseStats(surveyId: string) {
    const result = await db.query(
      `SELECT decrypted_answer FROM survey_responses WHERE survey_id = $1`,
      [surveyId]
    );
    const responses = result.rows;

    return {
      totalResponses: responses.length,
      averageResponseLength: responses.length > 0 
        ? responses.reduce((sum: number, r: any) => sum + r.decryptedAnswer.length, 0) / responses.length 
        : 0,
      responsesByDay: {} // Could be expanded to show daily breakdown
    };
  }

  /**
   * Decrypt all survey responses from blockchain and store in database
   * @param {string} surveyId - Survey ID
   * @returns {Promise<{processed: number}>} Number of responses processed
   */
  async decryptAllSurveyResponses(surveyId: string) {
    try {
      // Check if survey exists
      const surveyResult = await db.query(
        `SELECT id, short_id FROM surveys WHERE id = $1 LIMIT 1`,
        [surveyId]
      );
      const survey = surveyResult.rows[0]
        ? { id: surveyResult.rows[0].id, shortId: surveyResult.rows[0].short_id }
        : null;

      if (!survey) {
        throw new Error('Survey not found');
      }

      // Ensure private keys exist for this survey
      const privResult = await db.query(
        `SELECT 1 FROM survey_private_keys WHERE survey_id = $1 LIMIT 1`,
        [surveyId]
      );
      if (privResult.rowCount === 0) {
        throw new Error('Survey private keys not found');
      }

      // Get the blockchain service to fetch encrypted responses
      const { BlockchainService } = await import('./blockchain.service');
      const blockchainService = new BlockchainService();

      // Fetch survey from blockchain using shortId to get encrypted responses
      const blockchainSurvey = await blockchainService.getSurvey(survey.shortId);

      if (!blockchainSurvey?.data?.encryptedAnswers || blockchainSurvey.data.encryptedAnswers.length === 0) {
        return { processed: 0 };
      }

      let processedCount = 0;

      // Process each encrypted response
      for (let i = 0; i < blockchainSurvey.data.encryptedAnswers.length; i++) {
        try {
          const encryptedAnswer = blockchainSurvey.data.encryptedAnswers[i];
          const commitment = blockchainSurvey.data.commitments[i];

          // Check if this response is already decrypted
          const existsRes = await db.query(
            `SELECT 1 FROM survey_responses WHERE commitment_hash = $1 LIMIT 1`,
            [Buffer.from(commitment).toString('hex')]
          );

          if ((existsRes.rowCount ?? 0) > 0) {
            continue; // Skip already processed responses
          }

          // Decrypt the encrypted answer using crypto service
          const encryptedAnswerBuffer = new Uint8Array(encryptedAnswer).buffer;
          const decryptedAnswer = await cryptoService.decryptResponse(
            surveyId, 
            encryptedAnswerBuffer
          );

          // Store the decrypted response in database
          await db.query(
            `INSERT INTO survey_responses (id, survey_id, encrypted_answer, decrypted_answer, commitment_hash, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [
              crypto.randomUUID(),
              surveyId,
              Buffer.from(encryptedAnswer).toString('base64'),
              decryptedAnswer,
              Buffer.from(commitment).toString('hex'),
            ]
          );

          processedCount++;
        } catch (decryptError) {
          console.error(`Failed to decrypt response:`, decryptError);
          // Continue with other responses even if one fails
        }
      }

      return { processed: processedCount };
    } catch (error: any) {
      throw new Error(`Failed to decrypt all survey responses: ${error.message}`);
    }
  }
} 