import { Request, Response } from 'express';
import { ResponseService } from '../services/response.service';
import { BlockchainService } from '../services/blockchain.service';
import crypto from 'crypto';
import db from '../config/database';

const responseService = new ResponseService();

export class ResponseController {
  // ============================================================================
  // NOTE: Old blockchain submission methods removed (NEW ARCHITECTURE)
  // - ingestFromBlockchain() - REMOVED (no longer needed)
  // - decryptCampaignResponses() - REMOVED (responses already decrypted in Phase 3)
  // - submitStudentResponses() - REMOVED (use submitBatchResponses for Phase 3)
  // ============================================================================

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

  // Get encrypted responses for a campaign
  async getEncryptedResponses(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const responses = await responseService.getEncryptedResponsesByCampaign(campaignId);
      res.json(responses);
    } catch (error: any) {
      console.error('Failed to get encrypted responses:', error);
      res.status(500).json({ error: 'Failed to get encrypted responses', details: error.message });
    }
  }

  // Get decrypted responses for a campaign
  async getDecryptedResponses(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const responses = await responseService.getDecryptedResponsesByCampaign(campaignId);
      res.json(responses);
    } catch (error: any) {
      console.error('Failed to get decrypted responses:', error);
      res.status(500).json({ error: 'Failed to get decrypted responses', details: error.message });
    }
  }

  /**
   * Phase 3: Submit batch responses with blind signature authorization
   * POST /api/responses/submit-batch
   * Authorization: Bearer <preparedToken>.<tokenSignature>
   */
  async submitBatchResponses(req: Request, res: Response) {
    try {
      // Middleware has already verified blind signature and attached blindAuth
      if (!req.blindAuth) {
        return res.status(401).json({ error: 'Blind signature verification required' });
      }

      const { preparedToken, tokenSignature, campaignId } = req.blindAuth;
      const { responses, ticketCommitment, blindedReceipt } = req.body;

      if (!responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ error: 'responses array is required' });
      }

      if (!ticketCommitment || !blindedReceipt) {
        return res.status(400).json({ error: 'ticketCommitment and blindedReceipt are required' });
      }

      // Process batch submission
      const result = await responseService.submitBatchResponses(
        campaignId,
        responses,
        ticketCommitment,
        blindedReceipt
      );

      // Store authorization signature as used
      await db.query(
        `INSERT INTO used_submission_signatures (id, prepared_token, token_signature, campaign_id, used_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [crypto.randomUUID(), preparedToken, tokenSignature, campaignId]
      );

      res.json({
        blindSignature: result.blindSignature,
        submittedAt: new Date().toISOString(),
        processedCount: result.processedCount
      });
    } catch (error: any) {
      console.error('❌ Batch submission error:', error);
      res.status(500).json({ error: 'Failed to submit batch responses', details: error.message });
    }
  }
} 