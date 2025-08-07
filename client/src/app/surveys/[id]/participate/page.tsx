'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { surveysApi } from '@/lib/api/surveys';
import { tokensApi } from '@/lib/api/tokens';
import { apiClient } from '@/lib/api/client';
import { CryptoUtils, StudentProof, uint8ArrayToBase64, base64ToUint8Array, arrayBufferToNumberArray } from '@/lib/crypto/blindSignatures';

interface SurveyData {
  id: string;
  title: string;
  description: string;
  question: string;
  blindSignaturePublicKey: string;
  encryptionPublicKey: string;
}

export default function SurveyParticipationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = params.id;
  const token = searchParams?.get('token') || null;
  const studentEmail = searchParams?.get('email') || null;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!token) {
      router.push('/surveys/token');
      return;
    }
    loadSurvey();
  }, [surveyId, token]);

  const loadSurvey = async () => {
    try {
      // Get survey details
      const surveyResponse = await surveysApi.getById(surveyId);
      const surveyData = surveyResponse.data;
      
      // Get survey public keys
      const keysResponse = await apiClient.get(`/surveys/${surveyId}/keys`);
      
      setSurvey({
        id: surveyData.id,
        title: surveyData.title,
        description: surveyData.description,
        question: surveyData.question || 'Please provide your response',
        blindSignaturePublicKey: keysResponse.data.blindSignaturePublicKey,
        encryptionPublicKey: keysResponse.data.encryptionPublicKey
      });
    } catch (err: any) {
      setError('Failed to load survey. Please try again.');
      console.error('Survey loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    if (!survey || !token) {
      setError('Missing survey or token information');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      // Step 1: Prepare message for blinding
      setCurrentStep(1);
      setProgress(20);
      const encodedMessage = new TextEncoder().encode(answer);
      
      // Step 2: Import public keys
      setCurrentStep(2);
      setProgress(30);
      const blindSignaturePublicKey = await CryptoUtils.importPublicKey(
        survey.blindSignaturePublicKey, 
        'blindSignature'
      );
      const encryptionPublicKey = await CryptoUtils.importPublicKey(
        survey.encryptionPublicKey, 
        'encryption'
      );

      // Step 3: Generate blinded message
      setCurrentStep(3);
      setProgress(40);
      const { blindedMsg, inv, preparedMsg } = await CryptoUtils.generateBlindedMessage(
        encodedMessage, 
        blindSignaturePublicKey
      );

      // Step 4: Send blinded message to school for signing
      setCurrentStep(4);
      setProgress(50);
      const signResponse = await apiClient.post(`/responses/blind-sign/${surveyId}`, {
        blindedMessage: uint8ArrayToBase64(blindedMsg),
        token
      });

      if (!signResponse.data.blindSignature) {
        throw new Error('Failed to get blind signature from school');
      }

      // Step 5: Finalize signature
      setCurrentStep(5);
      setProgress(60);
      const blindSignature = base64ToUint8Array(signResponse.data.blindSignature);
      const signature = await CryptoUtils.finalizeSignature(
        blindSignaturePublicKey,
        preparedMsg,
        blindSignature,
        inv
      );

      // Step 6: Verify signature
      setCurrentStep(6);
      setProgress(70);
      const isValid = await CryptoUtils.verifySignature(
        blindSignaturePublicKey,
        signature,
        preparedMsg
      );

      if (!isValid) {
        throw new Error('Signature verification failed');
      }

      // Step 7: Encrypt answer
      setCurrentStep(7);
      setProgress(80);
      const encryptedAnswer = await CryptoUtils.encryptAnswer(answer, encryptionPublicKey);

      // Step 8: Generate commitment (now async)
      const commitment = await CryptoUtils.generateCommitment(answer);

      // Step 9: Submit to blockchain via server
      setCurrentStep(8);
      setProgress(90);
      const submission = {
        surveyId,
        encryptedAnswer: arrayBufferToNumberArray(encryptedAnswer),
        commitment: commitment,
        userKeyJson: null // Use server-generated temporary keypair
      };

      const blockchainResponse = await apiClient.post('/responses/submit-to-blockchain', submission);

      // Step 10: Mark token as completed
      await tokensApi.markTokenAsCompleted(token);

      // Step 11: Generate and download proof
      setCurrentStep(9);
      setProgress(100);
      const proof: StudentProof = {
        surveyId,
        surveyAnswer: answer,
        preparedMsg,
        signature,
        commitment,
        timestamp: Date.now(),
        transactionSignature: blockchainResponse.data.transactionSignature,
        blindedMsg,
        inv,
        encryptedAnswer,
        blindSignature
      };

      downloadProof(proof);

      // Success - redirect to confirmation
      router.push(`/surveys/${surveyId}/completed?token=${token}`);

    } catch (err: any) {
      console.error('Submission error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to submit survey. Please try again.'
      );
    } finally {
      setSubmitting(false);
      setCurrentStep(1);
      setProgress(0);
    }
  };

  const downloadProof = (proof: StudentProof) => {
    const proofData = {
      // Survey Information
      surveyId: proof.surveyId,
      studentEmail,
      timestamp: proof.timestamp,
      transactionSignature: proof.transactionSignature,
      
      // User's Original Answer
      userAnswer: proof.surveyAnswer,
      
      // Cryptographic Proof Data
      cryptographicProof: {
        commitment: proof.commitment,
        signature: uint8ArrayToBase64(proof.signature),
        preparedMessage: uint8ArrayToBase64(proof.preparedMsg),
        blindedMessage: uint8ArrayToBase64(proof.blindedMsg),
        blindingInverse: uint8ArrayToBase64(proof.inv),
        blindSignature: uint8ArrayToBase64(proof.blindSignature)
      },
      
      // Verification Instructions
      verificationInstructions: {
        commitment: "Hash of your original answer - proves answer integrity",
        signature: "Finalized blind signature - proves school authorization without revealing identity",
        preparedMessage: "RSABSSA-prepared version of your answer for cryptographic operations",
        blindedMessage: "Your answer blinded for anonymous signing by school",
        blindingInverse: "Unblinding factor used to finalize the signature",
        blindSignature: "School's signature on your blinded message"
      },
      
      message: 'This is your complete anonymous survey participation proof with all cryptographic data and your original answer. Keep it safe as verification of your submission.'
    };

    const blob = new Blob([JSON.stringify(proofData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-proof-${surveyId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load survey</p>
          <button 
            onClick={() => router.push('/surveys/token')}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{survey.title}</h1>
            <p className="text-gray-600 mb-4">{survey.description}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                🔒 Your response will be completely anonymous and cryptographically protected.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              {survey.question}
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your response here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              disabled={submitting}
              required
            />
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {submitting && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  Step {currentStep}: {getStepDescription(currentStep)}
                </span>
                <span className="text-sm text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/surveys/token')}
              className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              disabled={submitting}
            >
              Go Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !answer.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {submitting ? 'Processing...' : 'Submit Response'}
            </button>
          </div>

          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">🔐 Cryptographic Process</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your answer will be encrypted before blockchain submission</li>
              <li>• A blind signature ensures anonymity while preventing fraud</li>
              <li>• You'll receive a cryptographic proof of participation</li>
              <li>• Results are verifiable but cannot be linked to individuals</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStepDescription(step: number): string {
  const steps = [
    'Preparing message',
    'Loading encryption keys', 
    'Generating blind signature',
    'Getting school signature',
    'Finalizing signature',
    'Verifying signature',
    'Encrypting response',
    'Submitting to blockchain',
    'Generating proof'
  ];
  return steps[step - 1] || 'Processing';
} 