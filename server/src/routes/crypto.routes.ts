import { Router } from 'express';
import { CryptoController } from '../controllers/crypto.controller';

const router = Router();
const cryptoController = new CryptoController();

// Generate blind signature for student's blinded message
router.post('/blind-sign/:surveyId', cryptoController.generateBlindSignature.bind(cryptoController));

// Verify commitment integrity
router.post('/verify-commitment', cryptoController.verifyCommitment.bind(cryptoController));

// Decrypt individual response
router.post('/decrypt-response', cryptoController.decryptResponse.bind(cryptoController));

// Get survey public keys
router.get('/public-keys/:surveyId', cryptoController.getSurveyPublicKeys.bind(cryptoController));

// Generate commitment for a message
router.post('/generate-commitment', cryptoController.generateCommitment.bind(cryptoController));

// Bulk verify commitments using Merkle tree
router.post('/bulk-verify-commitments', cryptoController.bulkVerifyCommitments.bind(cryptoController));

export default router; 