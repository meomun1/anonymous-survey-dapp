import { Router } from 'express';
import { ResponseController } from '../controllers/response.controller';

const router = Router();
const responseController = new ResponseController();

// Generate blind signature for student (the only server-side crypto operation needed)
router.post('/blind-sign/:surveyId', responseController.generateBlindSignature.bind(responseController));

// Submit encrypted response to blockchain
router.post('/submit-to-blockchain', responseController.submitToBlockchain.bind(responseController));

// Decrypt all responses for a survey (admin use)
router.post('/decrypt-all/:surveyId', responseController.decryptAllResponses.bind(responseController));

// Get all responses for a survey (admin use)
router.get('/survey/:surveyId', responseController.getSurveyResponses.bind(responseController));

// Get response by commitment hash
router.get('/commitment/:commitmentHash', responseController.getResponseByCommitmentHash.bind(responseController));

// Get response statistics for a survey
router.get('/stats/:surveyId', responseController.getResponseStats.bind(responseController));

// Verify response integrity
router.get('/verify/:responseId', responseController.verifyResponseIntegrity.bind(responseController));

export default router; 