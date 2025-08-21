import { Router } from 'express';
import { TokenController } from '../controllers/token.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const tokenController = new TokenController();

// Generate tokens for multiple students (admin only)
router.post('/batch-generate', verifyToken, requireAdmin, tokenController.generateBatchTokens.bind(tokenController));

// Validate a token
router.get('/validate/:token', tokenController.validateToken.bind(tokenController));

// Mark token as used
router.post('/:token/use', tokenController.markTokenAsUsed.bind(tokenController));

// Mark token as completed
router.post('/:token/complete', tokenController.markTokenAsCompleted.bind(tokenController));

// Get all tokens for a survey
router.get('/survey/:surveyId', tokenController.getSurveyTokens.bind(tokenController));

// Test email service (admin only)
router.get('/test-email', verifyToken, requireAdmin, tokenController.testEmailService.bind(tokenController));

export default router; 