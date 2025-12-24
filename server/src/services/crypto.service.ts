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
  // COMMITMENT OPERATIONS
  // ============================================================================

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
} 