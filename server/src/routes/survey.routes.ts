import { Router } from 'express';
import { SurveyController } from '../controllers/survey.controller';
import { publicResponseController } from '../controllers/publicResponse.controller';

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
 * /surveys/{id}/stats:
 *   get:
 *     summary: Get survey statistics
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
 *         description: Survey statistics
 *       404:
 *         description: Survey not found
 */
router.get('/:id/stats', surveyController.getSurveyStats.bind(surveyController));

/**
 * @swagger
 * /surveys/{id}/results:
 *   get:
 *     summary: Get survey results (published surveys only)
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
 *         description: Survey results
 *       400:
 *         description: Survey not yet published
 *       404:
 *         description: Survey not found
 */
router.get('/:id/results', surveyController.getSurveyResults.bind(surveyController));

/**
 * @swagger
 * /surveys/{id}/public-results:
 *   get:
 *     summary: Get curated public results for a published survey
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
 *         description: Public curated results
 *       404:
 *         description: Public results not available
 */
router.get('/:id/public-results', publicResponseController.getPublicSurveyResults.bind(publicResponseController));

/**
 * @swagger
 * /surveys/{id}/keys:
 *   get:
 *     summary: Get survey public keys for cryptographic operations
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
 *         description: Survey public keys
 *       404:
 *         description: Survey not found
 */
router.get('/:id/keys', surveyController.getSurveyPublicKeys.bind(surveyController));

/**
 * @swagger
 * /surveys/{id}/process-responses:
 *   post:
 *     summary: Process responses from blockchain
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
 *         description: Responses processed successfully
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Survey not found or no responses on blockchain
 */
router.post('/:id/process-responses', surveyController.processResponses.bind(surveyController));

/**
 * @swagger
 * /surveys/{id}/publish-with-proof:
 *   post:
 *     summary: Publish survey results with Merkle proof
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
 *         description: Survey published successfully
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Survey not found
 */
router.post('/:id/publish-with-proof', surveyController.publishSurveyWithMerkleProof.bind(surveyController));

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

export default router; 