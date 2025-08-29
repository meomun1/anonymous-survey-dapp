import express from 'express';
import { publicResponseController } from '../controllers/publicResponse.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/public-responses/survey/{surveyId}/selection:
 *   get:
 *     summary: Get all responses for admin selection
 *     description: Admin endpoint to get all survey responses for selecting which ones to make public
 *     tags: [Public Responses]
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
 *         description: Successfully retrieved responses for selection
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       decryptedAnswer:
 *                         type: string
 *                       commitmentHash:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       isPublic:
 *                         type: boolean
 *                       isPositive:
 *                         type: boolean
 *                         nullable: true
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/survey/:surveyId/selection', verifyToken, requireAdmin, publicResponseController.getResponsesForSelection.bind(publicResponseController));

/**
 * @swagger
 * /api/public-responses/survey/{surveyId}:
 *   post:
 *     summary: Update public responses for a survey
 *     description: Admin endpoint to select which responses to make public and mark them as positive/negative
 *     tags: [Public Responses]
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     responseId:
 *                       type: string
 *                       description: Response ID to make public
 *                     isPositive:
 *                       type: boolean
 *                       description: Whether this response is positive or negative
 *     responses:
 *       200:
 *         description: Successfully updated public responses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/survey/:surveyId', verifyToken, requireAdmin, publicResponseController.updatePublicResponses.bind(publicResponseController));

/**
 * @swagger
 * /api/public-responses/survey/{surveyId}/visibility:
 *   put:
 *     summary: Toggle public survey visibility
 *     description: Admin endpoint to enable/disable public access to the survey
 *     tags: [Public Responses]
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               isPublicEnabled:
 *                 type: boolean
 *                 description: Whether to enable public access
 *     responses:
 *       200:
 *         description: Successfully toggled public visibility
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       500:
 *         description: Internal server error
 */
router.put('/survey/:surveyId/visibility', verifyToken, requireAdmin, publicResponseController.togglePublicVisibility.bind(publicResponseController));

/**
 * @swagger
 * /api/public-responses/survey/{surveyId}/stats:
 *   get:
 *     summary: Get public response statistics
 *     description: Admin endpoint to get statistics about public responses
 *     tags: [Public Responses]
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
 *         description: Successfully retrieved public response statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSelected:
 *                       type: integer
 *                     positiveCount:
 *                       type: integer
 *                     negativeCount:
 *                       type: integer
 *                     positiveRate:
 *                       type: number
 *                     negativeRate:
 *                       type: number
 *       401:
 *         description: Unauthorized - Admin authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/survey/:surveyId/stats', verifyToken, requireAdmin, publicResponseController.getPublicResponseStats.bind(publicResponseController));

/**
 * @swagger
 * /api/surveys/{surveyId}/public-results:
 *   get:
 *     summary: Get public survey results
 *     description: Public endpoint to view curated survey responses and statistics
 *     tags: [Public Survey Results]
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *     responses:
 *       200:
 *         description: Successfully retrieved public survey results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     survey:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         question:
 *                           type: string
 *                         isPublished:
 *                           type: boolean
 *                         publishedAt:
 *                           type: string
 *                           format: date-time
 *                     responses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           isPositive:
 *                             type: boolean
 *                           decryptedAnswer:
 *                             type: string
 *                           commitmentHash:
 *                             type: string
 *                           publishedAt:
 *                             type: string
 *                             format: date-time
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalSelected:
 *                           type: integer
 *                         positiveCount:
 *                           type: integer
 *                         negativeCount:
 *                           type: integer
 *                         positiveRate:
 *                           type: number
 *                         negativeRate:
 *                           type: number
 *       404:
 *         description: Survey not found, not published, or public access not enabled
 *       500:
 *         description: Internal server error
 */
router.get('/survey/:surveyId/public-results', publicResponseController.getPublicSurveyResults.bind(publicResponseController));

export default router;
