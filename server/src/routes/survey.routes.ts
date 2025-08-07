import { Router } from 'express';
import { SurveyController } from '../controllers/survey.controller';

const router = Router();
const surveyController = new SurveyController();

// Get all surveys
router.get('/', surveyController.getAllSurveys.bind(surveyController));

// Create a new survey
router.post('/', surveyController.createSurvey.bind(surveyController));

// Get a specific survey
router.get('/:id', surveyController.getSurvey.bind(surveyController));

// Get survey statistics
router.get('/:id/stats', surveyController.getSurveyStats.bind(surveyController));

// Get survey results (for published surveys)
router.get('/:id/results', surveyController.getSurveyResults.bind(surveyController));

// Get survey public keys
router.get('/:id/keys', surveyController.getSurveyPublicKeys.bind(surveyController));

// Publish a survey with automatic Merkle proof generation
router.post('/:id/publish-with-proof', surveyController.publishSurveyWithMerkleProof.bind(surveyController));

// Delete a survey
router.delete('/:id', surveyController.deleteSurvey.bind(surveyController));

export default router; 