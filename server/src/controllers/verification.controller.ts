import { Request, Response } from 'express';
import { MerkleService } from '../services/merkle.service';
import db from '../config/database';

const merkleService = new MerkleService();

export class VerificationController {
  /**
   * GET /api/campaigns/:id/verification
   * Get campaign verification data (public endpoint)
   */
  async getCampaignVerificationData(req: Request, res: Response): Promise<void> {
    try {
      const { id: campaignId } = req.params;

      // Get campaign info
      const campaignResult = await db.query(
        `SELECT id, name, status, blockchain_closed
         FROM survey_campaigns WHERE id = $1`,
        [campaignId]
      );

      if (campaignResult.rowCount === 0) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      const campaign = campaignResult.rows[0];

      // Get Merkle roots
      const roots = await merkleService.getCampaignMerkleRoots(campaignId);

      res.json({
        campaignId: campaign.id,
        campaignName: campaign.name,
        responsesMerkleRoot: roots.responsesRoot,
        claimedReceiptsRoot: roots.claimedReceiptsRoot,
        totalResponses: roots.totalResponses,
        totalClaimed: roots.totalClaimed,
        blockchainClosed: campaign.blockchain_closed || false,
        canVerifyResponses: !!roots.responsesRoot,
        canVerifyParticipation: !!roots.claimedReceiptsRoot
      });
    } catch (error: any) {
      console.error('Get campaign verification data error:', error);
      res.status(500).json({
        error: 'Failed to get campaign verification data',
        details: error.message
      });
    }
  }

  /**
   * POST /api/verification/response
   * Verify a response commitment (Tree #1)
   */
  async verifyResponseCommitment(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId, commitment } = req.body;

      if (!campaignId || !commitment) {
        res.status(400).json({ error: 'Missing required fields: campaignId, commitment' });
        return;
      }

      // Validate hex string format
      if (!/^[0-9a-fA-F]+$/.test(commitment)) {
        res.status(400).json({ error: 'Invalid commitment format. Must be hex string.' });
        return;
      }

      // Get all commitments to generate proof
      const result = await db.query(
        `SELECT commitment
         FROM survey_responses
         WHERE campaign_id = $1 AND commitment IS NOT NULL
         ORDER BY created_at ASC, id ASC`,
        [campaignId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({
          isValid: false,
          message: 'No responses found for this campaign'
        });
        return;
      }

      const commitments = result.rows.map(row => row.commitment);

      // Check if commitment exists
      if (!commitments.includes(commitment)) {
        res.json({
          isValid: false,
          commitment,
          message: 'Commitment not found in campaign responses'
        });
        return;
      }

      // Get published Merkle root
      const roots = await merkleService.getCampaignMerkleRoots(campaignId);

      if (!roots.responsesRoot) {
        res.status(400).json({
          error: 'Response Merkle root not yet published for this campaign'
        });
        return;
      }

      // Generate proof and verify
      const proof = await merkleService.generateMerkleProof(commitments, commitment);
      const isValid = await merkleService.verifyMerkleProof(
        commitment,
        proof,
        roots.responsesRoot
      );

      res.json({
        isValid,
        commitment,
        merkleRoot: roots.responsesRoot,
        proof: {
          commitment,
          siblings: proof,
          index: commitments.indexOf(commitment),
          root: roots.responsesRoot
        }
      });
    } catch (error: any) {
      console.error('Verify response commitment error:', error);
      res.status(500).json({
        error: 'Failed to verify response commitment',
        details: error.message
      });
    }
  }

  /**
   * POST /api/verification/participation
   * Verify a participation claim (Tree #2)
   */
  async verifyParticipationClaim(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId, receiptHash } = req.body;

      if (!campaignId || !receiptHash) {
        res.status(400).json({ error: 'Missing required fields: campaignId, receiptHash' });
        return;
      }

      // Validate hex string format
      if (!/^[0-9a-fA-F]+$/.test(receiptHash)) {
        res.status(400).json({ error: 'Invalid receiptHash format. Must be hex string.' });
        return;
      }

      // Get all receipt hashes
      const result = await db.query(
        `SELECT receipt_hash
         FROM used_claim_signatures
         WHERE campaign_id = $1 AND receipt_hash IS NOT NULL
         ORDER BY claimed_at ASC, id ASC`,
        [campaignId]
      );

      if (result.rowCount === 0) {
        res.status(404).json({
          isValid: false,
          message: 'No participation claims found for this campaign'
        });
        return;
      }

      const receiptHashes = result.rows.map(row => row.receipt_hash);

      // Check if receipt hash exists
      if (!receiptHashes.includes(receiptHash)) {
        res.json({
          isValid: false,
          commitment: receiptHash,
          message: 'Receipt hash not found in campaign participation claims'
        });
        return;
      }

      // Get published Merkle root
      const roots = await merkleService.getCampaignMerkleRoots(campaignId);

      if (!roots.claimedReceiptsRoot) {
        res.status(400).json({
          error: 'Participation Merkle root not yet published for this campaign'
        });
        return;
      }

      // Generate proof and verify
      const proof = await merkleService.generateMerkleProof(receiptHashes, receiptHash);
      const isValid = await merkleService.verifyMerkleProof(
        receiptHash,
        proof,
        roots.claimedReceiptsRoot
      );

      res.json({
        isValid,
        commitment: receiptHash,
        merkleRoot: roots.claimedReceiptsRoot,
        proof: {
          commitment: receiptHash,
          siblings: proof,
          index: receiptHashes.indexOf(receiptHash),
          root: roots.claimedReceiptsRoot
        }
      });
    } catch (error: any) {
      console.error('Verify participation claim error:', error);
      res.status(500).json({
        error: 'Failed to verify participation claim',
        details: error.message
      });
    }
  }

  /**
   * GET /api/verification/response/proof
   * Get Merkle proof for a response commitment
   */
  async getResponseProof(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId, commitment } = req.query;

      if (!campaignId || !commitment) {
        res.status(400).json({ error: 'Missing required query params: campaignId, commitment' });
        return;
      }

      // Get all commitments
      const result = await db.query(
        `SELECT commitment
         FROM survey_responses
         WHERE campaign_id = $1 AND commitment IS NOT NULL
         ORDER BY created_at ASC, id ASC`,
        [campaignId as string]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'No responses found for this campaign' });
        return;
      }

      const commitments = result.rows.map(row => row.commitment);

      if (!commitments.includes(commitment as string)) {
        res.status(404).json({ error: 'Commitment not found in campaign' });
        return;
      }

      // Get Merkle root
      const roots = await merkleService.getCampaignMerkleRoots(campaignId as string);

      if (!roots.responsesRoot) {
        res.status(400).json({ error: 'Response Merkle root not yet published' });
        return;
      }

      // Generate proof
      const proof = await merkleService.generateMerkleProof(commitments, commitment as string);

      res.json({
        commitment,
        siblings: proof,
        index: commitments.indexOf(commitment as string),
        root: roots.responsesRoot
      });
    } catch (error: any) {
      console.error('Get response proof error:', error);
      res.status(500).json({
        error: 'Failed to get response proof',
        details: error.message
      });
    }
  }

  /**
   * GET /api/verification/participation/proof
   * Get Merkle proof for a participation claim
   */
  async getParticipationProof(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId, receiptHash } = req.query;

      if (!campaignId || !receiptHash) {
        res.status(400).json({ error: 'Missing required query params: campaignId, receiptHash' });
        return;
      }

      // Get all receipt hashes
      const result = await db.query(
        `SELECT receipt_hash
         FROM used_claim_signatures
         WHERE campaign_id = $1 AND receipt_hash IS NOT NULL
         ORDER BY claimed_at ASC, id ASC`,
        [campaignId as string]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'No participation claims found for this campaign' });
        return;
      }

      const receiptHashes = result.rows.map(row => row.receipt_hash);

      if (!receiptHashes.includes(receiptHash as string)) {
        res.status(404).json({ error: 'Receipt hash not found in campaign' });
        return;
      }

      // Get Merkle root
      const roots = await merkleService.getCampaignMerkleRoots(campaignId as string);

      if (!roots.claimedReceiptsRoot) {
        res.status(400).json({ error: 'Participation Merkle root not yet published' });
        return;
      }

      // Generate proof
      const proof = await merkleService.generateMerkleProof(receiptHashes, receiptHash as string);

      res.json({
        commitment: receiptHash,
        siblings: proof,
        index: receiptHashes.indexOf(receiptHash as string),
        root: roots.claimedReceiptsRoot
      });
    } catch (error: any) {
      console.error('Get participation proof error:', error);
      res.status(500).json({
        error: 'Failed to get participation proof',
        details: error.message
      });
    }
  }
}

export const verificationController = new VerificationController();
