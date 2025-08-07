import { RSABSSA } from '@cloudflare/blindrsa-ts';

// Utility functions for cryptographic operations using real RSABSSA library
export class CryptoUtils {
  
  // Generate hash commitment for survey answer
  static async generateCommitment(message: string): Promise<string> {
    // Use the same hashing as server for consistency
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(message));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Prepare message for blinding using RSABSSA
  static prepareMessage(message: string): Uint8Array {
    const suite = RSABSSA.SHA384.PSS.Randomized();
    const encodedMessage = new TextEncoder().encode(message);
    return suite.prepare(encodedMessage);
  }

  // Generate blinded message using real RSABSSA library
  static async generateBlindedMessage(message: Uint8Array, publicKey: CryptoKey): Promise<{
    blindedMsg: Uint8Array;
    inv: Uint8Array;
    preparedMsg: Uint8Array;
  }> {
    try {
      const suite = RSABSSA.SHA384.PSS.Randomized();
      
      // The message should already be properly encoded as Uint8Array
      // Prepare the message using the suite
      const preparedMsg = suite.prepare(message);
      
      // Generate blinded message and inverse
      const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);
      
      return {
        blindedMsg,
        inv,
        preparedMsg
      };
    } catch (error: any) {
      throw new Error(`Failed to generate blinded message: ${error.message}`);
    }
  }

  // Finalize blind signature using RSABSSA
  static async finalizeSignature(
    publicKey: CryptoKey,
    preparedMsg: Uint8Array, 
    blindSignature: Uint8Array, 
    inv: Uint8Array
  ): Promise<Uint8Array> {
    try {
      const suite = RSABSSA.SHA384.PSS.Randomized();
      const signature = await suite.finalize(publicKey, preparedMsg, blindSignature, inv);
      return signature;
    } catch (error: any) {
      throw new Error(`Failed to finalize signature: ${error.message}`);
    }
  }

  // Verify signature using RSABSSA
  static async verifySignature(
    publicKey: CryptoKey,
    signature: Uint8Array,
    preparedMsg: Uint8Array
  ): Promise<boolean> {
    try {
      const suite = RSABSSA.SHA384.PSS.Randomized();
      const isValid = await suite.verify(publicKey, signature, preparedMsg);
      return isValid;
    } catch (error: any) {
      throw new Error(`Failed to verify signature: ${error.message}`);
    }
  }

  // Encrypt answer with RSA-OAEP
  static async encryptAnswer(answer: string, publicKey: CryptoKey): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(answer);
    
    return await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      data
    );
  }

  // Convert public key from base64 to CryptoKey
  static async importPublicKey(keyData: string, keyType: 'blindSignature' | 'encryption'): Promise<CryptoKey> {
    try {
      // Decode base64 to binary
      const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
      
      const algorithm = keyType === 'blindSignature' 
        ? { 
            name: "RSA-PSS", 
            hash: "SHA-384" 
          }
        : { 
            name: "RSA-OAEP", 
            hash: "SHA-256" 
          };
      
      const keyUsages: KeyUsage[] = keyType === 'blindSignature' ? ["verify"] : ["encrypt"];
      
      // Note: RSABSSA library requires extractable keys for blind signature operations
      const extractable = keyType === 'blindSignature' ? true : false;
      
      return await window.crypto.subtle.importKey(
        "spki",
        binaryKey,
        algorithm,
        extractable,
        keyUsages
      );
    } catch (error: any) {
      throw new Error(`Failed to import ${keyType} public key: ${error.message}`);
    }
  }

  // Generate SHA-256 commitment hash (matching server implementation)
  static async generateCommitmentHash(answer: string): Promise<Uint8Array> {
    try {
      const answerBuffer = new TextEncoder().encode(answer);
      const commitment = await crypto.subtle.digest('SHA-256', answerBuffer);
      return new Uint8Array(commitment);
    } catch (error: any) {
      throw new Error(`Failed to generate commitment hash: ${error.message}`);
    }
  }
}

export interface BlindSignatureRequest {
  blindedMessage: string; // Note: should match server expectation
  token: string;
}

export interface BlindSignatureResponse {
  blindSignature: string;
}

export interface SurveySubmission {
  surveyId: string;
  encryptedAnswer: number[]; // Array format for JSON serialization
  commitment: string; // Hex string
  userKeyJson?: any; // Optional user key data
}

export interface StudentProof {
  surveyId: string;
  surveyAnswer: string;
  preparedMsg: Uint8Array;
  signature: Uint8Array;
  commitment: string;
  timestamp: number;
  transactionSignature?: string; // Blockchain transaction signature
  blindedMsg: Uint8Array;
  inv: Uint8Array;
  encryptedAnswer: ArrayBuffer;
  blindSignature: Uint8Array;
}

// Helper function to convert Uint8Array to base64 for transmission
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  return btoa(String.fromCharCode(...uint8Array));
}

// Helper function to convert base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

// Helper function to convert ArrayBuffer to number array for JSON
export function arrayBufferToNumberArray(buffer: ArrayBuffer): number[] {
  return Array.from(new Uint8Array(buffer));
} 