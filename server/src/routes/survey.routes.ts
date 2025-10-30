import { Router } from 'express';
import { SurveyController } from '../controllers/survey.controller';

const router = Router();
const surveyController = new SurveyController();

/**
 * @swagger
 * /surveys:
 *   get:
 *     summary: Get all surveys
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of surveys
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.get('/', surveyController.getAllSurveys.bind(surveyController));

/**
 * @swagger
 * /surveys:
 *   post:
 *     summary: Create a new survey
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - question
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Course Feedback Survey"
 *               description:
 *                 type: string
 *                 example: "Anonymous feedback for CS101"
 *               question:
 *                 type: string
 *                 example: "How would you rate this course?"
 *     responses:
 *       201:
 *         description: Survey created successfully
 *       401:
 *         description: Unauthorized - JWT token required
 */
router.post('/', surveyController.createSurvey.bind(surveyController));

/**
 * @swagger
 * /surveys/{id}:
 *   put:
 *     summary: Update a survey
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               question:
 *                 type: string
 *     responses:
 *       200:
 *         description: Survey updated successfully
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Survey not found
 */
router.put('/:id', surveyController.updateSurvey.bind(surveyController));

/**
 * @swagger
 * /surveys/{id}:
 *   get:
 *     summary: Get a specific survey
 *     tags: [Surveys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *     responses:
 *       200:
 *         description: Survey details
 *       404:
 *         description: Survey not found
 */
router.get('/:id', surveyController.getSurvey.bind(surveyController));

/**
 * @swagger
 * /surveys/{id}:
 *   delete:
 *     summary: Delete a survey and all related data
 *     tags: [Surveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Survey ID
 *     responses:
 *       200:
 *         description: Survey deleted successfully
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Survey not found
 */
router.delete('/:id', surveyController.deleteSurvey.bind(surveyController));

/**
 * @swagger
 * /surveys/campaign/{campaignId}:
 *   get:
 *     summary: Get surveys under a campaign
 *     tags: [Surveys]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of surveys
 */
router.get('/campaign/:campaignId', surveyController.getSurveysByCampaign.bind(surveyController));
/**
 * @swagger
 * /surveys/token/{token}:
 *   get:
 *     summary: Get eligible surveys for a campaign token
 *     tags: [Surveys]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of eligible surveys
 */
router.get('/token/:token', surveyController.getSurveysForToken.bind(surveyController));

export default router; 