import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const campaignController = new CampaignController();

// ============================================================================
// CAMPAIGN CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - semesterId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Fall 2024 Quality Survey"
 *               type:
 *                 type: string
 *                 enum: [course, event]
 *                 example: "course"
 *               semesterId:
 *                 type: string
 *                 example: "sem_001"
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *                 semesterId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', verifyToken, requireAdmin, campaignController.createCampaign);

/**
 * @swagger
 * /campaigns:
 *   get:
 *     summary: List campaigns
 *     tags: [Campaigns]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, teachers_input, open, closed, published]
 *         description: Filter by campaign status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [course, event]
 *         description: Filter by campaign type
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: string
 *         description: Filter by semester ID
 *     responses:
 *       200:
 *         description: Campaigns
 */
router.get('/', campaignController.getCampaigns);

/**
 * @swagger
 * /campaigns/{id}:
 *   get:
 *     summary: Get campaign details
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign
 */
router.get('/:id', campaignController.getCampaign);

/**
 * @swagger
 * /campaigns/{id}:
 *   put:
 *     summary: Update a campaign
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign updated
 */
router.put('/:id', campaignController.updateCampaign);

/**
 * @swagger
 * /campaigns/{id}:
 *   delete:
 *     summary: Delete a campaign
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign deleted
 */
router.delete('/:id', campaignController.deleteCampaign);

// ============================================================================
// CAMPAIGN WORKFLOW ROUTES
// ============================================================================

/**
 * @swagger
 * /campaigns/{id}/open:
 *   post:
 *     summary: Open campaign for teacher input
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign opened
 */
router.post('/:id/open', campaignController.openCampaign);

/**
 * @swagger
 * /campaigns/{id}/close:
 *   post:
 *     summary: Close campaign for teacher input
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Campaign closed
 */
router.post('/:id/close', campaignController.closeCampaign);

/**
 * @swagger
 * /campaigns/{id}/launch:
 *   post:
 *     summary: Launch campaign (generate surveys and tokens, send emails)
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Launch summary
 */
router.post('/:id/launch', campaignController.launchCampaign);

/**
 * @swagger
 * /campaigns/{id}/publish:
 *   post:
 *     summary: Publish campaign results
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               merkleRoot:
 *                 type: string
 *     responses:
 *       200:
 *         description: Published
 */
router.post('/:id/publish', campaignController.publishCampaign);

// ============================================================================
// CAMPAIGN SURVEY MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /campaigns/{id}/surveys:
 *   get:
 *     summary: Get surveys for a campaign
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Surveys
 */
router.get('/:id/surveys', campaignController.getCampaignSurveys);

/**
 * @swagger
 * /campaigns/{id}/surveys/from-assignments:
 *   post:
 *     summary: Create surveys from assignments
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Surveys created
 */
router.post('/:id/surveys/from-assignments', campaignController.createSurveysFromAssignments);

// ============================================================================
// CAMPAIGN ANALYTICS ROUTES
// ============================================================================

/**
 * @swagger
 * /campaigns/{id}/stats:
 *   get:
 *     summary: Get campaign statistics
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stats
 */
router.get('/:id/stats', campaignController.getCampaignStats);

/**
 * @swagger
 * /campaigns/{id}/analytics:
 *   get:
 *     summary: Get campaign analytics
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics
 */
router.get('/:id/analytics', campaignController.getCampaignAnalytics);

export default router;
