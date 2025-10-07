'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { surveysApi } from '@/lib/api/surveys';
import { tokensApi } from '@/lib/api/tokens';
import { apiClient } from '@/lib/api/client';
import { CryptoUtils, StudentProof, uint8ArrayToBase64, base64ToUint8Array, arrayBufferToNumberArray } from '@/lib/crypto/blindSignatures';
import { getTemplate, encodeAnswers, ANSWER_SCALE } from '@/lib/templates';

interface SurveyData {
  id: string;
  title: string;
  description: string;
  templateId: string;
  totalQuestions: number;
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
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);

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
      
      // Normalize survey data to handle both camelCase and snake_case from API
      const normalizedSurvey = {
        id: surveyData.id,
        title: surveyData.title,
        description: surveyData.description || '',
        templateId: surveyData.templateId || (surveyData as any).template_id || 'teaching_quality_25q',
        totalQuestions: surveyData.totalQuestions || (surveyData as any).total_questions || 25,
        blindSignaturePublicKey: keysResponse.data.blindSignaturePublicKey,
        encryptionPublicKey: keysResponse.data.encryptionPublicKey
      };
      
      console.log('Survey data:', surveyData);
      console.log('Normalized survey:', normalizedSurvey);
      
      setSurvey(normalizedSurvey);

      // Initialize answers array with default values (0 = not answered)
      const questionsCount = normalizedSurvey.totalQuestions;
      setAnswers(new Array(questionsCount).fill(0));
      
      console.log('Initialized answers array with', questionsCount, 'questions');
    } catch (err: any) {
      setError('Failed to load survey. Please try again.');
      console.error('Survey loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredQuestions = answers.filter(answer => answer === 0);
    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions. ${unansweredQuestions.length} questions remaining.`);
      return;
    }

    if (!survey || !token) {
      setError('Missing survey or token information');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      // Step 1: Encode answers into string format
      setCurrentStep(1);
      setProgress(20);
      const answerString = encodeAnswers(answers, survey.totalQuestions);
      const encodedMessage = new TextEncoder().encode(answerString);
      
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
      const encryptedAnswer = await CryptoUtils.encryptAnswer(answerString, encryptionPublicKey);

      // Step 8: Generate commitment (now async)
      const commitment = await CryptoUtils.generateCommitment(answerString);

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
        surveyAnswer: answerString,
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

  const handleAnswerChange = (questionIndex: number, answerValue: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerValue;
    setAnswers(newAnswers);
  };

  const getAnsweredCount = () => {
    return answers.filter(answer => answer !== 0).length;
  };

  const isAllAnswered = () => {
    return answers.every(answer => answer !== 0);
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

  const template = survey ? getTemplate(survey.templateId) : null;
  
  // Debug logging
  console.log('Survey:', survey);
  console.log('Template:', template);
  console.log('Answers array:', answers);

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
            <p className="text-gray-600 mb-3 text-sm">{survey.description}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                🔒 Your responses will be completely anonymous and cryptographically protected.
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress: {getAnsweredCount()}/{survey.totalQuestions} questions answered
              </span>
              <span className="text-sm text-gray-600">
                {Math.round((getAnsweredCount() / survey.totalQuestions) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getAnsweredCount() / survey.totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Answer Scale Legend */}
          <div className="mb-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-700 mb-2 text-center">Rating Scale:</div>
              <div className="flex justify-center gap-1">
                {ANSWER_SCALE.map((scale) => (
                  <div key={scale.value} className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center text-sm font-bold text-gray-600">
                      {scale.value}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center leading-tight w-16">
                      {scale.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="mb-4 flex justify-center">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setShowAllQuestions(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  !showAllQuestions 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                One by One
              </button>
              <button
                onClick={() => setShowAllQuestions(true)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  showAllQuestions 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Questions
              </button>
            </div>
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

          {/* Questions Display */}
          {template ? (
            <div className="mb-6">
              {showAllQuestions ? (
                // Show all questions
                <div className="space-y-6">
                  {template.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      questionNumber={index + 1}
                      answer={answers[index] || 0}
                      onAnswerChange={(value) => handleAnswerChange(index, value)}
                      disabled={submitting}
                    />
                  ))}
                </div>
              ) : (
                // Show one question at a time
                <div>
                  <QuestionCard
                    question={template.questions[currentQuestion]}
                    questionNumber={currentQuestion + 1}
                    totalQuestions={template.questions.length}
                    answer={answers[currentQuestion] || 0}
                    onAnswerChange={(value) => handleAnswerChange(currentQuestion, value)}
                    disabled={submitting}
                  />
                  
                  {/* Navigation */}
                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                      disabled={currentQuestion === 0 || submitting}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      Previous
                    </button>
                    <span className="flex items-center text-sm text-gray-600">
                      Question {currentQuestion + 1} of {template.questions.length}
                    </span>
                    <button
                      onClick={() => setCurrentQuestion(Math.min(template.questions.length - 1, currentQuestion + 1))}
                      disabled={currentQuestion === template.questions.length - 1 || submitting}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-center">
                <div className="text-red-600 text-lg font-semibold mb-2">Template Not Found</div>
                <p className="text-red-700 mb-4">
                  Could not load survey template: {survey?.templateId || 'Unknown'}
                </p>
                <div className="text-sm text-red-600 space-y-1">
                  <p>Survey ID: {survey?.id}</p>
                  <p>Template ID: {survey?.templateId}</p>
                  <p>Total Questions: {survey?.totalQuestions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/surveys/token')}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              disabled={submitting}
            >
              Go Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !isAllAnswered()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {submitting ? 'Processing...' : `Submit ${getAnsweredCount()} Answers`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// Question Card Component
interface QuestionCardProps {
  question: {
    id: number;
    text: string;
    category: string;
  };
  questionNumber: number;
  totalQuestions?: number;
  answer: number;
  onAnswerChange: (value: number) => void;
  disabled?: boolean;
}

function QuestionCard({ question, questionNumber, totalQuestions, answer, onAnswerChange, disabled }: QuestionCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Question Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
              {question.category}
            </span>
            <span className="text-xs text-gray-500">
              Q{questionNumber}{totalQuestions && `/${totalQuestions}`}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 leading-relaxed">
            {question.text}
          </h3>
        </div>
        
        {/* Answer Options - Simple Numbers */}
        <div className="flex gap-1 flex-shrink-0">
          {ANSWER_SCALE.map((scale) => (
            <label
              key={scale.value}
              className={`w-8 h-8 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center ${
                answer === scale.value
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={scale.value}
                checked={answer === scale.value}
                onChange={(e) => onAnswerChange(parseInt(e.target.value))}
                disabled={disabled}
                className="sr-only"
              />
              
              <span className="text-sm font-bold">
                {scale.value}
              </span>
            </label>
          ))}
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