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
    // Check if student already has a valid token in session
    const sessionToken = sessionStorage.getItem('studentToken');
    if (sessionToken) {
      // Redirect to surveys page
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

      // Verify token
      const response = await apiClient.post('/tokens/verify', { token: token.trim() });

      if (response.data && response.data.valid) {
        const tokenData: TokenData = response.data.tokenData;

        // Check if switching to a different token
        // We check localStorage for existing proofs to detect if this is a new student
        // (even after logout where sessionStorage was cleared)
        const newToken = token.trim();
        const existingProofs: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('proof_')) {
            existingProofs.push(key);
          }
        }

        // If there are existing proofs, check if they belong to this token
        if (existingProofs.length > 0) {
          let shouldClear = false;

          // Check if any proof has a different token (even in same campaign)
          try {
            const firstProof = localStorage.getItem(existingProofs[0]);
            if (firstProof) {
              const proofData = JSON.parse(firstProof);
              // If token doesn't match, we're switching students
              // (Works even for students in the same campaign)
              if (proofData.token && proofData.token !== newToken) {
                shouldClear = true;
              } else if (!proofData.token && proofData.campaignId !== tokenData.campaignId) {
                // Fallback: If old proof doesn't have token field, check campaignId
                shouldClear = true;
              }
            }
          } catch (e) {
            // If we can't parse, clear to be safe
            shouldClear = true;
          }

          if (shouldClear) {
            console.log('Switching to different student, clearing localStorage...');
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('proof_') || key === 'proof_metadata' || key.startsWith('blockchain_submitted'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`Cleared ${keysToRemove.length} localStorage items from previous student`);
          }
        }

        // Store token in session
        sessionStorage.setItem('studentToken', newToken);
        sessionStorage.setItem('studentTokenData', JSON.stringify(tokenData));

        // Redirect to surveys page
        router.push('/student/surveys');
      } else {
        setError('Invalid token. Please check and try again.');
      }
    } catch (err: any) {
      console.error('Token verification failed:', err);
      // Extract error message from API response or fallback to generic message
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to verify token. Please try again.';
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
            <Link href="/" className="block text-white/80 hover:text-white text-sm transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
