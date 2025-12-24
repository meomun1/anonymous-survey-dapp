import { Router } from 'express';
import { TokenController } from '../controllers/token.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';
import { verifyReceiptSignature } from '../middleware/verifyBlindSignature';

const router = Router();
const tokenController = new TokenController();

/**
 * @swagger
 * /tokens/campaign/generate:
 *   post:
 *     summary: Generate campaign tokens for students (admin only)
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - studentEmails
 *             properties:
 *               campaignId:
 *                 type: string
 *               studentEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Tokens generated
 */
router.post('/campaign/generate', verifyToken, requireAdmin, tokenController.generateCampaignTokens.bind(tokenController));

/**
 * @swagger
 * /tokens/verify:
 *   post:
 *     summary: Verify a token (POST with body)
 *     tags: [Tokens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token to verify
 *     responses:
 *       200:
 *         description: Token verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 tokenData:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     campaignId:
 *                       type: string
 *                     studentEmail:
 *                       type: string
 *                     isCompleted:
 *                       type: boolean
 *       400:
 *         description: Token is required
 *       404:
 *         description: Invalid token
 */
router.post('/verify', tokenController.verifyToken.bind(tokenController));

/**
 * @swagger
 * /tokens/validate/{token}:
 *   get:
 *     summary: Validate a token (GET with param)
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token to validate
 *       # campaign-first: no surveyId query
 *     responses:
 *       200:
 *         description: Token validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 campaignId:
 *                   type: string
 *                 studentEmail:
 *                   type: string
 *                 isCompleted:
 *                   type: boolean
 *       404:
 *         description: Invalid token
 */
router.get('/validate/:token', tokenController.validateToken.bind(tokenController));

/**
 * @swagger
 * /tokens/{token}/use:
 *   post:
 *     summary: Mark token as used
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token to mark as used
 *     responses:
 *       200:
 *         description: Token marked as used successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 token:
 *                   type: string
 *                 used:
 *                   type: boolean
 *                 usedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Token not found
 */
router.post('/:token/use', tokenController.markTokenAsUsed.bind(tokenController));

/**
 * @swagger
 * /tokens/{token}/complete:
 *   post:
 *     summary: Mark token as completed
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token to mark as completed
 *     responses:
 *       200:
 *         description: Token marked as completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 token:
 *                   type: string
 *                 isCompleted:
 *                   type: boolean
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Token not found
 */
router.post('/:token/complete', tokenController.markTokenAsCompleted.bind(tokenController));

/**
 * @swagger
 * /tokens/{token}/blockchain-submitted:
 *   post:
 *     summary: Mark token as blockchain submitted
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token to mark as blockchain submitted
 *     responses:
 *       200:
 *         description: Token marked as blockchain submitted successfully
 *       404:
 *         description: Token not found
 */
router.post('/:token/blockchain-submitted', tokenController.markTokenBlockchainSubmitted.bind(tokenController));

/**
 * @swagger
 * /tokens/survey/{surveyId}:
 *   get:
 *     summary: Get all tokens for a survey
 *     tags: [Tokens]
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
 *         description: List of tokens for the survey
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   token:
 *                     type: string
 *                   studentEmail:
 *                     type: string
 *                   used:
 *                     type: boolean
 *                   isCompleted:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized - JWT token required
 */
/**
 * @swagger
 * /tokens/campaign/{campaignId}:
 *   get:
 *     summary: List tokens in a campaign
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tokens
 */
router.get('/campaign/:campaignId', tokenController.getCampaignTokens.bind(tokenController));

/**
 * @swagger
 * /tokens/student-surveys:
 *   post:
 *     summary: Get all surveys for a student by their token
 *     tags: [Tokens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student surveys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 surveys:
 *                   type: array
 *                 studentName:
 *                   type: string
 */
router.post('/student-surveys', tokenController.getStudentSurveys.bind(tokenController));

/**
 * @swagger
 * /tokens/student/{email}:
 *   get:
 *     summary: List tokens for a student (optionally by campaignId query)
 *     tags: [Tokens]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tokens
 */
router.get('/student/:email', tokenController.getStudentTokens.bind(tokenController));

/**
 * @swagger
 * /tokens/test-email:
 *   get:
 *     summary: Test email service (admin only)
 *     tags: [Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email service test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   description: Whether email service is available
 *                 smtpTested:
 *                   type: boolean
 *                   description: Whether SMTP connection was tested
 *                 message:
 *                   type: string
 *                   description: Test result message
 *       401:
 *         description: Unauthorized - JWT token required
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/test-email', verifyToken, requireAdmin, tokenController.testEmailService.bind(tokenController));

/**
 * @swagger
 * /tokens/login:
 *   get:
 *     summary: Phase 1 - Get ticket commitment and surveys
 *     tags: [Double Blind Signature Workflow]
 *     security:
 *       - bearerAuth: []
 *     description: Issue ticket commitment and return surveys for student token. Token must not have ticket issued yet.
 *     responses:
 *       200:
 *         description: Ticket and surveys issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 surveys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       courseCode:
 *                         type: string
 *                       courseName:
 *                         type: string
 *                       teacherId:
 *                         type: string
 *                       teacherName:
 *                         type: string
 *                 ticketCommitment:
 *                   type: string
 *                   description: SHA-256 commitment for survey count
 *                 campaignId:
 *                   type: string
 *       401:
 *         description: Missing or invalid authorization
 *       404:
 *         description: Invalid token
 *       409:
 *         description: Ticket already issued
 */
router.get('/login', tokenController.getTicketAndSurveys.bind(tokenController));

/**
 * @swagger
 * /tokens/blind-sign-token:
 *   post:
 *     summary: Phase 1 - Sign blinded token
 *     tags: [Double Blind Signature Workflow]
 *     security:
 *       - bearerAuth: []
 *     description: Sign blinded token for authorization. Token must not be used yet.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blindedToken
 *               - campaignId
 *             properties:
 *               blindedToken:
 *                 type: string
 *                 description: Base64-encoded blinded token
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID
 *     responses:
 *       200:
 *         description: Blind signature issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blindSignature:
 *                   type: string
 *                   description: Base64-encoded blind signature
 *       400:
 *         description: Missing required fields or campaign mismatch
 *       401:
 *         description: Missing or invalid authorization
 *       404:
 *         description: Invalid token
 *       409:
 *         description: Token already used
 */
router.post('/blind-sign-token', tokenController.blindSignToken.bind(tokenController));

/**
 * @swagger
 * /tokens/participation/claim:
 *   post:
 *     summary: Phase 4 - Claim participation with receipt signature
 *     tags: [Double Blind Signature Workflow]
 *     security:
 *       - bearerAuth: []
 *     description: Claim participation using receipt signature. Links anonymous submission to student identity.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - campaignId
 *             properties:
 *               email:
 *                 type: string
 *                 description: Student email address
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID
 *     responses:
 *       200:
 *         description: Participation claimed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 participationRecorded:
 *                   type: boolean
 *                 claimedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing email or token not authorized
 *       401:
 *         description: Invalid receipt signature
 *       404:
 *         description: Token not found
 *       409:
 *         description: Participation already claimed or receipt already used
 */
router.post('/participation/claim', verifyReceiptSignature, tokenController.claimParticipation.bind(tokenController));

export default router; 