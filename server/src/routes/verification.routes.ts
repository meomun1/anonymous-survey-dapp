import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller';

const router = Router();

/**
 * @swagger
 * /api/campaigns/{id}/verification:
 *   get:
 *     summary: Get campaign verification data
 *     description: Public endpoint to get campaign Merkle roots and verification status
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign verification data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaignId:
 *                   type: string
 *                 campaignName:
 *                   type: string
 *                 responsesMerkleRoot:
 *                   type: string
 *                   nullable: true
 *                 claimedReceiptsRoot:
 *                   type: string
 *                   nullable: true
 *                 totalResponses:
 *                   type: number
 *                 totalClaimed:
 *                   type: number
 *                 blockchainClosed:
 *                   type: boolean
 *                 canVerifyResponses:
 *                   type: boolean
 *                 canVerifyParticipation:
 *                   type: boolean
 *       404:
 *         description: Campaign not found
 */
router.get(
  '/campaigns/:id/verification',
  verificationController.getCampaignVerificationData.bind(verificationController)
);

/**
 * @swagger
 * /api/verification/response:
 *   post:
 *     summary: Verify a response commitment in Tree #1
 *     description: Verifies that a response commitment is included in the published Merkle tree
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - commitment
 *             properties:
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID
 *               commitment:
 *                 type: string
 *                 description: Response commitment hash (hex string)
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 commitment:
 *                   type: string
 *                 merkleRoot:
 *                   type: string
 *                 proof:
 *                   type: object
 *                   properties:
 *                     commitment:
 *                       type: string
 *                     siblings:
 *                       type: array
 *                       items:
 *                         type: string
 *                     index:
 *                       type: number
 *                     root:
 *                       type: string
 *       400:
 *         description: Invalid request or Merkle root not published
 */
router.post(
  '/verification/response',
  verificationController.verifyResponseCommitment.bind(verificationController)
);

/**
 * @swagger
 * /api/verification/participation:
 *   post:
 *     summary: Verify a participation claim in Tree #2
 *     description: Verifies that a participation receipt hash is included in the published Merkle tree
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - receiptHash
 *             properties:
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID
 *               receiptHash:
 *                 type: string
 *                 description: Participation receipt hash (hex string)
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isValid:
 *                   type: boolean
 *                 commitment:
 *                   type: string
 *                 merkleRoot:
 *                   type: string
 *                 proof:
 *                   type: object
 *       400:
 *         description: Invalid request or Merkle root not published
 */
router.post(
  '/verification/participation',
  verificationController.verifyParticipationClaim.bind(verificationController)
);

/**
 * @swagger
 * /api/verification/response/proof:
 *   get:
 *     summary: Get Merkle proof for a response commitment
 *     description: Returns the Merkle proof that can be used to verify a response commitment
 *     tags: [Verification]
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: commitment
 *         required: true
 *         schema:
 *           type: string
 *         description: Response commitment hash (hex string)
 *     responses:
 *       200:
 *         description: Merkle proof
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commitment:
 *                   type: string
 *                 siblings:
 *                   type: array
 *                   items:
 *                     type: string
 *                 index:
 *                   type: number
 *                 root:
 *                   type: string
 */
router.get(
  '/verification/response/proof',
  verificationController.getResponseProof.bind(verificationController)
);

/**
 * @swagger
 * /api/verification/participation/proof:
 *   get:
 *     summary: Get Merkle proof for a participation claim
 *     description: Returns the Merkle proof that can be used to verify a participation claim
 *     tags: [Verification]
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: receiptHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Participation receipt hash (hex string)
 *     responses:
 *       200:
 *         description: Merkle proof
 */
router.get(
  '/verification/participation/proof',
  verificationController.getParticipationProof.bind(verificationController)
);

export default router;
