'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import {
  generateReceipt,
  blindReceipt,
  unblindSignature,
  verifyBlindSignature,
  uint8ArrayToBase64,
  base64ToUint8Array
} from '@/lib/crypto/blindSignatures';
import { CryptoUtils } from '@/lib/crypto/blindSignatures';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface CompletedResponse {
  surveyId: string;
  courseCode: string;
  teacherId: string;
  encryptedAnswer: number[];
  commitment: string;
  timestamp: number;
}

export default function SubmitAllPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [completedResponses, setCompletedResponses] = useState<CompletedResponse[]>([]);
  const [surveyCount, setSurveyCount] = useState(0);
  const [campaignId, setCampaignId] = useState('');
  const [authorizationFile, setAuthorizationFile] = useState<File | null>(null);
  const [authorizationData, setAuthorizationData] = useState<{
    preparedToken: string;
    tokenSignature: string;
  } | null>(null);

  const router = useRouter();

  useEffect(() => {
    // Load completed responses from sessionStorage
    const responsesData = sessionStorage.getItem('completedResponses');
    if (!responsesData) {
      setError('No completed surveys found');
      return;
    }

    try {
      const responses = JSON.parse(responsesData);
      setCompletedResponses(responses);
      setSurveyCount(responses.length);

      // Load campaignId from sessionStorage
      const sessionCampaignId = sessionStorage.getItem('campaignId');
      if (sessionCampaignId) {
        setCampaignId(sessionCampaignId);
      }
    } catch (err) {
      console.error('Failed to parse responses:', err);
      setError('Failed to load responses');
    }
  }, []);

  const handleAuthorizationFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate authorization file structure
      if (!data.preparedToken || !data.tokenSignature) {
        throw new Error('Invalid authorization file format');
      }

      setAuthorizationFile(file);
      setAuthorizationData({
        preparedToken: data.preparedToken,
        tokenSignature: data.tokenSignature
      });
      setError('');
    } catch (err: any) {
      setError('Failed to read authorization file. Please ensure it\'s a valid survey-authorization.json file.');
      setAuthorizationFile(null);
      setAuthorizationData(null);
    }
  };

  const handleSubmit = async () => {
    if (completedResponses.length === 0) {
      setError('No surveys to submit');
      return;
    }

    if (!authorizationData) {
      setError('Please upload your authorization file');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');

      // Get session data (safe data only)
      const sessionCampaignId = sessionStorage.getItem('campaignId');
      const ticketCommitment = sessionStorage.getItem('ticketCommitment');
      const blindSignaturePublicKeyBase64 = sessionStorage.getItem('blindSignaturePublicKey');

      if (!sessionCampaignId || !ticketCommitment || !blindSignaturePublicKeyBase64) {
        throw new Error('Missing session data. Please login again.');
      }

      // Get authorization credentials from uploaded file
      const preparedTokenBase64 = authorizationData.preparedToken;
      const tokenSignatureBase64 = authorizationData.tokenSignature;

      // Store campaignId in state for later use
      setCampaignId(sessionCampaignId);

      console.log('Phase 3: Submitting batch responses...');

      // Step 1: Generate random receipt R
      const receiptR = generateReceipt();
      console.log('✓ Generated random receipt R');

      // Step 2: Import blind signature public key
      const publicKey = await CryptoUtils.importPublicKey(blindSignaturePublicKeyBase64, 'blindSignature');
      console.log('✓ Imported public key');

      // Step 3: Blind the receipt
      const { blindedMsg, inv, preparedReceipt } = await blindReceipt(receiptR, publicKey);
      console.log('✓ Receipt blinded');

      // Step 4: Prepare authorization header with token signature
      const authToken = `${preparedTokenBase64}.${tokenSignatureBase64}`;

      // Step 5: Submit batch to server
      console.log(`Submitting ${completedResponses.length} responses...`);
      const response = await apiClient.post('/responses/submit-batch', {
        campaignId: sessionCampaignId,
        responses: completedResponses,
        ticketCommitment,
        blindedReceipt: uint8ArrayToBase64(blindedMsg)
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      console.log('✓ Server accepted batch submission');

      // Step 6: Unblind the receipt signature
      const blindReceiptSignature = base64ToUint8Array(response.data.blindSignature);
      const receiptSignature = await unblindSignature(
        publicKey,
        preparedReceipt,
        blindReceiptSignature,
        inv
      );
      console.log('✓ Receipt signature unblinded');

      // Step 7: Verify receipt signature
      const isValid = await verifyBlindSignature(publicKey, receiptSignature, preparedReceipt);
      if (!isValid) {
        throw new Error('Receipt signature verification failed!');
      }
      console.log('✓ Receipt signature verified');

      // Step 8: Receipt data is stored in downloaded file only (not in browser storage for security)
      const preparedReceiptBase64 = uint8ArrayToBase64(preparedReceipt);
      const receiptSignatureBase64 = uint8ArrayToBase64(receiptSignature);

      // Step 9: Calculate receipt hash for participation verification
      // Matches database trigger: SHA-256(prepared_receipt || receipt_signature) as hex
      console.log('✓ Calculating receipt hash for participation verification...');
      const receiptHashConcatenated = preparedReceiptBase64 + receiptSignatureBase64;
      const receiptHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(receiptHashConcatenated));
      const receiptHashArray = new Uint8Array(receiptHashBuffer);
      const receiptHash = Array.from(receiptHashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Step 10: Create downloadable receipt file
      console.log('✓ Creating receipt file for download...');
      // Combine preparedReceipt and receiptSignature into single authReceipt field
      const authReceipt = `${preparedReceiptBase64}.${receiptSignatureBase64}`;
      const receiptData = {
        R: receiptR,
        authReceipt, // Combined: preparedReceipt.receiptSignature
        receiptHash, // SHA-256 hash for participation claim verification (Tree #2)
        campaignId: sessionCampaignId,
        submittedAt: new Date().toISOString(),
        // Commitments are included for client-side verification only
        // These are used to verify responses were included in the Merkle tree
        // IMPORTANT: Commitments are NEVER sent to server during Phase 4 (claim participation)
        // They are only extracted client-side for use with public verification endpoint
        commitments: completedResponses.map(r => r.commitment)
      };

      // Download receipt file
      const receiptJson = JSON.stringify(receiptData, null, 2);
      const blob = new Blob([receiptJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recepit.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('✓ Receipt file downloaded');

      console.log('✓ Clearing all session data (survey session complete)...');

      // Clear ALL sessionStorage
      sessionStorage.clear();

      // Clear ALL localStorage workflow data
      // NOTE: studentToken, studentTokenData, preparedToken, tokenSignature are no longer stored
      // NOTE: receipt data (preparedReceipt, receiptSignature) is not stored - only in downloaded file
      const workflowKeys = [
        'campaignId', 'ticketCommitment', 'surveys', 'blindSignaturePublicKey',
        'encryptionPublicKey', 'completedResponses'
      ];
      workflowKeys.forEach(key => localStorage.removeItem(`workflow_${key}`));

      // Show success message instead of redirecting
      setSuccess(true);

    } catch (err: any) {
      console.error('Batch submission failed:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to submit surveys. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Submitting your surveys..." fullScreen />;
  }

  // Success state - Phase 3 complete
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-12 text-center">
            {/* Success Icon */}
            <div className="mb-8">
              <div className="mx-auto w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-4xl font-bold text-white mb-4">Surveys Submitted!</h1>
            <p className="text-white/80 text-lg mb-8">
              Your receipt file has been downloaded.
            </p>

            {/* Important Warning */}
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-6 mb-8 text-left">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-yellow-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-yellow-100">
                  <p className="font-semibold mb-2">IMPORTANT: Save Your Receipt File!</p>
                  <p className="text-sm mb-2">
                    Your receipt file (survey-receipt-*.json) has been downloaded.
                    You will need this file to claim your participation later.
                  </p>
                  <p className="text-sm mb-2">
                    The receipt file includes commitments that you can use to verify your responses were included.
                    You can verify them using the verification page at <code className="bg-yellow-900/30 px-1 rounded">/verify/{campaignId}</code>
                  </p>
                  <p className="text-sm">
                    All session data has been cleared for security. Keep your receipt file safe!
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Info */}
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-8 text-left">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-blue-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-blue-100 text-sm">
                  <p className="font-semibold mb-1">Your Privacy is Protected</p>
                  <p className="mb-2">
                    Your responses were submitted anonymously using blind signatures.
                    The server cannot link your responses back to your identity.
                  </p>
                  <p className="text-xs text-blue-200/80">
                    💡 You can verify your commitments were included using the verification page at /verify/{campaignId}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={() => router.push('/student/surveys/claim-participation')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
              >
                Claim Participation Now
              </button>
              <button
                onClick={() => router.push(`/verify/${campaignId}`)}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105"
              >
                Verify Your Response on Blockchain
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-white/10 text-white py-4 rounded-lg font-semibold hover:bg-white/20 transition-all duration-200"
              >
                Return to Home
              </button>
              <p className="text-white/60 text-sm">
                You can claim participation and verify your response later by uploading your receipt file
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}


        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
          {/* Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Submission Summary</h2>
            <div className="space-y-3">
              {completedResponses.map((response, index) => (
                <div key={response.surveyId} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div>
                    <div className="text-white font-medium">{response.courseCode}</div>
                    <div className="text-white/60 text-sm">
                      Completed {new Date(response.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-green-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Authorization File Upload */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Authorization File</label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleAuthorizationFileUpload}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />
            {authorizationFile && (
              <p className="text-green-400 text-sm mt-2">✓ {authorizationFile.name}</p>
            )}
            <p className="text-white/60 text-xs mt-2">
              Upload the authorization file (auth.json) that was downloaded during login.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-blue-100 text-sm">
                <p className="font-semibold mb-1">Anonymous Submission</p>
                <p>
                  Your responses will be submitted anonymously using blind signatures.
                  The server cannot link your responses to your identity.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || completedResponses.length === 0 || !authorizationData}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Submitting...' : 'Submit All Surveys'}
          </button>

          {/* Back Link */}
          <div className="text-center mt-6">
            <button
              onClick={() => router.push('/student/surveys')}
              className="text-white/60 hover:text-white transition-colors"
            >
              ← Back to Surveys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
