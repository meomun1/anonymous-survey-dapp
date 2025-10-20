import { Request, Response } from 'express';
import { ResponseService } from '../services/response.service';
import { BlockchainService } from '../services/blockchain.service';

const responseService = new ResponseService();

export class ResponseController {
  // Ingest encrypted responses from blockchain (campaign-level)
  async ingestFromBlockchain(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const result = await responseService.ingestFromBlockchain(campaignId);
      res.json({ success: true, inserted: result.inserted });
    } catch (error: any) {
      console.error('Failed to ingest responses:', error);
      res.status(500).json({ error: 'Failed to ingest responses', details: error.message });
    }
  }

  // Decrypt and parse all campaign responses
  async decryptCampaignResponses(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const result = await responseService.decryptCampaignResponses(campaignId);
      res.json({ success: true, processed: result.processed });
    } catch (error: any) {
      console.error('Failed to decrypt campaign responses:', error);
      res.status(500).json({ error: 'Failed to decrypt campaign responses', details: error.message });
    }
  }

  // Fetch parsed responses for a survey
  async getParsedResponsesBySurvey(req: Request, res: Response) {
    try {
      const { surveyId } = req.params;
      const rows = await responseService.getParsedResponsesBySurvey(surveyId);
      res.json({ total: rows.length, rows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get parsed responses' });
    }
  }

  // Lookup by commitment (campaign-level tables)
  async getResponseByCommitment(req: Request, res: Response) {
    try {
      const { commitmentHex } = req.params;
      const row = await responseService.getResponseByCommitment(commitmentHex);
      if (!row) return res.status(404).json({ error: 'Response not found' });
      res.json(row);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get response by commitment' });
    }
  }

  // Verify integrity of a decrypted response
  async verifyResponseIntegrity(req: Request, res: Response) {
    try {
      const { decryptedResponseId } = req.params;
      const isValid = await responseService.verifyResponseIntegrity(decryptedResponseId);
      res.json({ isValid });
    } catch (error: any) {
      console.error('Failed to verify response integrity:', error);
      res.status(500).json({ error: 'Failed to verify response integrity', details: error.message });
    }
  }

  // Submit student responses to blockchain
  async submitStudentResponses(req: Request, res: Response) {
    try {
      const { token, responses } = req.body;
      
      if (!token || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ error: 'Token and responses array are required' });
      }

      const result = await responseService.submitStudentResponses(token, responses);
      res.json({
        success: true,
        transactionHash: result.transactionHash,
        message: 'Responses submitted successfully to blockchain'
      });
    } catch (error: any) {
      console.error('Failed to submit student responses:', error);
      res.status(500).json({ 
        error: 'Failed to submit responses to blockchain', 
        details: error.message 
      });
    }
  }
} 