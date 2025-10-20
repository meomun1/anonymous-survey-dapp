import { Request, Response } from 'express';
import { CryptoService } from '../services/crypto.service';

const cryptoService = new CryptoService();

export class CryptoController {
  /**
   * Generate blind signature for student's blinded message
   */
  async blindSignCampaign(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const { blindedMessage } = req.body;

      if (!campaignId || !blindedMessage) {
        return res.status(400).json({ error: 'Campaign ID and blinded message are required' });
      }

      // Convert base64 blinded message to Uint8Array
      const blindedMessageBuffer = Buffer.from(blindedMessage, 'base64');
      const blindedMessageArray = new Uint8Array(blindedMessageBuffer);

      const blindSignature = await cryptoService.blindSignCampaign(campaignId, blindedMessageArray);
      
      // Convert to base64 for transmission
      const blindSignatureBase64 = Buffer.from(blindSignature).toString('base64');

      res.json({ blindSignature: blindSignatureBase64 });
    } catch (error: any) {
      console.error('Blind signature generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate blind signature',
        details: error.message 
      });
    }
  }

  /**
   * Verify commitment integrity
   */
  async verifyCommitment(req: Request, res: Response) {
    try {
      const { message, commitment } = req.body;

      if (!message || !commitment) {
        return res.status(400).json({ error: 'Message and commitment are required' });
      }

      // Convert hex commitment to Uint8Array
      const commitmentArray = new Uint8Array(Buffer.from(commitment, 'hex'));

      const isValid = await cryptoService.verifyCommitment(message, commitmentArray);

      res.json({ isValid });
    } catch (error: any) {
      console.error('Commitment verification failed:', error);
      res.status(500).json({ 
        error: 'Failed to verify commitment',
        details: error.message 
      });
    }
  }

  /**
   * Decrypt individual response
   */
  async decryptForCampaign(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;
      const { encryptedAnswer } = req.body;

      if (!campaignId || !encryptedAnswer) {
        return res.status(400).json({ error: 'Campaign ID and encrypted answer are required' });
      }

      // Convert base64 encrypted answer to Uint8Array
      const buf = Buffer.from(encryptedAnswer, 'base64');
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

      const decryptedAnswer = await cryptoService.decryptForCampaign(campaignId, ab);

      res.json({ decryptedAnswer });
    } catch (error: any) {
      console.error('Response decryption failed:', error);
      res.status(500).json({ 
        error: 'Failed to decrypt response',
        details: error.message 
      });
    }
  }

  /**
   * Get campaign public keys
   */
  async getCampaignPublicKeys(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({ error: 'Campaign ID is required' });
      }

      const publicKeys = await cryptoService.getCampaignPublicKeys(campaignId);

      // Convert Uint8Arrays to base64 for transmission
      const response = {
        blindSignaturePublicKey: Buffer.from(publicKeys.blindSignaturePublicKey).toString('base64'),
        encryptionPublicKey: Buffer.from(publicKeys.encryptionPublicKey).toString('base64')
      };

      res.json(response);
    } catch (error: any) {
      console.error('Failed to get survey public keys:', error);
      res.status(500).json({ 
        error: 'Failed to get survey public keys',
        details: error.message 
      });
    }
  }

  /**
   * Generate commitment for a message
   */
  async generateCommitment(req: Request, res: Response) {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const commitment = await cryptoService.generateCommitment(message);
      
      // Convert to hex for transmission
      const commitmentHex = Buffer.from(commitment).toString('hex');

      res.json({ commitment: commitmentHex });
    } catch (error: any) {
      console.error('Commitment generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate commitment',
        details: error.message 
      });
    }
  }

  /**
   * Bulk verify commitments using Merkle tree
   */
  async bulkVerifyCommitments(req: Request, res: Response) {
    try {
      const { commitments } = req.body;

      if (!commitments || !Array.isArray(commitments)) {
        return res.status(400).json({ error: 'Commitments array is required' });
      }

      // Convert hex commitments to Uint8Arrays
      const commitmentArrays = commitments.map((commitment: string) => 
        new Uint8Array(Buffer.from(commitment, 'hex'))
      );

      const merkleRoot = await cryptoService.bulkVerifyCommitments(commitmentArrays);
      
      // Convert to hex for transmission
      const merkleRootHex = Buffer.from(merkleRoot).toString('hex');

      res.json({ merkleRoot: merkleRootHex });
    } catch (error: any) {
      console.error('Bulk commitment verification failed:', error);
      res.status(500).json({ 
        error: 'Failed to verify commitments',
        details: error.message 
      });
    }
  }
} 