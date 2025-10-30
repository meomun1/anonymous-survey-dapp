import { Router } from 'express';
import { CryptoController } from '../controllers/crypto.controller';

const router = Router();
const cryptoController = new CryptoController();

/**
 * @swagger
 * /crypto/campaigns/{campaignId}/blind-sign:
 *   post:
 *     summary: Generate blind signature for student's blinded message (campaign)
 *     tags: [Cryptography]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blindedMessage
 *             properties:
 *               blindedMessage:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded blinded message from client
 *     responses:
 *       200:
 *         description: Blind signature generated successfully
 */
router.post('/campaigns/:campaignId/blind-sign', cryptoController.blindSignCampaign.bind(cryptoController));

/**
 * @swagger
 * /crypto/verify-commitment:
 *   post:
 *     summary: Verify commitment integrity
 *     tags: [Cryptography]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - commitment
 *             properties:
 *               message:
 *                 type: string
 *                 description: Original message
 *                 example: "Excellent"
 *               commitment:
 *                 type: string
 *                 format: hex
 *                 description: Hex encoded commitment hash
 *                 example: "a1b2c3d4e5f6..."
 *     responses:
 *       200:
 *         description: Commitment verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                   description: Whether the commitment is valid
 *       400:
 *         description: Invalid request parameters
 */
router.post('/verify-commitment', cryptoController.verifyCommitment.bind(cryptoController));
/**
 * @swagger
 * /crypto/campaigns/{campaignId}/decrypt:
 *   post:
 *     summary: Decrypt an encrypted answer using campaign keys
 *     tags: [Cryptography]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedAnswer
 *             properties:
 *               encryptedAnswer:
 *                 type: string
 *                 format: base64
 *     responses:
 *       200:
 *         description: Decryption result
 */
router.post('/campaigns/:campaignId/decrypt', cryptoController.decryptForCampaign.bind(cryptoController));

/**
 * @swagger
 * /crypto/campaigns/{campaignId}/public-keys:
 *   get:
 *     summary: Get campaign public keys for cryptographic operations
 *     tags: [Cryptography]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public keys
 */
router.get('/campaigns/:campaignId/public-keys', cryptoController.getCampaignPublicKeys.bind(cryptoController));

/**
 * @swagger
 * /crypto/generate-commitment:
 *   post:
 *     summary: Generate commitment for a message
 *     tags: [Cryptography]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message to generate commitment for
 *                 example: "Excellent"
 *     responses:
 *       200:
 *         description: Commitment generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commitment:
 *                   type: string
 *                   format: hex
 *                   description: Hex encoded commitment hash
 *       400:
 *         description: Invalid request parameters
 */
router.post('/generate-commitment', cryptoController.generateCommitment.bind(cryptoController));

/**
 * @swagger
 * /crypto/bulk-verify-commitments:
 *   post:
 *     summary: Bulk verify commitments using Merkle tree
 *     tags: [Cryptography]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commitments
 *             properties:
 *               commitments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: hex
 *                 description: Array of hex encoded commitment hashes
 *                 example: ["a1b2c3d4e5f6...", "b2c3d4e5f6a1..."]
 *     responses:
 *       200:
 *         description: Merkle root generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 merkleRoot:
 *                   type: string
 *                   format: hex
 *                   description: Hex encoded Merkle root
 *       400:
 *         description: Invalid request parameters
 */
router.post('/bulk-verify-commitments', cryptoController.bulkVerifyCommitments.bind(cryptoController));

export default router; 