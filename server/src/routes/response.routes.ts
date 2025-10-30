import { Router } from 'express';
import { ResponseController } from '../controllers/response.controller';

const router = Router();
const responseController = new ResponseController();

/**
 * @swagger
 * /responses/ingest/{campaignId}:
 *   post:
 *     summary: Ingest encrypted responses from blockchain for a campaign
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ingest summary
 */
router.post('/ingest/:campaignId', responseController.ingestFromBlockchain.bind(responseController));

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
 * /responses/decrypt-campaign/{campaignId}:
 *   post:
 *     summary: Decrypt and parse all campaign responses
 *     tags: [Responses]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Decryption summary
 */
router.post('/decrypt-campaign/:campaignId', responseController.decryptCampaignResponses.bind(responseController));

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
 * /responses/submit:
 *   post:
 *     summary: Submit student responses to blockchain
 *     tags: [Responses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - responses
 *             properties:
 *               token:
 *                 type: string
 *                 description: Student token
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     surveyId:
 *                       type: string
 *                     encryptedData:
 *                       type: string
 *                       format: base64
 *                     commitment:
 *                       type: string
 *                       format: hex
 *     responses:
 *       200:
 *         description: Responses submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactionHash:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Token not found
 *       500:
 *         description: Blockchain submission failed
 */
router.post('/submit', responseController.submitStudentResponses.bind(responseController));

export default router; 