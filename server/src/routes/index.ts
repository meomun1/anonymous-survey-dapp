import { Router } from 'express';
import surveyRoutes from './survey.routes';
import tokenRoutes from './token.routes';
import authRoutes from './auth.routes';

const router = Router();

router.use('/surveys', surveyRoutes);
router.use('/tokens', tokenRoutes);
router.use('/auth', authRoutes);

export default router; 