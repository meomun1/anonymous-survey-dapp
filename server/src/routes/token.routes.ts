import { Router } from 'express';
import { TokenController } from '../controllers/token.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

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
 * /tokens/validate/{token}:
 *   get:
 *     summary: Validate a token
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

export default router; 