import { PrismaClient } from '../generated/prisma';
import { CryptoService } from './crypto.service';

const prisma = new PrismaClient();
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
      const responses = await prisma.surveyResponse.findMany({
        where: { surveyId },
        orderBy: { createdAt: 'desc' }
      });

      return responses;
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
      const response = await prisma.surveyResponse.findUnique({
        where: { id: responseId }
      });

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
    return await prisma.surveyResponse.findFirst({
      where: { commitmentHash }
    });
  }

  /**
   * Get response statistics for a survey
   * @param {string} surveyId - Survey ID
   * @returns {Promise<Object>} Statistics object
   */
  async getResponseStats(surveyId: string) {
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId }
    });

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
      const survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        include: {
          privateKey: true
        }
      });

      if (!survey) {
        throw new Error('Survey not found');
      }

      if (!survey.privateKey) {
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
          const existingResponse = await prisma.surveyResponse.findFirst({
            where: { 
              commitmentHash: Buffer.from(commitment).toString('hex')
            }
          });

          if (existingResponse) {
            continue; // Skip already processed responses
          }

          // Decrypt the encrypted answer using crypto service
          const encryptedAnswerBuffer = new Uint8Array(encryptedAnswer).buffer;
          const decryptedAnswer = await cryptoService.decryptResponse(
            surveyId, 
            encryptedAnswerBuffer
          );

          // Store the decrypted response in database
          await prisma.surveyResponse.create({
            data: {
              surveyId,
              encryptedAnswer: Buffer.from(encryptedAnswer).toString('base64'),
              decryptedAnswer,
              commitmentHash: Buffer.from(commitment).toString('hex')
            }
          });

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