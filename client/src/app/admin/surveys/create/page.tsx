'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { surveysApi } from '@/lib/api/surveys';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

export default function CreateSurveyPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null; // Will redirect to login
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !question.trim()) {
      setError('Please provide both a title and question for the survey');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const surveyData = {
        title: title.trim(),
        description: description.trim() || '',
        question: question.trim()
      };

      const response = await surveysApi.create(surveyData);
      const survey = response.data;

      // Redirect to the survey management page
      router.push(`/admin/surveys/${survey.id}`);
      
    } catch (err: any) {
      console.error('Survey creation error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to create survey. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create New Survey
              </h1>
              <p className="text-gray-600">
                Design an anonymous survey with cryptographic privacy
              </p>
            </div>
            <Link
              href="/admin"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Survey Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Provide the basic information for your anonymous survey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Survey Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Course Feedback Survey - CS101"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={loading}
                maxLength={255}
              />
              <p className="text-xs text-gray-500 mt-1">
                Choose a clear, descriptive title for your survey
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: Provide additional context about this survey"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional description to provide context to participants
              </p>
            </div>

            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                Survey Question *
              </label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., How would you rate your overall experience with this course?"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={loading}
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                The main question participants will answer. Keep it clear and specific.
              </p>
            </div>

            {/* Privacy Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">🔒 Privacy & Security Features</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• RSA-2048 cryptographic keys will be automatically generated</li>
                <li>• Student responses will be encrypted before blockchain storage</li>
                <li>• Blind signatures ensure complete participant anonymity</li>
                <li>• Survey results are verifiable but responses remain private</li>
              </ul>
            </div>

            {/* System Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">📋 What Happens Next</h3>
              <ol className="text-xs text-gray-700 space-y-1">
                <li>1. Survey is created with automatic cryptographic key generation</li>
                <li>2. Survey metadata is stored on Solana blockchain</li>
                <li>3. You can generate and distribute tokens to participants</li>
                <li>4. Collect anonymous responses with cryptographic proofs</li>
                <li>5. Publish verifiable results with Merkle tree proofs</li>
              </ol>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/admin"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !title.trim() || !question.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Survey...
                  </span>
                ) : (
                  'Create Survey'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 