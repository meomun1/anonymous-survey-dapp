import db from '../config/database';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto, createHash } from 'crypto';

/**
 * Service for cryptographic operations (blind signatures, encryption, Merkle trees)
 */
export class CryptoService {
  /**
   * Get campaign public keys (blind signature and encryption)
   */
  async getCampaignPublicKeys(campaignId: string) {
    try {
      const result = await db.query(
        `SELECT blind_signature_public_key, encryption_public_key
         FROM survey_campaigns WHERE id = $1 LIMIT 1`,
        [campaignId]
      );
      const campaign = result.rows[0]
        ? {
            blindSignaturePublicKey: result.rows[0].blind_signature_public_key,
            encryptionPublicKey: result.rows[0].encryption_public_key,
          }
        : null;

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return {
        blindSignaturePublicKey: Buffer.from(campaign.blindSignaturePublicKey, 'base64'),
        encryptionPublicKey: Buffer.from(campaign.encryptionPublicKey, 'base64')
      };
    } catch (error: any) {
      throw new Error(`Failed to get campaign public keys: ${error.message}`);
    }
  }

  /**
   * Blind sign using campaign private key
   */
  async blindSignCampaign(campaignId: string, blindedMessage: Uint8Array): Promise<Uint8Array> {
    try {
      const result = await db.query(
        `SELECT blind_signature_private_key
         FROM survey_campaigns WHERE id = $1 LIMIT 1`,
        [campaignId]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error('Campaign private key not found');
      }

      const blindSignaturePrivateKeyBuffer = Buffer.from(row.blind_signature_private_key, 'base64');
      const blindSignaturePrivateKey = await webcrypto.subtle.importKey(
        'pkcs8',
        blindSignaturePrivateKeyBuffer,
        { name: 'RSA-PSS', hash: 'SHA-384' },
        true,
        ['sign']
      );

      const suite = RSABSSA.SHA384.PSS.Randomized();
      return await suite.blindSign(blindSignaturePrivateKey, blindedMessage);
    } catch (error: any) {
      throw new Error(`Failed to blind sign (campaign): ${error.message}`);
    }
  }

  /**
   * Decrypt payload using campaign encryption private key
   */
  async decryptForCampaign(campaignId: string, encryptedAnswer: ArrayBuffer): Promise<string> {
    try {
      const result = await db.query(
        `SELECT encryption_private_key
         FROM survey_campaigns WHERE id = $1 LIMIT 1`,
        [campaignId]
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error('Campaign private key not found');
      }

      const encryptionPrivateKeyBuffer = Buffer.from(row.encryption_private_key, 'base64');
      const encryptionPrivateKey = await webcrypto.subtle.importKey(
        'pkcs8',
        encryptionPrivateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await webcrypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        encryptionPrivateKey,
        encryptedAnswer
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error: any) {
      throw new Error(`Failed to decrypt (campaign): ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted survey response
   * @param {string} surveyId - Survey ID to get private key for
   * @param {ArrayBuffer} encryptedAnswer - Encrypted answer from blockchain
   * @returns {Promise<string>} Decrypted answer text
   */

  /**
   * Verify that a commitment matches the given answer
   * @param {string} answer - Plain text answer
   * @param {Uint8Array} commitment - Hash commitment to verify
   * @returns {Promise<boolean>} True if commitment is valid
   */
  async verifyCommitment(answer: string, commitment: Uint8Array): Promise<boolean> {
    try {
      // Calculate hash of the answer
      const answerBuffer = new TextEncoder().encode(answer);
      const calculatedCommitment = await webcrypto.subtle.digest('SHA-256', answerBuffer);
      
      // Compare the commitments
      const calculatedArray = new Uint8Array(calculatedCommitment);
      
      if (calculatedArray.length !== commitment.length) {
        return false;
      }
      
      for (let i = 0; i < calculatedArray.length; i++) {
        if (calculatedArray[i] !== commitment[i]) {
          return false;
        }
      }
      
      return true;
    } catch (error: any) {
      throw new Error(`Failed to verify commitment: ${error.message}`);
    }
  }

  /**
   * Get survey public keys for client operations
   * @param {string} surveyId - Survey ID
   * @returns {Promise<{blindSignaturePublicKey: Buffer, encryptionPublicKey: Buffer}>} Public keys
   */

  // ============================================================================
  // MERKLE TREE (moved from analytics)
  // ============================================================================

  /**
   * Calculate Merkle root from hex commitments
   */
  async calculateMerkleRoot(commitments: string[]): Promise<string> {
    if (commitments.length === 0) {
      throw new Error('Cannot calculate Merkle root from empty commitments');
    }

    const leaves = commitments.map(c => Buffer.from(c, 'hex'));
    let currentLevel: any[] = leaves as any[];
    while (currentLevel.length > 1) {
      const nextLevel: any[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = Buffer.concat([left, right]);
        const hash = createHash('sha256').update(combined).digest();
        nextLevel.push(hash);
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0].toString('hex');
  }

  async calculateFinalMerkleRoot(campaignRoots: string[]): Promise<string> {
    return this.calculateMerkleRoot(campaignRoots);
  }

  async generateMerkleProof(commitments: string[], targetCommitment: string): Promise<string[]> {
    const targetIndex = commitments.indexOf(targetCommitment);
    if (targetIndex === -1) throw new Error('Target commitment not found');

    const leaves = commitments.map(c => Buffer.from(c, 'hex'));
    const proof: string[] = [];
    let currentLevel: any[] = leaves as any[];
    let currentIndex = targetIndex;
    while (currentLevel.length > 1) {
      const nextLevel: any[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = Buffer.concat([left, right]);
        const hash = createHash('sha256').update(combined).digest();
        nextLevel.push(hash);
        if (i === currentIndex) proof.push(right.toString('hex'));
        else if (i + 1 === currentIndex) proof.push(left.toString('hex'));
      }
      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }
    return proof;
  }

  async verifyMerkleProof(commitment: string, proof: string[], root: string): Promise<boolean> {
    let current: any = Buffer.from(commitment, 'hex') as any;
    for (const p of proof) {
      const sibling: any = Buffer.from(p, 'hex') as any;
      const combined: any = Buffer.concat([current, sibling]) as any;
      current = createHash('sha256').update(combined).digest();
    }
    return current.toString('hex') === root;
  }

  /**
   * Create Merkle root from array of commitments
   * @param {Uint8Array[]} commitments - Array of commitment hashes
   * @returns {Promise<Uint8Array>} Merkle root hash
   */
  async createMerkleRoot(commitments: Uint8Array[]): Promise<Uint8Array> {
    try {
      if (commitments.length === 0) {
        return new Uint8Array(32); // Return zero hash for empty commitments
      }

      let currentLevel = commitments.slice();

      while (currentLevel.length > 1) {
        const nextLevel: Uint8Array[] = [];

        for (let i = 0; i < currentLevel.length; i += 2) {
          if (i + 1 < currentLevel.length) {
            // Hash pair of commitments
            const combined = new Uint8Array(64);
            combined.set(currentLevel[i], 0);
            combined.set(currentLevel[i + 1], 32);
            
            const hash = await webcrypto.subtle.digest('SHA-256', combined);
            nextLevel.push(new Uint8Array(hash));
          } else {
            // Odd number, carry forward
            nextLevel.push(currentLevel[i]);
          }
        }
        currentLevel = nextLevel;
      }

      return currentLevel[0];
    } catch (error: any) {
      throw new Error(`Failed to create Merkle root: ${error.message}`);
    }
  }

  /**
   * Decrypt multiple encrypted responses
   * @param {string} surveyId - Survey ID
   * @param {ArrayBuffer[]} encryptedAnswers - Array of encrypted answers
   * @returns {Promise<string[]>} Array of decrypted answers
   */

  /**
   * Generate commitment hash for an answer
   * @param {string} answer - Answer text
   * @returns {Promise<Uint8Array>} SHA-256 hash commitment
   */
  async generateCommitment(answer: string): Promise<Uint8Array> {
    try {
      const answerBuffer = new TextEncoder().encode(answer);
      const commitment = await webcrypto.subtle.digest('SHA-256', answerBuffer);
      return new Uint8Array(commitment);
    } catch (error: any) {
      throw new Error(`Failed to generate commitment: ${error.message}`);
    }
  }

  /**
   * Generate Merkle root using alternative algorithm
   * @param {Uint8Array[]} commitments - Array of commitments
   * @returns {Promise<Uint8Array>} Merkle root hash
   */
  async buildMerkleRootFromCommitments(commitments: Uint8Array[]): Promise<Uint8Array> {
    try {
      if (commitments.length === 0) {
        throw new Error('No commitments provided');
      }

      // If single commitment, return it as the root
      if (commitments.length === 1) {
        return commitments[0];
      }

      // Build Merkle tree
      let currentLevel = commitments;
      
      while (currentLevel.length > 1) {
        const nextLevel: Uint8Array[] = [];
        
        for (let i = 0; i < currentLevel.length; i += 2) {
          if (i + 1 < currentLevel.length) {
            // Hash pair of nodes
            const combined = new Uint8Array(currentLevel[i].length + currentLevel[i + 1].length);
            combined.set(currentLevel[i]);
            combined.set(currentLevel[i + 1], currentLevel[i].length);
            
            const hash = await webcrypto.subtle.digest('SHA-256', combined);
            nextLevel.push(new Uint8Array(hash));
          } else {
            // Odd number of nodes, promote the last one
            nextLevel.push(currentLevel[i]);
          }
        }
        
        currentLevel = nextLevel;
      }

      return currentLevel[0];
    } catch (error: any) {
      throw new Error(`Failed to build Merkle root: ${error.message}`);
    }
  }

  /**
   * Deprecated alias: use buildMerkleRootFromCommitments
   */
  async bulkVerifyCommitments(commitments: Uint8Array[]): Promise<Uint8Array> {
    return this.buildMerkleRootFromCommitments(commitments);
  }
} 