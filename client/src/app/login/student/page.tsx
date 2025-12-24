'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface TokenData {
  id: string;
  token: string;
  studentId: string;
  studentName: string;
  surveyId: string;
  courseCode: string;
  courseName: string;
  campaignName: string;
  used: boolean;
  createdAt: string;
}

export default function StudentLoginPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  const router = useRouter();

  useEffect(() => {
    // Check if student already has surveys data (indicates valid session)
    let surveys = sessionStorage.getItem('surveys');

    // If sessionStorage is empty, try to restore from localStorage
    if (!surveys) {
      const workflowSurveys = localStorage.getItem('workflow_surveys');

      if (workflowSurveys) {
        // Restore all safe workflow data from localStorage to sessionStorage
        // NOTE: We no longer store sensitive data (studentToken, preparedToken, tokenSignature)
        const safeKeys = [
          'campaignId',
          'ticketCommitment',
          'surveys',
          'blindSignaturePublicKey',
          'encryptionPublicKey',
          'completedResponses'
        ];

        safeKeys.forEach(key => {
          const value = localStorage.getItem(`workflow_${key}`);
          if (value) {
            sessionStorage.setItem(key, value);
          }
        });
        router.push('/student/surveys');
        return;
      }
    }

    // If we have surveys data in sessionStorage, allow resuming
    if (surveys) {
      router.push('/student/surveys');
    } else {
      setCheckingSession(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');
      const {
        blindTokenString,
        unblindSignature,
        verifyBlindSignature,
        uint8ArrayToBase64,
        base64ToUint8Array
      } = await import('@/lib/crypto/blindSignatures');
      const { CryptoUtils } = await import('@/lib/crypto/blindSignatures');

      const newToken = token.trim();

      // Step 1: Verify token exists
      const verifyResponse = await apiClient.post('/tokens/verify', { token: newToken });

      if (!verifyResponse.data || !verifyResponse.data.valid) {
        setError('Invalid credential');
        return;
      }

      const tokenData: TokenData = verifyResponse.data.tokenData;

      // Clear old session data if switching tokens
      const existingProofs: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('proof_')) {
          existingProofs.push(key);
        }
      }

      if (existingProofs.length > 0) {
        let shouldClear = false;
        try {
          const firstProof = localStorage.getItem(existingProofs[0]);
          if (firstProof) {
            const proofData = JSON.parse(firstProof);
            // If token doesn't match, we're switching students
            if (proofData.token && proofData.token !== newToken) {
              shouldClear = true;
            }
          }
        } catch (e) {
          // If we can't parse, clear to be safe
          shouldClear = true;
        }

        if (shouldClear) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('proof_') || key === 'proof_metadata' || key.startsWith('blockchain_submitted'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
      }

      // PHASE 1.1: Get ticket and surveys
      const loginResponse = await apiClient.get('/tokens/login', {
        headers: { Authorization: `Bearer ${newToken}` }
      });

      const { surveys, ticketCommitment, campaignId } = loginResponse.data;

      // Get campaign public keys
      const keysResponse = await apiClient.get(`/crypto/campaigns/${campaignId}/public-keys`);
      const { blindSignaturePublicKey, encryptionPublicKey } = keysResponse.data;

      // Import blind signature public key
      const publicKey = await CryptoUtils.importPublicKey(blindSignaturePublicKey, 'blindSignature');

      // PHASE 1.2: Blind sign token
      const { blindedMsg, inv, preparedToken } = await blindTokenString(newToken, publicKey);

      const blindSignResponse = await apiClient.post('/tokens/blind-sign-token', {
        blindedToken: uint8ArrayToBase64(blindedMsg),
        campaignId
      }, {
        headers: { Authorization: `Bearer ${newToken}` }
      });

      const blindSignature = base64ToUint8Array(blindSignResponse.data.blindSignature);

      // Unblind the signature
      const tokenSignature = await unblindSignature(publicKey, preparedToken, blindSignature, inv);

      // Verify the signature
      const isValid = await verifyBlindSignature(publicKey, tokenSignature, preparedToken);
      if (!isValid) {
        throw new Error('Signature verification failed!');
      }

      // Step 1: Create and download authorization file (contains sensitive credentials)
      const preparedTokenBase64 = uint8ArrayToBase64(preparedToken);
      const tokenSignatureBase64 = uint8ArrayToBase64(tokenSignature);
      
      const authorizationData = {
        preparedToken: preparedTokenBase64,
        tokenSignature: tokenSignatureBase64
      };

      // Download authorization file
      const authJson = JSON.stringify(authorizationData, null, 2);
      const blob = new Blob([authJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auth.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('✓ Authorization file downloaded');

      // Step 2: Store only safe data (NO sensitive credentials, NO student identity)
      // sessionStorage: Cleared on tab close (temporary session)
      // localStorage: Persists across tab closes (allows resume)

      const safeSessionData = {
        campaignId,
        ticketCommitment,
        surveys: JSON.stringify(surveys),
        blindSignaturePublicKey,
        encryptionPublicKey,
        completedResponses: JSON.stringify([])
      };

      // Save to both storages (only safe data)
      Object.entries(safeSessionData).forEach(([key, value]) => {
        sessionStorage.setItem(key, value);
        localStorage.setItem(`workflow_${key}`, value); // Prefix to avoid conflicts
      });

      // Clear any old sensitive data that might exist
      const sensitiveKeys = ['studentToken', 'studentTokenData', 'preparedToken', 'tokenSignature'];
      sensitiveKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(`workflow_${key}`);
      });

      // Redirect to surveys page
      router.push('/student/surveys');
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to login. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <LoadingSpinner message="Checking session..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12 flex items-center justify-center">
      <div className="max-w-md w-full my-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Student Login</h1>
          <p className="text-white/80">Enter your survey token to begin</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-white font-medium mb-2">
                Survey Token
              </label>
              <input
                type="text"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your anonymous token"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link
              href="/student/surveys/claim-participation"
              className="block text-purple-300 hover:text-purple-200 text-sm font-medium transition-colors"
            >
              Already submitted? Claim your participation →
            </Link>
            <Link href="/" className="block text-white/80 hover:text-white text-sm transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
