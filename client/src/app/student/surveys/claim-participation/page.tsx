'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function ClaimParticipationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [claimedAt, setClaimedAt] = useState('');
  const [needsReceipt, setNeedsReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [email, setEmail] = useState('');

  const router = useRouter();

  useEffect(() => {
    // Phase 4 ALWAYS requires file upload for security
    // All storage is cleared after Phase 3
    setNeedsReceipt(true);
    setLoading(false);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const receiptData = JSON.parse(text);

      // Validate receipt structure - supports both old format (separate fields) and new format (authReceipt)
      let authReceipt: string;
      if (receiptData.authReceipt) {
        // New format: combined authReceipt field
        authReceipt = receiptData.authReceipt;
      } else if (receiptData.preparedReceipt && receiptData.receiptSignature) {
        // Old format: separate fields (backward compatibility)
        authReceipt = `${receiptData.preparedReceipt}.${receiptData.receiptSignature}`;
      } else {
        throw new Error('Invalid receipt file format: missing authReceipt or preparedReceipt/receiptSignature');
      }

      if (!receiptData.campaignId) {
        throw new Error('Invalid receipt file format: missing campaignId');
      }

      // Store in sessionStorage (only for claim process, cleared after)
      sessionStorage.setItem('authReceipt', authReceipt);
      sessionStorage.setItem('campaignId', receiptData.campaignId);

      setReceiptFile(file);
      setError('');
    } catch (err: any) {
      setError('Failed to read receipt file. Please ensure it\'s a valid survey-receipt.json file.');
    }
  };

  const handleClaimWithUpload = async () => {
    console.log('handleClaimWithUpload called');
    console.log('receiptFile:', receiptFile);
    console.log('email:', email);

    if (!receiptFile) {
      console.log('No receipt file');
      setError('Please upload your receipt file');
      return;
    }

    if (!email || !email.trim()) {
      console.log('No email or empty email');
      setError('Please enter your email');
      return;
    }

    console.log('Validation passed, proceeding with claim');

    // Proceed with claim (email is already in state)
    await handleClaim();
  };

  const handleClaim = async () => {
    try {
      setLoading(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');

      // Get data from sessionStorage (loaded from receipt file upload)
      const campaignId = sessionStorage.getItem('campaignId');
      const authReceipt = sessionStorage.getItem('authReceipt');

      if (!campaignId || !authReceipt || !email.trim()) {
        throw new Error('Missing receipt data. Please upload your receipt file and enter your email.');
      }

      const studentEmail = email.trim();

      console.log('Phase 4: Claiming participation...');

      // authReceipt is already in the format: preparedReceipt.receiptSignature

      // Call claim participation endpoint
      const response = await apiClient.post('/tokens/participation/claim', {
        campaignId,
        email: studentEmail
      }, {
        headers: {
          Authorization: `Bearer ${authReceipt}`
        }
      });

      console.log('✓ Participation claimed successfully');

      setSuccess(true);
      setClaimedAt(response.data.claimedAt);

      // Clear session data from receipt upload
      console.log('Clearing session data...');
      sessionStorage.clear();

      console.log('✅ Phase 4 complete! Participation claimed.');

    } catch (err: any) {
      console.error('Claim participation failed:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to claim participation. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    // Clear all session storage
    sessionStorage.clear();
    router.push('/student');
  };

  if (loading) {
    return <LoadingSpinner message="Claiming your participation..." fullScreen />;
  }

  // Show upload form if receipt is needed
  if (needsReceipt && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-12">
            <h1 className="text-4xl font-bold text-white mb-4 text-center">Claim Participation</h1>
            <p className="text-white/80 text-center mb-8">
              Upload your survey receipt file to claim your participation
            </p>

            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Survey Receipt File
                  <span className="text-white/60 text-sm font-normal ml-2">(Only authReceipt is extracted)</span>
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />
                {receiptFile && (
                  <p className="text-green-400 text-sm mt-2">✓ {receiptFile.name} - authReceipt extracted</p>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-white font-medium mb-2">Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleClaimWithUpload}
                disabled={!receiptFile || !email.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Claim Participation
              </button>

              {/* Info */}
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 text-left">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-blue-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-blue-100 text-sm">
                    <p className="font-semibold mb-1">About the Receipt File</p>
                    <p className="mb-2">
                      The receipt file (survey-receipt-*.json) was downloaded when you submitted your surveys.
                      Only the <code className="bg-white/20 px-1 rounded">authReceipt</code> field is extracted and sent to the server for authorization.
                    </p>
                    <p className="text-xs text-blue-200/80">
                      🔒 Your privacy: Other data in the file (if any) stays on your device and is never sent to the server.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {success ? (
          /* Success State */
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
            <h1 className="text-4xl font-bold text-white mb-4">
              🎉 Participation Claimed!
            </h1>
            <p className="text-white/80 text-lg mb-8">
              Your participation has been successfully recorded.
              Thank you for completing your course evaluations!
            </p>

            {/* Details */}
            <div className="bg-white/5 rounded-lg p-6 mb-8 space-y-3">
              <div className="text-white/60 text-sm">Claimed at</div>
              <div className="text-white font-mono">
                {claimedAt ? new Date(claimedAt).toLocaleString() : 'Just now'}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-8 text-left">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-blue-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-blue-100 text-sm">
                  <p className="font-semibold mb-1">Your Privacy is Protected</p>
                  <p>
                    Your survey responses were submitted anonymously using blind signatures.
                    The system records your participation without being able to link it to your specific responses.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={handleGoHome}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
              >
                Return to Home
              </button>
            </div>
          </div>
        ) : (
          /* Error State */
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-12 text-center">
            {/* Error Icon */}
            <div className="mb-8">
              <div className="mx-auto w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-4xl font-bold text-white mb-4">
              Claim Failed
            </h1>
            <p className="text-white/80 text-lg mb-8">
              {error || 'Something went wrong while claiming your participation.'}
            </p>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={handleClaim}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/student/surveys')}
                className="w-full bg-white/10 text-white py-4 rounded-lg font-semibold hover:bg-white/20 transition-all duration-200"
              >
                Back to Surveys
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
