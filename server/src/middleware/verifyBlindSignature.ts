import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';

/**
 * Middleware to verify blind signature authorization
 * Used in Phase 3: Batch Submission
 *
 * Extracts and verifies: Authorization: Bearer <preparedToken>.<tokenSignature>
 */
export async function verifyBlindSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    // Parse: Bearer <preparedToken>.<tokenSignature>
    const authToken = authHeader.substring(7); // Remove "Bearer "
    const parts = authToken.split('.');

    if (parts.length !== 2) {
      return res.status(401).json({
        error: 'Invalid authorization format',
        expected: 'Bearer <preparedToken>.<tokenSignature>'
      });
    }

    const [preparedToken, tokenSignature] = parts;

    // Get campaign ID from request body
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId is required' });
    }

    // Get campaign blind signature public key
    const campaignResult = await db.query(
      `SELECT blind_signature_public_key FROM survey_campaigns WHERE id = $1 LIMIT 1`,
      [campaignId]
    );

    if (campaignResult.rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const blindSignaturePublicKeyBuffer = Buffer.from(
      campaignResult.rows[0].blind_signature_public_key,
      'base64'
    );

    // Import public key
    const publicKey = await webcrypto.subtle.importKey(
      'spki',
      blindSignaturePublicKeyBuffer,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify']
    );

    // Verify blind signature
    const suite = RSABSSA.SHA384.PSS.Randomized();
    const isValid = await suite.verify(
      publicKey,
      Buffer.from(tokenSignature, 'base64'),
      Buffer.from(preparedToken, 'base64')
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid blind signature' });
    }

    // Check if signature pair already used
    const existingUse = await db.query(
      `SELECT id FROM used_submission_signatures
       WHERE prepared_token = $1 AND token_signature = $2 LIMIT 1`,
      [preparedToken, tokenSignature]
    );

    if (existingUse.rowCount && existingUse.rowCount > 0) {
      return res.status(409).json({ error: 'Authorization already used' });
    }

    // Attach to request for use in controller
    req.blindAuth = {
      preparedToken,
      tokenSignature,
      campaignId
    };

    next();
  } catch (error) {
    console.error('Blind signature verification error:', error);
    return res.status(500).json({ error: 'Signature verification failed' });
  }
}

/**
 * Middleware to verify receipt signature
 * Used in Phase 4: Claim Participation
 *
 * Extracts and verifies: Authorization: Bearer <preparedReceipt>.<receiptSignature>
 */
export async function verifyReceiptSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    // Parse: Bearer <preparedReceipt>.<receiptSignature>
    const authToken = authHeader.substring(7);
    const parts = authToken.split('.');

    if (parts.length !== 2) {
      return res.status(401).json({
        error: 'Invalid authorization format',
        expected: 'Bearer <preparedReceipt>.<receiptSignature>'
      });
    }

    const [preparedReceipt, receiptSignature] = parts;

    // Get campaign ID from request body
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId is required' });
    }

    // Get campaign blind signature public key
    const campaignResult = await db.query(
      `SELECT blind_signature_public_key FROM survey_campaigns WHERE id = $1 LIMIT 1`,
      [campaignId]
    );

    if (campaignResult.rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const blindSignaturePublicKeyBuffer = Buffer.from(
      campaignResult.rows[0].blind_signature_public_key,
      'base64'
    );

    // Import public key
    const publicKey = await webcrypto.subtle.importKey(
      'spki',
      blindSignaturePublicKeyBuffer,
      { name: 'RSA-PSS', hash: 'SHA-384' },
      true,
      ['verify']
    );

    // Verify receipt signature
    const suite = RSABSSA.SHA384.PSS.Randomized();
    const isValid = await suite.verify(
      publicKey,
      Buffer.from(receiptSignature, 'base64'),
      Buffer.from(preparedReceipt, 'base64')
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid receipt signature' });
    }

    // Check if receipt already claimed
    const existingClaim = await db.query(
      `SELECT id FROM used_claim_signatures
       WHERE prepared_receipt = $1 AND receipt_signature = $2 LIMIT 1`,
      [preparedReceipt, receiptSignature]
    );

    if (existingClaim.rowCount && existingClaim.rowCount > 0) {
      return res.status(409).json({ error: 'Receipt already claimed' });
    }

    // Attach to request for use in controller
    req.receiptAuth = {
      preparedReceipt,
      receiptSignature,
      campaignId
    };

    next();
  } catch (error) {
    console.error('Receipt signature verification error:', error);
    return res.status(500).json({ error: 'Signature verification failed' });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      blindAuth?: {
        preparedToken: string;
        tokenSignature: string;
        campaignId: string;
      };
      receiptAuth?: {
        preparedReceipt: string;
        receiptSignature: string;
        campaignId: string;
      };
    }
  }
}
