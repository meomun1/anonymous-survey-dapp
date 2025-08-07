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

export default function SurveysManagementPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const response = await surveysApi.getAll();
      setSurveys(response.data);
    } catch (err: any) {
      console.error('Failed to load surveys:', err);
      setError('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(surveyId);
      await surveysApi.delete(surveyId);
      setSurveys(surveys.filter(s => s.id !== surveyId));
    } catch (err: any) {
      console.error('Failed to delete survey:', err);
      setError('Failed to delete survey');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handlePublishSurvey = async (surveyId: string) => {
    if (!confirm('Are you sure you want to publish this survey? Once published, results will be publicly verifiable.')) {
      return;
    }

    try {
      await surveysApi.publish(surveyId);
      // Refresh surveys list
      await loadSurveys();
    } catch (err: any) {
      console.error('Failed to publish survey:', err);
      setError('Failed to publish survey');
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Survey Management
              </h1>
              <p className="text-gray-600">
                View, edit, and manage all surveys
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/surveys/create"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Create New Survey
              </Link>
              <Link
                href="/admin"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading surveys...</p>
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Surveys Yet</h2>
            <p className="text-gray-600 mb-8">
              Create your first anonymous survey to get started
            </p>
            <Link
              href="/admin/surveys/create"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Your First Survey
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Survey Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{surveys.length}</div>
                  <div className="text-sm text-gray-600">Total Surveys</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {surveys.filter(s => !s.isPublished).length}
                  </div>
                  <div className="text-sm text-gray-600">Draft Surveys</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {surveys.filter(s => s.isPublished).length}
                  </div>
                  <div className="text-sm text-gray-600">Published Surveys</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {surveys.reduce((total, s) => total + s.totalResponses, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Responses</div>
                </div>
              </div>
            </div>

            {/* Surveys List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">All Surveys</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {surveys.map((survey) => (
                  <div key={survey.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {survey.title}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            survey.isPublished 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {survey.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          {survey.description || 'No description provided'}
                        </p>
                        
                        <div className="text-sm text-gray-500 mb-3">
                          <strong>Question:</strong> {survey.question}
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span>
                            <strong>{survey.totalResponses}</strong> responses
                          </span>
                          <span>
                            Created {new Date(survey.createdAt).toLocaleDateString()}
                          </span>
                          <span>
                            Updated {new Date(survey.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-6">
                        <Link
                          href={`/admin/surveys/${survey.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          View Details
                        </Link>
                        
                        <Link
                          href={`/admin/surveys/${survey.id}/tokens`}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          Manage Tokens
                        </Link>
                        
                        {!survey.isPublished && (
                          <button
                            onClick={() => handlePublishSurvey(survey.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Publish Results
                          </button>
                        )}
                        
                        {survey.isPublished && (
                          <Link
                            href={`/surveys/${survey.id}/results`}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                          >
                            View Results
                          </Link>
                        )}
                        
                        <button
                          onClick={() => handleDeleteSurvey(survey.id)}
                          disabled={deleteLoading === survey.id}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm"
                        >
                          {deleteLoading === survey.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 