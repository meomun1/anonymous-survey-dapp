'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  formatAnswerString,
  generateCommitment,
  encryptAnswerString,
  saveProofToSession,
  blindMessage,
  unblindSignature,
  uint8ArrayToHex,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  type SurveyProof
} from '@/lib/crypto-utils';
import { cryptoApi, type CampaignPublicKeys } from '@/lib/api/crypto';
import { getDefaultTemplate } from '@/lib/templates';

interface SurveyDetails {
  id: string;
  tokenId: string;
  token: string;
  courseCode: string;
  courseName: string;
  campaignName: string;
  campaignId: string;
  teacherId: string;
  teacherName?: string;
  numQuestions: number;
  used: boolean;
}

interface Question {
  id: number;
  text: string;
  category: string;
}

export default function TakeSurveyPage() {
  const [survey, setSurvey] = useState<SurveyDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;

  useEffect(() => {
    // Check if student has a valid token in session
    const sessionToken = sessionStorage.getItem('studentToken');
    if (!sessionToken) {
      router.push('/student');
      return;
    }

    loadSurvey();
  }, [surveyId, router]);

  const loadSurvey = async () => {
    try {
      setLoading(true);
      setError('');

      const sessionToken = sessionStorage.getItem('studentToken');
      if (!sessionToken) {
        router.push('/student');
        return;
      }

      const { apiClient } = await import('@/lib/api/client');

      // Get all surveys for this student token
      const response = await apiClient.post('/tokens/student-surveys', {
        token: sessionToken
      });

      if (response.data && response.data.surveys) {
        const surveys = response.data.surveys;

        // Find the specific survey by ID
        const surveyData = surveys.find((s: any) => s.id === surveyId);

        if (!surveyData) {
          setError('Survey not found');
          setSurvey(null);
          return;
        }

        setSurvey({
          id: surveyData.id,
          tokenId: surveyData.tokenId,
          token: surveyData.token,
          courseCode: surveyData.courseCode,
          courseName: surveyData.courseName,
          campaignName: surveyData.campaignName,
          campaignId: surveyData.campaignId,
          teacherId: surveyData.teacherId,
          teacherName: surveyData.teacherName,
          numQuestions: surveyData.numQuestions || 25,
          used: surveyData.used
        });

        // Check if already completed
        if (surveyData.used) {
          router.push(`/student/surveys/${surveyId}/completed`);
          return;
        }

        // Load questions from template
        const template = getDefaultTemplate();
        setQuestions(template.questions);
      } else {
        setError('No surveys found');
      }
    } catch (err: any) {
      console.error('Failed to load survey:', err);
      setError('Failed to load survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, score: number) => {
    setAnswers({
      ...answers,
      [questionId]: score
    });
  };

  const isComplete = () => {
    if (!survey) return false;
    for (let i = 1; i <= survey.numQuestions; i++) {
      if (!answers[i]) return false;
    }
    return true;
  };

  const handleSubmitClick = () => {
    if (!isComplete()) {
      setError('Please answer all questions before submitting');
      return;
    }
    setShowConfirmSubmit(true);
  };

  const handleSubmit = async () => {
    if (!survey || !isComplete()) return;

    try {
      setSubmitting(true);
      setError('');

      // Step 1: Prepare answers array
      const answersArray: number[] = [];
      for (let i = 1; i <= survey.numQuestions; i++) {
        answersArray.push(answers[i]);
      }

      // Step 2: Format answer string: "surveyId|courseCode|teacherId|12345..."
      const answerString = formatAnswerString(
        survey.id,
        survey.courseCode,
        survey.teacherId,
        answersArray
      );

      console.log('Answer string formatted:', answerString.substring(0, 50) + '...');

      // Step 3: Generate commitment (SHA-256 hash)
      const commitment = await generateCommitment(answerString);
      console.log('Commitment generated:', commitment);

      // Step 4: Get campaign public keys
      const publicKeysResponse = await cryptoApi.getCampaignPublicKeys(survey.campaignId);
      const publicKeys: CampaignPublicKeys = publicKeysResponse.data;
      console.log('Public keys retrieved');

      // Convert base64 public keys to ArrayBuffer
      const blindSignaturePublicKeyBuffer = base64ToArrayBuffer(publicKeys.blindSignaturePublicKey);
      const encryptionPublicKeyBuffer = base64ToArrayBuffer(publicKeys.encryptionPublicKey);

      // Step 5: Blind the answer string for signature
      const { blindedMsg, preparedMsg, inv } = await blindMessage(answerString, blindSignaturePublicKeyBuffer);
      const blindedMsgBase64 = arrayBufferToBase64(blindedMsg.buffer);
      console.log('Message blinded');

      // Step 6: Request blind signature from server
      const blindSignatureResponse = await cryptoApi.generateBlindSignature(
        survey.campaignId,
        { blindedMessage: blindedMsgBase64 }
      );
      const blindSignatureBase64 = blindSignatureResponse.data.blindSignature;
      console.log('Blind signature received from server');

      // Step 7: Unblind the signature
      const blindSignatureBuffer = base64ToArrayBuffer(blindSignatureBase64);
      const blindSignatureBytes = new Uint8Array(blindSignatureBuffer);
      const unblinedSignature = await unblindSignature(
        blindSignaturePublicKeyBuffer,
        preparedMsg,
        blindSignatureBytes,
        inv
      );
      const finalSignatureHex = uint8ArrayToHex(unblinedSignature);
      console.log('Signature unblinded');

      // Step 8: Encrypt answer string with RSA-OAEP
      const encryptedData = await encryptAnswerString(
        answerString,
        encryptionPublicKeyBuffer
      );
      console.log('Answer string encrypted');

      // Step 9: Save proof to localStorage
      const sessionToken = sessionStorage.getItem('studentToken');
      const proof: SurveyProof = {
        surveyId: survey.id,
        courseCode: survey.courseCode,
        courseName: survey.courseName,
        teacherId: survey.teacherId,
        teacherName: survey.teacherName,
        campaignId: survey.campaignId,
        campaignName: survey.campaignName,
        token: sessionToken || survey.token, // Store token for ownership tracking
        answerString,
        answers: answersArray,
        commitment,
        blindSignature: finalSignatureHex,
        encryptedData,
        timestamp: new Date().toISOString()
      };

      saveProofToSession(survey.id, proof);
      console.log('Proof saved to session');

      // Step 8: Store proof metadata for batch submission tracking
      const proofMetadata = JSON.parse(localStorage.getItem('proof_metadata') || '{}');
      proofMetadata[survey.id] = {
        campaignId: survey.campaignId,
        campaignName: survey.campaignName,
        token: survey.token,
        completed: true
      };
      localStorage.setItem('proof_metadata', JSON.stringify(proofMetadata));
      console.log('Proof metadata saved to localStorage');

      // Redirect to completion page (will show batch submit button if all surveys done)
      router.push(`/student/surveys/${surveyId}/completed`);

    } catch (err: any) {
      console.error('Failed to submit response:', err);
      setError(err.message || 'Failed to process your response. Please try again.');
      setShowConfirmSubmit(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading survey..." fullScreen />;
  }

  if (!survey) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">L</div>
        <h2 className="text-xl font-semibold text-white mb-2">Survey Not Found</h2>
        <Link
          href="/student/surveys"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Surveys
        </Link>
      </div>
    );
  }

  const progress = (Object.keys(answers).length / survey.numQuestions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/student/surveys"
              className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Surveys</span>
            </Link>
            <div className="text-right">
              <div className="text-white/80 text-sm">Progress</div>
              <div className="text-white font-bold text-xl">{Object.keys(answers).length} / {survey.numQuestions}</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4">
            <h1 className="text-2xl font-bold text-white mb-2">Course Evaluation</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-white/60">Course: </span>
                <span className="text-white font-semibold">{survey.courseCode} - {survey.courseName}</span>
              </div>
              <div>
                <span className="text-white/60">Campaign: </span>
                <span className="text-white font-semibold">{survey.campaignName}</span>
              </div>
              {survey.teacherName && (
                <div>
                  <span className="text-white/60">Instructor: </span>
                  <span className="text-white font-semibold">{survey.teacherName}</span>
                </div>
              )}
            </div>

            {/* Compact Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Table-Style Questions */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Rate Each Question</h2>
            <p className="text-white/90 text-sm mt-1">
              1 = Poor | 2 = Fair | 3 = Good | 4 = Great | 5 = Excellent
            </p>
          </div>

          <div className="p-6">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 mb-3 pb-3 border-b-2 border-gray-200 font-semibold text-gray-700 text-sm">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6">Question</div>
              <div className="col-span-5 text-center">Rating</div>
            </div>

            {/* Questions as compact rows */}
            <div className="space-y-2">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className={`grid grid-cols-12 gap-2 p-3 rounded-lg transition-all ${
                    answers[question.id]
                      ? 'bg-purple-50 border-l-4 border-purple-600'
                      : 'bg-gray-50 border-l-4 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {/* Question Number */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      answers[question.id]
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {question.id}
                    </div>
                  </div>

                  {/* Question Text with Category */}
                  <div className="col-span-6 flex items-center">
                    <div>
                      <p className="text-gray-800 text-sm font-medium">{question.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="bg-gray-200 px-2 py-0.5 rounded">{question.category}</span>
                      </p>
                    </div>
                  </div>

                  {/* Rating Buttons */}
                  <div className="col-span-5 flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => handleAnswerChange(question.id, score)}
                        className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                          answers[question.id] === score
                            ? 'bg-purple-600 text-white shadow-lg scale-110'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                        title={
                          score === 1 ? 'Poor' :
                          score === 2 ? 'Fair' :
                          score === 3 ? 'Good' :
                          score === 4 ? 'Great' :
                          'Excellent'
                        }
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button - Sticky at bottom */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {isComplete() ? (
                    <span className="text-green-600 font-semibold flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>All {survey.numQuestions} questions answered!</span>
                    </span>
                  ) : (
                    <span className="text-orange-600 font-semibold">
                      {survey.numQuestions - Object.keys(answers).length} question(s) remaining
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSubmitClick}
                  disabled={!isComplete() || submitting}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </span>
                  ) : (
                    'Submit Evaluation'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Confirm Submit Dialog */}
        <ConfirmDialog
          isOpen={showConfirmSubmit}
          onClose={() => !submitting && setShowConfirmSubmit(false)}
          onConfirm={handleSubmit}
          title="Submit Course Evaluation"
          message="Are you sure you want to submit this evaluation? Once submitted, you cannot change your answers. Your response will be encrypted and stored on the blockchain."
          confirmText={submitting ? 'Processing...' : 'Confirm & Submit'}
          type="info"
        />
      </div>
    </div>
  );
}
