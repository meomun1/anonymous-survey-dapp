import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();
const analyticsController = new AnalyticsController();

// ============================================================================
// MERKLE TREE CALCULATION ROUTES
// ============================================================================

/**
 * @swagger
 * /analytics/merkle/calculate-root:
 *   post:
 *     summary: Calculate Merkle root from commitments
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commitments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Hex commitments
 *     responses:
 *       200:
 *         description: Merkle root
 */
router.post('/merkle/calculate-root', analyticsController.calculateMerkleRoot);

/**
 * @swagger
 * /analytics/merkle/calculate-final-root:
 *   post:
 *     summary: Calculate final Merkle root from campaign roots
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               campaignRoots:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Final Merkle root
 */
router.post('/merkle/calculate-final-root', analyticsController.calculateFinalMerkleRoot);

/**
 * @swagger
 * /analytics/merkle/generate-proof:
 *   post:
 *     summary: Generate Merkle proof for a commitment
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commitments:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetCommitment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Merkle proof
 */
router.post('/merkle/generate-proof', analyticsController.generateMerkleProof);

/**
 * @swagger
 * /analytics/merkle/verify-proof:
 *   post:
 *     summary: Verify Merkle proof
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commitment:
 *                 type: string
 *               proof:
 *                 type: array
 *               root:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
router.post('/merkle/verify-proof', analyticsController.verifyMerkleProof);

/**
 * @swagger
 * /analytics/merkle/{campaignId}/calculate-root:
 *   post:
 *     summary: Calculate Merkle root for all responses in a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Merkle root data with metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaignId:
 *                   type: string
 *                 merkleRoot:
 *                   type: string
 *                 totalCommitments:
 *                   type: number
 *                 calculatedAt:
 *                   type: string
 */
router.post('/merkle/:campaignId/calculate-root', analyticsController.calculateCampaignMerkleRoot);

/**
 * @swagger
 * /analytics/merkle/{campaignId}/root:
 *   get:
 *     summary: Get saved Merkle root for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Saved Merkle root data
 */
router.get('/merkle/:campaignId/root', analyticsController.getCampaignMerkleRoot);

// ============================================================================
// CAMPAIGN ANALYTICS ROUTES
// ============================================================================

/**
 * @swagger
 * /analytics/campaigns/{campaignId}/analytics:
 *   post:
 *     summary: Generate campaign analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics payload
 */
router.post('/campaigns/:campaignId/analytics', analyticsController.generateCampaignAnalytics);

// ============================================================================
// TEACHER PERFORMANCE ROUTES
// ============================================================================

/**
 * @swagger
 * /analytics/teachers/{teacherId}/performance:
 *   get:
 *     summary: Get teacher performance analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: campaignIds
 *         schema:
 *           type: string
 *         description: Comma-separated campaign IDs
 *     responses:
 *       200:
 *         description: Teacher performance
 */
router.get('/teachers/:teacherId/performance', analyticsController.getTeacherPerformance);

/**
 * @swagger
 * /analytics/teachers/{teacherId}/verify-performance:
 *   post:
 *     summary: Verify teacher performance against blockchain
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: teacherId
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
 *               campaignId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification result
 */
router.post('/teachers/:teacherId/verify-performance', analyticsController.verifyTeacherPerformance);

// ============================================================================
// STUDENT COMPLETION ROUTES
// ============================================================================

/**
 * @swagger
 * /analytics/campaigns/{campaignId}/student-completion:
 *   post:
 *     summary: Generate student completion data for a campaign
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Completion data
 */
router.post('/campaigns/:campaignId/student-completion', analyticsController.generateStudentCompletion);

/**
 * @swagger
 * /analytics/students/{studentEmail}/campaigns/{campaignId}/completion:
 *   get:
 *     summary: Get student completion data
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: studentEmail
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Completion row
 */
router.get('/students/:studentEmail/campaigns/:campaignId/completion', analyticsController.getStudentCompletion);

// ============================================================================
// UNIVERSITY-WIDE ANALYTICS ROUTES
// ============================================================================

/**
 * @swagger
 * /analytics/university:
 *   get:
 *     summary: Get university-wide analytics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Analytics payload
 */
router.get('/university', analyticsController.getUniversityAnalytics);

/**
 * @swagger
 * /analytics/schools/{schoolId}:
 *   get:
 *     summary: Get school analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics payload
 */
router.get('/schools/:schoolId', analyticsController.getSchoolAnalytics);

// ============================================================================
// ACCREDITATION DATA ROUTES
// ============================================================================

/**
 * @swagger
 * /analytics/teachers/{teacherId}/accreditation-data:
 *   post:
 *     summary: Generate accreditation data for a teacher
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: teacherId
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
 *               campaignIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Accreditation payload
 */
router.post('/teachers/:teacherId/accreditation-data', analyticsController.generateAccreditationData);

export default router;
