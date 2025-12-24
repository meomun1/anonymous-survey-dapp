import { Router } from 'express';
import surveyRoutes from './survey.routes';
import tokenRoutes from './token.routes';
import authRoutes from './auth.routes';
import universityRoutes from './university.routes';
import campaignRoutes from './campaign.routes';
import analyticsRoutes from './analytics.routes';
import verificationRoutes from './verification.routes';
import responseRoutes from './response.routes';
import cryptoRoutes from './crypto.routes';

const router = Router();

router.use('/surveys', surveyRoutes);
router.use('/tokens', tokenRoutes);
router.use('/auth', authRoutes);
router.use('/responses', responseRoutes);
router.use('/crypto', cryptoRoutes);

// University scaling routes (new functionality)
router.use('/university', universityRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/analytics', analyticsRoutes);

// Verification routes (public - for students to verify commitments)
router.use('/', verificationRoutes);

export default router; 