import { Router } from 'express';
import { CryptoController } from '../controllers/crypto.controller';

const router = Router();
const cryptoController = new CryptoController();

/**
 * @swagger
 * /crypto/blind-sign/{surveyId}:
 *   post:
 *     summary: Generate blind signature for student's blinded message
 *     tags: [Cryptography]
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
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
 *                 example: "eyJibGluZGVkTWVzc2FnZSI6ImFiY2RlZmcifQ=="
 *     responses:
 *       200:
 *         description: Blind signature generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blindSignature:
 *                   type: string
 *                   format: base64
 *                   description: Base64 encoded blind signature
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Cryptographic operation failed
 */
router.post('/blind-sign/:surveyId', cryptoController.generateBlindSignature.bind(cryptoController));

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
 * /crypto/decrypt-response:
 *   post:
 *     summary: Decrypt individual response
 *     tags: [Cryptography]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - surveyId
 *               - encryptedAnswer
 *             properties:
 *               surveyId:
 *                 type: string
 *                 description: Survey ID
 *               encryptedAnswer:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded encrypted answer
 *     responses:
 *       200:
 *         description: Response decrypted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 decryptedAnswer:
 *                   type: string
 *                   description: Decrypted answer text
 *       401:
 *         description: Unauthorized - JWT token required
 *       500:
 *         description: Decryption failed
 */
router.post('/decrypt-response', cryptoController.decryptResponse.bind(cryptoController));

/**
 * @swagger
 * /crypto/public-keys/{surveyId}:
 *   get:
 *     summary: Get survey public keys for cryptographic operations
 *     tags: [Cryptography]
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *     responses:
 *       200:
 *         description: Survey public keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blindSignaturePublicKey:
 *                   type: string
 *                   format: base64
 *                   description: RSA public key for blind signatures
 *                 encryptionPublicKey:
 *                   type: string
 *                   format: base64
 *                   description: RSA public key for encryption
 *       404:
 *         description: Survey not found
 */
router.get('/public-keys/:surveyId', cryptoController.getSurveyPublicKeys.bind(cryptoController));

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