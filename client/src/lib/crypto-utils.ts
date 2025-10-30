/**
 * Client-side cryptography utilities for anonymous survey submission
 * Uses: @cloudflare/blindrsa-ts for blind signatures, Web Crypto API for encryption
 */

import { RSABSSA } from '@cloudflare/blindrsa-ts';

// ============================================================================
// COMMITMENT GENERATION (SHA-256)
// ============================================================================

/**
 * Generate SHA-256 commitment hash from answer string
 * Matches server implementation in crypto.service.ts
 * @param answerString - Format: "surveyId|courseCode|teacherId|answers"
 * @returns Hex-encoded commitment hash
 */
export async function generateCommitment(answerString: string): Promise<string> {
  try {
    // Match server implementation exactly
    const answerBuffer = new TextEncoder().encode(answerString);
    const commitment = await crypto.subtle.digest('SHA-256', answerBuffer);
    const commitmentArray = new Uint8Array(commitment);

    // Convert to hex for transmission (matches server's Buffer.from(commitment).toString('hex'))
    const commitmentHex = Array.from(commitmentArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return commitmentHex;
  } catch (error: any) {
    throw new Error(`Failed to generate commitment: ${error.message}`);
  }
}

/**
 * Format answer array into the required string format
 * @param surveyId - Survey UUID
 * @param courseCode - Course code (e.g., "CS101")
 * @param teacherId - Teacher UUID
 * @param answers - Array of answer values (1-5)
 * @returns Formatted string: "surveyId|courseCode|teacherId|12345..."
 */
export function formatAnswerString(
  surveyId: string,
  courseCode: string,
  teacherId: string,
  answers: number[]
): string {
  const answersStr = answers.join('');
  return `${surveyId}|${courseCode}|${teacherId}|${answersStr}`;
}

// ============================================================================
// BLIND SIGNATURE PROTOCOL (RSA-BSSA with SHA-384 PSS)
// ============================================================================

/**
 * Blind a message for RSA blind signature
 * Uses the Cloudflare blindrsa-ts library with SHA-384 and PSS padding
 * @param message - Message to blind (answer string)
 * @param publicKeyBuffer - Campaign's blind signature public key (SPKI format)
 * @returns Object with blinded message, prepared message, and inverse for unblinding
 */
export async function blindMessage(
  message: string,
  publicKeyBuffer: ArrayBuffer
): Promise<{ blindedMsg: Uint8Array; preparedMsg: Uint8Array; inv: Uint8Array }> {
  try {
    // Initialize the blind RSA suite (SHA-384, PSS, Randomized)
    const suite = RSABSSA.SHA384.PSS.Randomized();

    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify']
    );

    // Prepare the message
    const messageBytes = new TextEncoder().encode(message);
    const preparedMsg = suite.prepare(messageBytes);

    // Blind the message
    const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);

    return { blindedMsg, preparedMsg, inv };
  } catch (error: any) {
    throw new Error(`Failed to blind message: ${error.message}`);
  }
}

/**
 * Unblind a signature received from the server
 * @param publicKeyBuffer - Campaign's blind signature public key (SPKI format)
 * @param preparedMsg - The prepared message (from suite.prepare)
 * @param blindSignature - The blind signature from server
 * @param inv - The inverse from blinding operation
 * @returns Unblinded signature
 */
export async function unblindSignature(
  publicKeyBuffer: ArrayBuffer,
  preparedMsg: Uint8Array,
  blindSignature: Uint8Array,
  inv: Uint8Array
): Promise<Uint8Array> {
  try {
    const suite = RSABSSA.SHA384.PSS.Randomized();

    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify']
    );

    // Finalize (unblind) the signature
    const signature = await suite.finalize(publicKey, preparedMsg, blindSignature, inv);

    return signature;
  } catch (error: any) {
    throw new Error(`Failed to unblind signature: ${error.message}`);
  }
}

/**
 * Verify a blind signature
 * @param publicKeyBuffer - Campaign's blind signature public key
 * @param signature - The unblinded signature
 * @param message - Original message
 * @returns True if signature is valid
 */
export async function verifyBlindSignature(
  publicKeyBuffer: ArrayBuffer,
  signature: Uint8Array,
  message: string
): Promise<boolean> {
  try {
    const suite = RSABSSA.SHA384.PSS.Randomized();

    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify']
    );

    const messageBytes = new TextEncoder().encode(message);
    const preparedMsg = suite.prepare(messageBytes);

    return await suite.verify(publicKey, signature, preparedMsg);
  } catch (error: any) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Prepare message for blind signature protocol
 * @param message - Message to prepare
 * @returns Prepared message bytes
 */
export function prepareMessage(message: string): Uint8Array {
  const suite = RSABSSA.SHA384.PSS.Randomized();
  const messageBytes = new TextEncoder().encode(message);
  return suite.prepare(messageBytes);
}

// ============================================================================
// RSA-OAEP ENCRYPTION
// ============================================================================

/**
 * Encrypt answer string using RSA-OAEP with campaign's encryption public key
 * @param answerString - Answer string to encrypt
 * @param publicKeyBuffer - RSA encryption public key (SPKI format, ArrayBuffer)
 * @returns Base64-encoded encrypted data
 */
export async function encryptAnswerString(
  answerString: string,
  publicKeyBuffer: ArrayBuffer
): Promise<string> {
  try {
    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );

    // Encrypt the answer string
    const encoder = new TextEncoder();
    const data = encoder.encode(answerString);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      data
    );

    // Convert to base64
    const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));

    return encryptedBase64;
  } catch (error: any) {
    throw new Error(`Failed to encrypt answer string: ${error.message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert base64 to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  const binaryString = String.fromCharCode(...bytes);
  return btoa(binaryString);
}

// ============================================================================
// PROOF MANAGEMENT
// ============================================================================

export interface SurveyProof {
  surveyId: string;
  courseCode: string;
  courseName: string;
  teacherId: string;
  teacherName?: string;
  campaignId?: string;
  campaignName?: string;
  token?: string; // Token value for ownership tracking (which student created this proof)
  answerString: string;
  answers: number[];
  commitment: string;
  blindSignature: string; // hex-encoded unblinded signature
  encryptedData: string; // base64-encoded encrypted answer
  timestamp: string;
}

export interface ProofFile {
  token: string;
  campaignId: string;
  campaignName: string;
  transactionHash: string;
  timestamp: string;
  surveys: SurveyProof[];
}

/**
 * Save survey proof to localStorage
 */
export function saveProofToSession(surveyId: string, proof: SurveyProof): void {
  const key = `proof_${surveyId}`;
  localStorage.setItem(key, JSON.stringify(proof));
}

/**
 * Get survey proof from localStorage
 */
export function getProofFromSession(surveyId: string): SurveyProof | null {
  const key = `proof_${surveyId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Get all survey proofs from localStorage
 */
export function getAllProofsFromSession(): SurveyProof[] {
  const proofs: SurveyProof[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('proof_')) {
      const data = localStorage.getItem(key);
      if (data) {
        proofs.push(JSON.parse(data));
      }
    }
  }
  return proofs;
}

/**
 * Clear all survey proofs from localStorage
 */
export function clearAllProofs(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('proof_')) {
      keys.push(key);
    }
  }
  keys.forEach(key => localStorage.removeItem(key));
}

/**
 * Remove invalid proofs from localStorage
 * Invalid proofs are missing required fields: surveyId, commitment, or encryptedData
 */
export function cleanupInvalidProofs(): number {
  let removed = 0;
  const keys: string[] = [];

  // Collect all proof keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('proof_')) {
      keys.push(key);
    }
  }

  // Check each proof and remove if invalid
  keys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.removeItem(key);
        removed++;
        return;
      }

      const proof = JSON.parse(data);
      const isValid = !!(proof.surveyId && proof.commitment && proof.encryptedData);

      if (!isValid) {
        console.warn(`Removing invalid proof from localStorage: ${key}`, {
          surveyId: proof.surveyId,
          hasCommitment: !!proof.commitment,
          hasEncryptedData: !!proof.encryptedData
        });
        localStorage.removeItem(key);
        removed++;
      }
    } catch (e) {
      console.error(`Failed to parse proof ${key}, removing`, e);
      localStorage.removeItem(key);
      removed++;
    }
  });

  return removed;
}

/**
 * Mark blockchain submission with timestamp (token-specific)
 * @param transactionHash - The blockchain transaction hash
 * @param token - The student token (optional, falls back to sessionStorage)
 */
export function markBlockchainSubmitted(transactionHash: string, token?: string): void {
  // Get token from parameter or sessionStorage
  const studentToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('studentToken') : null);
  if (!studentToken) {
    console.warn('No token found for markBlockchainSubmitted, using global key');
    // Fallback to old behavior if no token
    localStorage.setItem('blockchain_submitted', JSON.stringify({
      transactionHash,
      timestamp: Date.now()
    }));
    return;
  }

  const submissionData = {
    transactionHash,
    timestamp: Date.now(),
    token: studentToken
  };
  // Store with token-specific key
  localStorage.setItem(`blockchain_submitted_${studentToken}`, JSON.stringify(submissionData));
}

/**
 * Get blockchain submission info (token-specific)
 * @param token - The student token (optional, falls back to sessionStorage)
 */
export function getBlockchainSubmission(token?: string): { transactionHash: string; timestamp: number; token?: string } | null {
  // Get token from parameter or sessionStorage
  const studentToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('studentToken') : null);

  if (studentToken) {
    // Try token-specific key first
    const data = localStorage.getItem(`blockchain_submitted_${studentToken}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
  }

  // Fallback to old global key for backwards compatibility
  const data = localStorage.getItem('blockchain_submitted');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Auto-cleanup proofs after specified minutes since blockchain submission (token-specific)
 * @param minutesAfterSubmission - Number of minutes to wait before cleanup (default: 5)
 * @param token - The student token (optional, falls back to sessionStorage)
 * @returns Number of proofs cleaned up, or -1 if not ready to cleanup yet
 */
export function autoCleanupAfterSubmission(minutesAfterSubmission: number = 5, token?: string): number {
  const studentToken = token || (typeof window !== 'undefined' ? sessionStorage.getItem('studentToken') : null);
  const submission = getBlockchainSubmission(studentToken || undefined);

  if (!submission) {
    // No submission yet, don't cleanup
    return -1;
  }

  const now = Date.now();
  const elapsedMinutes = (now - submission.timestamp) / (1000 * 60);

  if (elapsedMinutes >= minutesAfterSubmission) {
    console.log(`Auto-cleanup: ${elapsedMinutes.toFixed(1)} minutes since submission, cleaning up...`);

    // Clear all proofs
    clearAllProofs();

    // Clear token-specific submission flag
    if (studentToken) {
      localStorage.removeItem(`blockchain_submitted_${studentToken}`);
    }
    // Also clear old global key for backwards compatibility
    localStorage.removeItem('blockchain_submitted');

    // Clear proof metadata
    localStorage.removeItem('proof_metadata');

    return 1; // Cleanup performed
  }

  console.log(`Auto-cleanup: ${elapsedMinutes.toFixed(1)}/${minutesAfterSubmission} minutes elapsed, not cleaning up yet`);
  return -1; // Not ready to cleanup
}

/**
 * Generate proof file for download
 */
export function generateProofFile(
  token: string,
  campaignId: string,
  campaignName: string,
  transactionHash: string,
  surveys: SurveyProof[]
): ProofFile {
  return {
    token,
    campaignId,
    campaignName,
    transactionHash,
    timestamp: new Date().toISOString(),
    surveys
  };
}

/**
 * Download proof file as JSON
 */
export function downloadProofFile(proofFile: ProofFile): void {
  const json = JSON.stringify(proofFile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `survey-proof-${proofFile.campaignId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
