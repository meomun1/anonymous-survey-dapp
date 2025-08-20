import { Request, Response } from 'express';
import { ResponseService } from '../services/response.service';
import { BlockchainService } from '../services/blockchain.service';

const responseService = new ResponseService();
const blockchainService = new BlockchainService();

export class ResponseController {
  /**
   * Generate blind signature for student
   * This is the only server-side operation needed for anonymous submissions
   */
  async generateBlindSignature(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const { blindedMessage } = req.body;

      if (!blindedMessage) {
        return res.status(400).json({ error: 'Blinded message is required' });
      }

      const blindSignature = await responseService.generateBlindSignature(surveyId, blindedMessage);
      
      res.json({ blindSignature });
    } catch (error: any) {
      console.error('Failed to generate blind signature:', error);
      res.status(500).json({ 
        error: 'Failed to generate blind signature',
        details: error.message 
      });
    }
  }

  /**
   * Submit encrypted response to blockchain
   */
  async submitToBlockchain(req: Request, res: Response) {
    try {
      const { surveyId, encryptedAnswer, commitment, userKeyJson } = req.body;

      if (!surveyId || !encryptedAnswer || !commitment) {
        return res.status(400).json({ 
          error: 'Survey ID, encrypted answer, and commitment are required' 
        });
      }

      // Get survey shortId for blockchain operations (raw SQL)
      const { db } = await import('../config/database');
      const result = await db.query(
        'SELECT short_id FROM surveys WHERE id = $1 LIMIT 1',
        [surveyId]
      );
      const survey = result.rows[0] ? { shortId: result.rows[0].short_id } : null;

      if (!survey) {
        return res.status(404).json({ error: 'Survey not found' });
      }

      // Convert arrays back to buffers
      const encryptedAnswerBuffer = Buffer.from(encryptedAnswer);
      const commitmentBuffer = Buffer.from(commitment, 'hex');

      let signature: string;

      if (userKeyJson) {
        // Use provided user keypair - pass shortId to blockchain service
        signature = await blockchainService.submitResponseWithUserJson(
          survey.shortId,
          commitmentBuffer,
          encryptedAnswerBuffer,
          userKeyJson
        );
      } else {
        // Use the authority (school's wallet) for submission since:
        // 1. School pays all transaction costs
        // 2. System is anonymous - no need for separate user keys
        // 3. Authority has sufficient SOL (500M+ in test environment)
        signature = await blockchainService.submitResponseAsAuthority(
          survey.shortId,
          commitmentBuffer,
          encryptedAnswerBuffer
        );
      }

      res.json({ 
        success: true, 
        transactionSignature: signature,
        message: 'Response successfully submitted to blockchain'
      });
    } catch (error: any) {
      console.error('Failed to submit response to blockchain:', error);
      res.status(500).json({ 
        error: 'Failed to submit response to blockchain',
        details: error.message 
      });
    }
  }

  async getSurveyResponses(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const responses = await responseService.getSurveyResponses(surveyId);
      res.json({ 
        responses: responses,
        total: responses.length 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get survey responses' });
    }
  }

  /**
   * Decrypt all responses for a survey from blockchain
   */
  async decryptAllResponses(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const result = await responseService.decryptAllSurveyResponses(surveyId);
      res.json({ 
        success: true,
        processed: result.processed,
        message: `Successfully decrypted ${result.processed} responses`
      });
    } catch (error: any) {
      console.error('Failed to decrypt all responses:', error);
      res.status(500).json({ 
        error: 'Failed to decrypt all responses',
        details: error.message 
      });
    }
  }

  async getResponseByCommitmentHash(req: Request, res: Response) {
    try {
      const { commitmentHash } = req.params;
      const response = await responseService.getResponseByCommitmentHash(commitmentHash);
      
      if (!response) {
        return res.status(404).json({ error: 'Response not found' });
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get response' });
    }
  }

  async getResponseStats(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const stats = await responseService.getResponseStats(surveyId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get response stats' });
    }
  }

  /**
   * Verify response integrity
   */
  async verifyResponseIntegrity(req: Request, res: Response) {
    try {
      const { responseId } = req.params;
      const isValid = await responseService.verifyResponseIntegrity(responseId);
      
      res.json({ isValid });
    } catch (error: any) {
      console.error('Failed to verify response integrity:', error);
      res.status(500).json({ 
        error: 'Failed to verify response integrity',
        details: error.message 
      });
    }
  }
} 