import db from '../config/database';
import { createHash } from 'crypto';

/**
 * Service for Merkle tree operations
 * Handles both response commitments (Tree #1) and claimed receipts (Tree #2)
 */
export class MerkleService {
  /**
   * Calculate Merkle root from hex string commitments
   * This is the canonical implementation used for both:
   * - Response commitments (Tree #1)
   * - Claimed receipt hashes (Tree #2)
   *
   * @param {string[]} commitments - Array of hex-encoded commitment hashes
   * @returns {Promise<string>} Merkle root as hex string
   */
  async calculateMerkleRoot(commitments: string[]): Promise<string> {
    if (commitments.length === 0) {
      throw new Error('Cannot calculate Merkle root from empty commitments');
    }

    // Convert hex strings to buffers
    const leaves = commitments.map(c => Buffer.from(c, 'hex'));
    let currentLevel: Buffer[] = leaves;

    // Build tree bottom-up
    while (currentLevel.length > 1) {
      const nextLevel: Buffer[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Duplicate last node if odd

        // Hash concatenation of left and right
        const combined = Buffer.concat([left, right]);
        const hash = createHash('sha256').update(combined).digest();
        nextLevel.push(hash);
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0].toString('hex');
  }

  /**
   * Generate Merkle proof for a specific commitment
   * Proof allows verification that a commitment is included in the tree
   *
   * @param {string[]} commitments - Array of all commitments (hex strings)
   * @param {string} targetCommitment - The commitment to generate proof for (hex string)
   * @returns {Promise<string[]>} Array of sibling hashes forming the proof path
   */
  async generateMerkleProof(commitments: string[], targetCommitment: string): Promise<string[]> {
    const targetIndex = commitments.indexOf(targetCommitment);
    if (targetIndex === -1) {
      throw new Error('Target commitment not found in commitments array');
    }

    const leaves = commitments.map(c => Buffer.from(c, 'hex'));
    const proof: string[] = [];
    let currentLevel: Buffer[] = leaves;
    let currentIndex = targetIndex;

    while (currentLevel.length > 1) {
      const nextLevel: Buffer[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = Buffer.concat([left, right]);
        const hash = createHash('sha256').update(combined).digest();
        nextLevel.push(hash);

        // Add sibling to proof if this is our target's level
        if (i === currentIndex) {
          proof.push(right.toString('hex'));
        } else if (i + 1 === currentIndex) {
          proof.push(left.toString('hex'));
        }
      }

      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verify a Merkle proof
   *
   * @param {string} commitment - The commitment to verify (hex string)
   * @param {string[]} proof - Array of sibling hashes (hex strings)
   * @param {string} root - Expected Merkle root (hex string)
   * @returns {Promise<boolean>} True if proof is valid
   */
  async verifyMerkleProof(commitment: string, proof: string[], root: string): Promise<boolean> {
    let current = Buffer.from(commitment, 'hex');

    for (const siblingHex of proof) {
      const sibling = Buffer.from(siblingHex, 'hex');
      const combined = Buffer.concat([current, sibling]);
      current = createHash('sha256').update(combined).digest();
    }

    return current.toString('hex') === root;
  }

  /**
   * Calculate Merkle root for all response commitments in a campaign
   * This is Tree #1 - published once after all responses collected
   *
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<{merkleRoot: string, totalCommitments: number, calculatedAt: string}>}
   */
  async calculateCampaignResponsesRoot(campaignId: string): Promise<{
    merkleRoot: string;
    totalCommitments: number;
    calculatedAt: string;
  }> {
    // Verify campaign exists
    const campaign = await db.query(
      'SELECT id, name FROM survey_campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaign.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    // Fetch all response commitments for this campaign
    // ORDER BY ensures deterministic Merkle root calculation
    const result = await db.query(
      `SELECT commitment
       FROM survey_responses
       WHERE campaign_id = $1 AND commitment IS NOT NULL
       ORDER BY created_at ASC, id ASC`,
      [campaignId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new Error('No responses found for this campaign');
    }

    const totalCommitments = result.rowCount;
    console.log(`📊 Calculating responses Merkle root for ${totalCommitments} commitments in campaign ${campaignId}`);

    // Extract commitments (already hex strings)
    const commitments = result.rows.map(row => row.commitment);

    // Performance tracking for large datasets
    const startTime = Date.now();
    const merkleRoot = await this.calculateMerkleRoot(commitments);
    const duration = Date.now() - startTime;

    console.log(`✅ Responses Merkle root calculated in ${duration}ms for ${totalCommitments} commitments`);
    console.log(`   Root: ${merkleRoot}`);

    return {
      merkleRoot,
      totalCommitments,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate Merkle root for all claimed receipts in a campaign
   * This is Tree #2 - can be updated multiple times (batched claims)
   * Uses existing used_claim_signatures table with receipt_hash column
   *
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<{merkleRoot: string, totalClaimed: number, calculatedAt: string}>}
   */
  async calculateCampaignClaimedReceiptsRoot(campaignId: string): Promise<{
    merkleRoot: string;
    totalClaimed: number;
    calculatedAt: string;
  }> {
    // Verify campaign exists
    const campaign = await db.query(
      'SELECT id, name FROM survey_campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaign.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    // Fetch all claimed receipt hashes for this campaign from used_claim_signatures
    // ORDER BY ensures deterministic Merkle root calculation
    const result = await db.query(
      `SELECT receipt_hash
       FROM used_claim_signatures
       WHERE campaign_id = $1 AND receipt_hash IS NOT NULL
       ORDER BY claimed_at ASC, id ASC`,
      [campaignId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new Error('No claimed receipts found for this campaign');
    }

    const totalClaimed = result.rowCount;
    console.log(`📊 Calculating claimed receipts Merkle root for ${totalClaimed} claims in campaign ${campaignId}`);

    // Extract receipt hashes (hex strings)
    const receiptHashes = result.rows.map(row => row.receipt_hash);

    // Performance tracking
    const startTime = Date.now();
    const merkleRoot = await this.calculateMerkleRoot(receiptHashes);
    const duration = Date.now() - startTime;

    console.log(`✅ Claimed receipts Merkle root calculated in ${duration}ms for ${totalClaimed} claims`);
    console.log(`   Root: ${merkleRoot}`);

    return {
      merkleRoot,
      totalClaimed,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Get stored Merkle roots for a campaign from database
   *
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<{responsesRoot: string | null, claimedReceiptsRoot: string | null}>}
   */
  async getCampaignMerkleRoots(campaignId: string): Promise<{
    responsesRoot: string | null;
    responsesPublishedAt: Date | null;
    totalResponses: number;
    claimedReceiptsRoot: string | null;
    claimsUpdatedAt: Date | null;
    totalClaimed: number;
  }> {
    const result = await db.query(
      `SELECT responses_merkle_root, responses_published_at, total_responses,
              claimed_receipts_root, claims_updated_at, total_claimed
       FROM survey_campaigns WHERE id = $1`,
      [campaignId]
    );

    if (result.rowCount === 0) {
      throw new Error('Campaign not found');
    }

    const row = result.rows[0];

    return {
      responsesRoot: row.responses_merkle_root,
      responsesPublishedAt: row.responses_published_at,
      totalResponses: parseInt(row.total_responses || '0'),
      claimedReceiptsRoot: row.claimed_receipts_root,
      claimsUpdatedAt: row.claims_updated_at,
      totalClaimed: parseInt(row.total_claimed || '0')
    };
  }

  /**
   * Verify a response commitment against campaign's published Merkle root
   *
   * @param {string} campaignId - Campaign ID
   * @param {string} commitment - Response commitment to verify (hex string)
   * @returns {Promise<boolean>} True if commitment is in the published tree
   */
  async verifyResponseCommitment(campaignId: string, commitment: string): Promise<boolean> {
    // Get published Merkle root
    const roots = await this.getCampaignMerkleRoots(campaignId);

    if (!roots.responsesRoot) {
      throw new Error('Campaign responses Merkle root not published');
    }

    // Get all commitments to generate proof
    const result = await db.query(
      `SELECT commitment
       FROM survey_responses
       WHERE campaign_id = $1 AND commitment IS NOT NULL
       ORDER BY created_at ASC, id ASC`,
      [campaignId]
    );

    const commitments = result.rows.map(row => row.commitment);

    // Generate and verify proof
    const proof = await this.generateMerkleProof(commitments, commitment);
    return await this.verifyMerkleProof(commitment, proof, roots.responsesRoot);
  }

  /**
   * Verify a claimed receipt against campaign's published Merkle root
   * Uses existing used_claim_signatures table
   *
   * @param {string} campaignId - Campaign ID
   * @param {string} receiptHash - Receipt hash to verify (hex string)
   * @returns {Promise<boolean>} True if receipt is in the published tree
   */
  async verifyClaimedReceipt(campaignId: string, receiptHash: string): Promise<boolean> {
    // Get published Merkle root
    const roots = await this.getCampaignMerkleRoots(campaignId);

    if (!roots.claimedReceiptsRoot) {
      throw new Error('Campaign claimed receipts Merkle root not published');
    }

    // Get all receipt hashes from used_claim_signatures to generate proof
    const result = await db.query(
      `SELECT receipt_hash
       FROM used_claim_signatures
       WHERE campaign_id = $1 AND receipt_hash IS NOT NULL
       ORDER BY claimed_at ASC, id ASC`,
      [campaignId]
    );

    const receiptHashes = result.rows.map(row => row.receipt_hash);

    // Generate and verify proof
    const proof = await this.generateMerkleProof(receiptHashes, receiptHash);
    return await this.verifyMerkleProof(receiptHash, proof, roots.claimedReceiptsRoot);
  }
}
