'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokensApi } from '@/lib/api/tokens';

export default function TokenPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Validate token with server
      const tokenResponse = await tokensApi.validateToken(token.trim());
      const tokenData = tokenResponse.data;
      
      if (!tokenData.valid) {
        setError('Invalid token. Please check your token and try again.');
        return;
      }

      if (tokenData.isCompleted) {
        setError('This token has already been used to complete a survey.');
        return;
      }

      // Step 2: Mark token as used (student has started the survey)
      await tokensApi.markTokenAsUsed(token.trim());

      // Step 3: Redirect to survey with token data
      const searchParams = new URLSearchParams({
        token: token.trim(),
        surveyId: tokenData.surveyId,
        email: tokenData.studentEmail
      });
      
      router.push(`/surveys/${tokenData.surveyId}/participate?${searchParams.toString()}`);
      
    } catch (err: any) {
      console.error('Token validation error:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.details || 
        'Failed to validate token. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enter Survey Token
          </h1>
          <p className="text-gray-600">
            Enter your unique token to participate in the anonymous survey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
              Survey Token
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your survey token"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Validating Token...
              </span>
            ) : (
              'Continue to Survey'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">🔒 Privacy Guaranteed</h3>
            <p className="text-xs text-blue-700">
              Your responses are completely anonymous. Even administrators cannot link your answers to your identity.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact your administrator for support.
          </p>
        </div>
      </div>
    </div>
  );
} 