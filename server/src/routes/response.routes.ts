import { Router } from 'express';
import { ResponseController } from '../controllers/response.controller';

const router = Router();
const responseController = new ResponseController();

/**
 * @swagger
 * /responses/blind-sign/{surveyId}:
 *   post:
 *     summary: Generate blind signature for student (the only server-side crypto operation needed)
 *     tags: [Responses]
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
router.post('/blind-sign/:surveyId', responseController.generateBlindSignature.bind(responseController));

/**
 * @swagger
 * /responses/submit-to-blockchain:
 *   post:
 *     summary: Submit encrypted response to blockchain
 *     tags: [Responses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - surveyId
 *               - commitment
 *               - encryptedAnswer
 *             properties:
 *               surveyId:
 *                 type: string
 *                 description: Survey ID
 *               commitment:
 *                 type: string
 *                 format: hex
 *                 description: Hex encoded commitment hash
 *               encryptedAnswer:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded encrypted answer
 *     responses:
 *       200:
 *         description: Response submitted to blockchain successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactionSignature:
 *                   type: string
 *                   description: Blockchain transaction signature
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Blockchain submission failed
 */
router.post('/submit-to-blockchain', responseController.submitToBlockchain.bind(responseController));

/**
 * @swagger
 * /responses/decrypt-all/{surveyId}:
 *   post:
 *     summary: Decrypt all responses for a survey (admin use)
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *     responses:
 *       200:
 *         description: All responses decrypted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processedResponses:
 *                   type: integer
 *                   description: Number of responses processed
 *                 responses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       decryptedAnswer:
 *                         type: string
 *                       commitmentHash:
 *                         type: string
 *       401:
 *         description: Unauthorized - JWT token required
 *       500:
 *         description: Decryption failed
 */
router.post('/decrypt-all/:surveyId', responseController.decryptAllResponses.bind(responseController));

/**
 * @swagger
 * /responses/survey/{surveyId}:
 *   get:
 *     summary: Get all responses for a survey (admin use)
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *     responses:
 *       200:
 *         description: List of survey responses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   surveyId:
 *                     type: string
 *                   decryptedAnswer:
 *                     type: string
 *                   commitmentHash:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Survey not found
 */
router.get('/survey/:surveyId', responseController.getSurveyResponses.bind(responseController));

/**
 * @swagger
 * /responses/commitment/{commitmentHash}:
 *   get:
 *     summary: Get response by commitment hash
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: commitmentHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Commitment hash to search for
 *     responses:
 *       200:
 *         description: Response found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 surveyId:
 *                   type: string
 *                 decryptedAnswer:
 *                   type: string
 *                 commitmentHash:
 *                   type: string
 *       404:
 *         description: Response not found
 */
router.get('/commitment/:commitmentHash', responseController.getResponseByCommitmentHash.bind(responseController));

/**
 * @swagger
 * /responses/stats/{surveyId}:
 *   get:
 *     summary: Get response statistics for a survey
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *     responses:
 *       200:
 *         description: Response statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalResponses:
 *                   type: integer
 *                 answerDistribution:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *       404:
 *         description: Survey not found
 */
router.get('/stats/:surveyId', responseController.getResponseStats.bind(responseController));

/**
 * @swagger
 * /responses/verify/{responseId}:
 *   get:
 *     summary: Verify response integrity
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Response ID to verify
 *     responses:
 *       200:
 *         description: Response integrity verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                   description: Whether the response integrity is valid
 *                 commitmentHash:
 *                   type: string
 *                   description: Expected commitment hash
 *       404:
 *         description: Response not found
 */
router.get('/verify/:responseId', responseController.verifyResponseIntegrity.bind(responseController));

export default router; 