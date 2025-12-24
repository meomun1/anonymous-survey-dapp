import { Router } from 'express';
import { ResponseController } from '../controllers/response.controller';
import { verifyBlindSignature } from '../middleware/verifyBlindSignature';

const router = Router();
const responseController = new ResponseController();

// ============================================================================
// NOTE: Old blockchain routes removed (NEW ARCHITECTURE)
// - POST /ingest/:campaignId - REMOVED (no longer needed)
// - POST /decrypt-campaign/:campaignId - REMOVED (responses already decrypted in Phase 3)
// - POST /submit - REMOVED (use POST /batch for Phase 3)
// ============================================================================

/**
 * @swagger
 * /responses/encrypted/{campaignId}:
 *   get:
 *     summary: Get encrypted responses for a campaign
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of encrypted responses
 */
router.get('/encrypted/:campaignId', responseController.getEncryptedResponses.bind(responseController));

/**
 * @swagger
 * /responses/decrypted/{campaignId}:
 *   get:
 *     summary: Get decrypted responses for a campaign
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of decrypted responses
 */
router.get('/decrypted/:campaignId', responseController.getDecryptedResponses.bind(responseController));

/**
 * @swagger
 * /responses/parsed/survey/{surveyId}:
 *   get:
 *     summary: Get parsed responses for a survey
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Parsed responses
 */
router.get('/parsed/survey/:surveyId', responseController.getParsedResponsesBySurvey.bind(responseController));

// Replaced by commitmentHex endpoint
/**
 * @swagger
 * /responses/commitment/{commitmentHex}:
 *   get:
 *     summary: Lookup a response by commitment hex
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: commitmentHex
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Response row
 */
router.get('/commitment/:commitmentHex', responseController.getResponseByCommitment.bind(responseController));

/**
 * @swagger
 * /responses/verify/{decryptedResponseId}:
 *   get:
 *     summary: Verify integrity of a decrypted response
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: decryptedResponseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
router.get('/verify/:decryptedResponseId', responseController.verifyResponseIntegrity.bind(responseController));

/**
 * @swagger
 * /responses/submit-batch:
 *   post:
 *     summary: Phase 3 - Submit batch responses with blind signature authorization
 *     tags: [Double Blind Signature Workflow]
 *     security:
 *       - bearerAuth: []
 *     description: Submit all survey responses anonymously with authorization signature. Returns receipt signature.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - responses
 *               - ticketCommitment
 *               - blindedReceipt
 *             properties:
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - surveyId
 *                     - encryptedAnswer
 *                     - commitment
 *                   properties:
 *                     surveyId:
 *                       type: string
 *                       description: Survey ID
 *                     encryptedAnswer:
 *                       type: string
 *                       description: Base64-encoded encrypted answer
 *                     commitment:
 *                       type: string
 *                       description: Hex-encoded SHA-256 commitment
 *               ticketCommitment:
 *                 type: string
 *                 description: SHA-256 commitment for survey count
 *               blindedReceipt:
 *                 type: string
 *                 description: Base64-encoded blinded receipt
 *     responses:
 *       200:
 *         description: Batch submission successful, receipt signature issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blindSignature:
 *                   type: string
 *                   description: Base64-encoded receipt blind signature
 *                 submittedAt:
 *                   type: string
 *                   format: date-time
 *                 processedCount:
 *                   type: number
 *       400:
 *         description: Missing fields or validation failed
 *       401:
 *         description: Invalid authorization signature
 *       409:
 *         description: Authorization already used
 */
router.post('/submit-batch', verifyBlindSignature, responseController.submitBatchResponses.bind(responseController));

export default router; 