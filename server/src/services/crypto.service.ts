import db from '../config/database';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';

/**
 * Service for cryptographic operations (blind signatures, encryption, Merkle trees)
 */
export class CryptoService {
  
  /**
   * Generate blind signature for a blinded message
   * @param {string} surveyId - Survey ID to get private key for
   * @param {Uint8Array} blindedMessage - Blinded message from client
   * @returns {Promise<Uint8Array>} Blind signature
   */
  async generateBlindSignature(surveyId: string, blindedMessage: Uint8Array): Promise<Uint8Array> {
    try {
      // Get survey private keys from database
      const result = await db.query(
        `SELECT blind_signature_private_key, encryption_private_key
         FROM survey_private_keys WHERE survey_id = $1 LIMIT 1`,
        [surveyId]
      );
      const surveyPrivateKey = result.rows[0]
        ? {
            blindSignaturePrivateKey: result.rows[0].blind_signature_private_key,
            encryptionPrivateKey: result.rows[0].encryption_private_key,
          }
        : null;

      if (!surveyPrivateKey) {
        throw new Error('Survey private keys not found');
      }

      // Import the private key using WebCrypto (the RSABSSA library expects CryptoKey)
      const blindSignaturePrivateKeyBuffer = Buffer.from(surveyPrivateKey.blindSignaturePrivateKey, 'base64');
      const blindSignaturePrivateKey = await webcrypto.subtle.importKey(
        'pkcs8',
        blindSignaturePrivateKeyBuffer,
        {
          name: 'RSA-PSS',
          hash: 'SHA-384'
        },
        true,
        ['sign']
      );

      // Initialize blind signature suite
      const suite = RSABSSA.SHA384.PSS.Randomized();

      // Generate blind signature using the imported CryptoKey
      const blindSignature = await suite.blindSign(blindSignaturePrivateKey, blindedMessage);

      return blindSignature;
    } catch (error: any) {
      throw new Error(`Failed to generate blind signature: ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted survey response
   * @param {string} surveyId - Survey ID to get private key for
   * @param {ArrayBuffer} encryptedAnswer - Encrypted answer from blockchain
   * @returns {Promise<string>} Decrypted answer text
   */
  async decryptResponse(surveyId: string, encryptedAnswer: ArrayBuffer): Promise<string> {
    try {
      // Get survey private keys from database
      const result = await db.query(
        `SELECT encryption_private_key
         FROM survey_private_keys WHERE survey_id = $1 LIMIT 1`,
        [surveyId]
      );
      const surveyPrivateKey = result.rows[0]
        ? {
            encryptionPrivateKey: result.rows[0].encryption_private_key,
          }
        : null;

      if (!surveyPrivateKey) {
        throw new Error('Survey private keys not found');
      }

      // Import encryption private key
      const encryptionPrivateKeyBuffer = Buffer.from(surveyPrivateKey.encryptionPrivateKey, 'base64');
      const encryptionPrivateKey = await webcrypto.subtle.importKey(
        'pkcs8',
        encryptionPrivateKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['decrypt']
      );

      // Decrypt the response
      const decryptedBuffer = await webcrypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        encryptionPrivateKey,
        encryptedAnswer
      );

      // Convert decrypted buffer back to string
      const decryptedAnswer = new TextDecoder().decode(decryptedBuffer);
      
      return decryptedAnswer;
    } catch (error: any) {
      throw new Error(`Failed to decrypt response: ${error.message}`);
    }
  }

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
  async getSurveyPublicKeys(surveyId: string) {
    try {
      const result = await db.query(
        `SELECT blind_signature_public_key, encryption_public_key
         FROM surveys WHERE id = $1 LIMIT 1`,
        [surveyId]
      );
      const survey = result.rows[0]
        ? {
            blindSignaturePublicKey: result.rows[0].blind_signature_public_key,
            encryptionPublicKey: result.rows[0].encryption_public_key,
          }
        : null;

      if (!survey) {
        throw new Error('Survey not found');
      }

      return {
        blindSignaturePublicKey: Buffer.from(survey.blindSignaturePublicKey, 'base64'),
        encryptionPublicKey: Buffer.from(survey.encryptionPublicKey, 'base64')
      };
    } catch (error: any) {
      throw new Error(`Failed to get survey public keys: ${error.message}`);
    }
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
  async decryptAllResponses(surveyId: string, encryptedAnswers: ArrayBuffer[]): Promise<string[]> {
    try {
      const decryptedAnswers: string[] = [];
      
      for (const encryptedAnswer of encryptedAnswers) {
        const decrypted = await this.decryptResponse(surveyId, encryptedAnswer);
        decryptedAnswers.push(decrypted);
      }
      
      return decryptedAnswers;
    } catch (error: any) {
      throw new Error(`Failed to decrypt all responses: ${error.message}`);
    }
  }

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
  async bulkVerifyCommitments(commitments: Uint8Array[]): Promise<Uint8Array> {
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
      throw new Error(`Failed to generate Merkle root: ${error.message}`);
    }
  }
} 