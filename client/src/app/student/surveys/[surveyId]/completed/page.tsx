'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import {
  getAllProofsFromSession,
  generateProofFile,
  downloadProofFile,
  getProofFromSession,
  cleanupInvalidProofs,
  markBlockchainSubmitted,
  getBlockchainSubmission,
  autoCleanupAfterSubmission,
  type SurveyProof
} from '@/lib/crypto-utils';
import { responsesApi, type StudentResponse } from '@/lib/api/responses';

interface SurveyDetails {
  id: string;
  courseCode: string;
  courseName: string;
  campaignName: string;
  campaignId: string;
  token: string;
}

interface Survey {
  id: string;
  courseCode: string;
  used: boolean;
}

export default function SurveyCompletedPage() {
  const [survey, setSurvey] = useState<SurveyDetails | null>(null);
  const [currentProof, setCurrentProof] = useState<SurveyProof | null>(null);
  const [allSurveys, setAllSurveys] = useState<Survey[]>([]);
  const [allComplete, setAllComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [transactionHash, setTransactionHash] = useState('');

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

    // Auto-cleanup proofs if 5 minutes passed since blockchain submission
    autoCleanupAfterSubmission(5);

    // Clean up any invalid proofs from localStorage
    const removed = cleanupInvalidProofs();
    if (removed > 0) {
      console.log(`Cleaned up ${removed} invalid proof(s) from localStorage`);
    }

    loadData();
  }, [surveyId, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const sessionToken = sessionStorage.getItem('studentToken');
      if (!sessionToken) {
        router.push('/student');
        return;
      }

      // Check if already submitted to blockchain
      const submission = getBlockchainSubmission(sessionToken);
      if (submission) {
        setSubmitted(true);
        setTransactionHash(submission.transactionHash);

        // For submitted surveys, we can still show the proof if it exists
        const proof = getProofFromSession(surveyId);
        if (proof) {
          setCurrentProof(proof);
          setSurvey({
            id: surveyId,
            courseCode: proof.courseCode,
            courseName: proof.courseName,
            campaignName: proof.campaignName || 'Campaign',
            campaignId: proof.campaignId || '',
            token: sessionToken
          });
        }

        // Skip loading surveys since already submitted
        setLoading(false);
        return;
      }

      // Get proof from session
      const proof = getProofFromSession(surveyId);
      if (proof) {
        setCurrentProof(proof);
      }

      // Get proof metadata
      const proofMetadata = JSON.parse(localStorage.getItem('proof_metadata') || '{}');
      const currentMetadata = proofMetadata[surveyId];

      if (currentMetadata) {
        setSurvey({
          id: surveyId,
          courseCode: proof?.courseCode || '',
          courseName: proof?.courseName || '',
          campaignName: currentMetadata.campaignName,
          campaignId: currentMetadata.campaignId,
          token: currentMetadata.token
        });
      } else if (proof) {
        // Fallback: Use proof data directly if metadata is missing
        console.log('proof_metadata missing, using proof data as fallback');
        setSurvey({
          id: surveyId,
          courseCode: proof.courseCode || '',
          courseName: proof.courseName || '',
          campaignName: proof.campaignName || 'Campaign',
          campaignId: proof.campaignId || '',
          token: sessionToken
        });
      }

      // Get all surveys to check if all are complete
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.post('/tokens/student-surveys', {
        token: sessionToken
      });

      if (response.data && response.data.surveys) {
        const surveys = response.data.surveys;
        setAllSurveys(surveys);

        // Check if all surveys are completed (have proofs in sessionStorage)
        // Note: s.used means already submitted to blockchain, so we don't need a proof for those
        const allProofs = getAllProofsFromSession();

        const allDone = surveys.every((s: Survey) => {
          // If already marked as used in DB, it's done
          if (s.used) return true;
          // Otherwise check if we have a proof in sessionStorage
          return allProofs.some(p => p.surveyId === s.id);
        });
        setAllComplete(allDone);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Failed to load survey details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!survey || !allComplete) return;

    try {
      setSubmitting(true);
      setError('');

      // Get all proofs from session
      const allProofs = getAllProofsFromSession();

      if (allProofs.length === 0) {
        setError('No survey responses found to submit');
        return;
      }

      console.log(`Found ${allProofs.length} proofs in sessionStorage`);
      console.log('Proofs:', allProofs.map(p => ({
        surveyId: p.surveyId,
        courseCode: p.courseCode,
        hasCommitment: !!p.commitment,
        hasEncryptedData: !!p.encryptedData,
        commitmentLength: p.commitment?.length,
        encryptedDataLength: p.encryptedData?.length
      })));

      // Filter out invalid proofs (missing required fields)
      const validProofs = allProofs.filter(proof => {
        const isValid = !!(proof.surveyId && proof.commitment && proof.encryptedData);
        if (!isValid) {
          console.warn('Skipping invalid proof:', {
            surveyId: proof.surveyId,
            courseCode: proof.courseCode,
            hasCommitment: !!proof.commitment,
            hasEncryptedData: !!proof.encryptedData
          });
        }
        return isValid;
      });

      if (validProofs.length === 0) {
        setError('No valid survey responses found to submit');
        return;
      }

      console.log(`Submitting ${validProofs.length} valid survey responses to blockchain...`);

      // Prepare batch submission data
      const responses: StudentResponse[] = validProofs.map(proof => ({
        surveyId: proof.surveyId,
        encryptedData: proof.encryptedData,
        commitment: proof.commitment
      }));

      // Submit to blockchain
      const result = await responsesApi.submitStudentResponses({
        token: survey.token,
        responses
      });

      if (result.data.success) {
        const txHash = result.data.transactionHash;
        setTransactionHash(txHash);
        setSubmitted(true);

        // Mark submission with timestamp for auto-cleanup
        markBlockchainSubmitted(txHash);

        console.log('Successfully submitted to blockchain:', txHash);
      } else {
        setError('Failed to submit to blockchain. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to submit batch:', err);
      setError(err.response?.data?.error || err.message || 'Failed to submit to blockchain. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadProof = () => {
    if (!survey) return;

    try {
      // Get all proofs
      const allProofs = getAllProofsFromSession();

      if (allProofs.length === 0) {
        setError('No proofs found to download');
        return;
      }

      // Generate proof file
      const proofFile = generateProofFile(
        survey.token,
        survey.campaignId,
        survey.campaignName,
        transactionHash,
        allProofs
      );

      // Download
      downloadProofFile(proofFile);

      console.log('Proof file downloaded successfully');
    } catch (err: any) {
      console.error('Failed to download proof:', err);
      setError('Failed to generate proof file. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading confirmation..." fullScreen />;
  }

  if (!survey || !currentProof) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📋</div>
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

  // Count only proofs for surveys in the current token (not all proofs)
  const allProofs = getAllProofsFromSession();
  const completedCount = allSurveys.filter((s: Survey) =>
    allProofs.some(p => p.surveyId === s.id)
  ).length;
  const totalCount = allSurveys.length;

  return (
    <div className="max-w-4xl mx-auto">
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-block p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6">
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Survey Completed!</h1>
        <p className="text-xl text-white/80">
          Your response has been processed and encrypted
        </p>
      </div>

      {/* Survey Details */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8 mb-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Survey Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-white/60 text-sm mb-1">Course</div>
            <div className="text-white font-semibold text-lg">{survey.courseCode}</div>
            <div className="text-white/80">{survey.courseName}</div>
          </div>
          <div>
            <div className="text-white/60 text-sm mb-1">Campaign</div>
            <div className="text-white font-semibold text-lg">{survey.campaignName}</div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/20">
          <div className="text-white/60 text-sm mb-1">Commitment Hash (Proof)</div>
          <div className="bg-white/10 rounded-lg p-3 mt-2">
            <code className="text-white/90 text-xs break-all font-mono">
              {currentProof.commitment}
            </code>
          </div>
        </div>
      </div>

      {/* Progress */}
      {!submitted && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Survey Progress</h3>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 font-medium">Completed Surveys</span>
              <span className="text-gray-900 font-bold text-lg">{completedCount} / {totalCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allComplete
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              ></div>
            </div>
          </div>

          {allComplete ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-lg font-semibold text-green-900 mb-2">All Surveys Complete!</h4>
                  <p className="text-sm text-green-800 mb-4">
                    You've completed all {totalCount} survey(s). You can now submit your responses to the blockchain.
                  </p>
                  <button
                    onClick={handleBatchSubmit}
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? 'Submitting to Blockchain...' : 'Submit All to Blockchain'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div>
                  <p className="text-sm text-yellow-800">
                    Complete all {totalCount} surveys before submitting to the blockchain. You have {totalCount - completedCount} survey(s) remaining.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blockchain Submission Success */}
      {submitted && (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
              <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Submitted to Blockchain!</h3>
            <p className="text-gray-600">Your responses have been securely stored on the blockchain</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="text-sm text-gray-600 mb-2">Transaction Hash</div>
            <div className="bg-white border border-gray-300 rounded p-3">
              <code className="text-sm text-gray-800 break-all font-mono">
                {transactionHash}
              </code>
            </div>
          </div>

          <button
            onClick={handleDownloadProof}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Proof File (JSON)</span>
          </button>

          <p className="text-sm text-gray-600 text-center mt-4">
            Download this proof file to verify your responses were included in the final results
          </p>
        </div>
      )}



      {/* Actions */}
      <div className="flex items-center justify-center space-x-4">
        <Link
          href="/student/surveys"
          className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all duration-200"
        >
          {allComplete ? 'View All Surveys' : 'Continue to Next Survey'}
        </Link>
      </div>

      {/* Privacy Notice */}
      <div className="mt-8 text-center">
        <p className="text-white/60 text-sm">
          🔒 Your responses are completely anonymous and encrypted. Thank you for your honest feedback!
        </p>
      </div>

    </div>
  );
}
