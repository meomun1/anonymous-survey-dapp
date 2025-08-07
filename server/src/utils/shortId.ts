import { randomBytes } from 'crypto';

/**
 * Generate a short alphanumeric ID suitable for blockchain operations
 * @param {number} length - Length of the ID (default: 8 characters)
 * @returns {string} Short alphanumeric ID
 */
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Check if a short ID is valid format
 * @param {string} shortId - Short ID to validate
 * @returns {boolean} True if valid
 */
export function isValidShortId(shortId: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(shortId);
} 