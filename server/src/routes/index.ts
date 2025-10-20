import { Router } from 'express';
import surveyRoutes from './survey.routes';
import tokenRoutes from './token.routes';
import authRoutes from './auth.routes';
import universityRoutes from './university.routes';
import campaignRoutes from './campaign.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/surveys', surveyRoutes);
router.use('/tokens', tokenRoutes);
router.use('/auth', authRoutes);

// University scaling routes (new functionality)
router.use('/university', universityRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/analytics', analyticsRoutes);

export default router; 