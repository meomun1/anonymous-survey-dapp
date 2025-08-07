'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { surveysApi } from '@/lib/api/surveys';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

interface Survey {
  id: string;
  title: string;
  description: string;
  question: string;
  totalResponses: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SurveyStats {
  totalTokens: number;
  usedTokens: number;
  completedTokens: number;
  totalResponses: number;
  participationRate: number;
  completionRate: number;
}

export default function SurveyDetailsPage({ params }: { params: { id: string } }) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const surveyId = params.id;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSurveyData();
  }, [surveyId]);

  const loadSurveyData = async () => {
    try {
      setLoading(true);
      const [surveyResponse, statsResponse] = await Promise.all([
        surveysApi.getById(surveyId),
        surveysApi.getStats(surveyId)
      ]);
      
      setSurvey(surveyResponse.data);
      setStats(statsResponse.data);
    } catch (err: any) {
      console.error('Failed to load survey data:', err);
      setError('Failed to load survey data');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishSurvey = async () => {
    if (!confirm('Are you sure you want to publish this survey? Once published, results will be publicly verifiable and the survey cannot be modified.')) {
      return;
    }

    try {
      setPublishLoading(true);
      await surveysApi.publish(surveyId);
      await loadSurveyData(); // Refresh data
    } catch (err: any) {
      console.error('Failed to publish survey:', err);
      setError('Failed to publish survey');
    } finally {
      setPublishLoading(false);
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading survey details...</p>
        </div>
      </div>
    );
  }

  if (error || !survey || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Survey</h2>
          <p className="text-gray-600 mb-8">{error || 'Survey not found'}</p>
          <Link
            href="/admin/surveys"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Surveys
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {survey.title}
                </h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  survey.isPublished 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {survey.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-gray-600">
                Survey management and analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={`/admin/surveys/${surveyId}/tokens`}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Manage Tokens
              </Link>
              {!survey.isPublished && (
                <button
                  onClick={handlePublishSurvey}
                  disabled={publishLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                >
                  {publishLoading ? 'Publishing...' : 'Publish Results'}
                </button>
              )}
              {survey.isPublished && (
                <Link
                  href={`/surveys/${surveyId}/results`}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  View Public Results
                </Link>
              )}
              <Link
                href="/admin/surveys"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Surveys
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Survey Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Survey Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-gray-900">{survey.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{survey.description || 'No description provided'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{survey.question}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{new Date(survey.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-900">{new Date(survey.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Security Features */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Security Features</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="text-2xl mr-3">🔒</div>
                      <h3 className="font-semibold text-blue-800">Blind Signatures</h3>
                    </div>
                    <p className="text-sm text-blue-700">
                      Complete anonymity through RSA blind signature cryptography
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="text-2xl mr-3">🔐</div>
                      <h3 className="font-semibold text-green-800">Response Encryption</h3>
                    </div>
                    <p className="text-sm text-green-700">
                      RSA-OAEP encryption protects responses on blockchain
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="text-2xl mr-3">⛓️</div>
                      <h3 className="font-semibold text-purple-800">Blockchain Storage</h3>
                    </div>
                    <p className="text-sm text-purple-700">
                      Immutable storage on Solana blockchain for transparency
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="text-2xl mr-3">✅</div>
                      <h3 className="font-semibold text-orange-800">Verifiable Results</h3>
                    </div>
                    <p className="text-sm text-orange-700">
                      Merkle tree proofs enable public verification
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-6">
            {/* Participation Stats */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Statistics</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalResponses}</div>
                  <div className="text-sm text-gray-600">Total Responses</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.totalTokens}</div>
                    <div className="text-xs text-gray-600">Total Tokens</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{stats.usedTokens}</div>
                    <div className="text-xs text-gray-600">Used Tokens</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Participation Rate</span>
                      <span>{stats.participationRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${stats.participationRate}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate</span>
                      <span>{stats.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${stats.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  href={`/admin/surveys/${surveyId}/tokens`}
                  className="block w-full bg-purple-600 text-white text-center py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Manage Tokens
                </Link>
                
                {!survey.isPublished ? (
                  <button
                    onClick={handlePublishSurvey}
                    disabled={publishLoading}
                    className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                  >
                    {publishLoading ? 'Publishing...' : 'Publish Results'}
                  </button>
                ) : (
                  <Link
                    href={`/surveys/${surveyId}/results`}
                    className="block w-full bg-emerald-600 text-white text-center py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    View Public Results
                  </Link>
                )}
                
                <Link
                  href={`/admin/surveys/${surveyId}/responses`}
                  className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Responses
                </Link>
              </div>
            </div>

            {/* Survey Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Status</h2>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className={`text-4xl mb-2 ${survey.isPublished ? 'text-green-600' : 'text-yellow-600'}`}>
                    {survey.isPublished ? '✅' : '⏳'}
                  </div>
                  <div className="font-semibold text-gray-900">
                    {survey.isPublished ? 'Published' : 'Draft'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {survey.isPublished 
                      ? 'Results are publicly verifiable' 
                      : 'Ready to collect responses'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 