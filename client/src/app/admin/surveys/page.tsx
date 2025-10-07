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
  templateId: string;
  totalQuestions: number;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-purple-600 to-slate-700">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-25 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/8 to-purple-400/8"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(147, 51, 234, 0.12) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)`
        }}></div>
      </div>
      {/* Header */}
      <header className="relative z-50 shadow-lg" style={{background: 'linear-gradient(to right, #E5CDF5, #D4A5F0)'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-200 backdrop-blur-sm rounded-full p-2">
                <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-purple-600">
                  Survey Management
                </h1>
                <p className="text-purple-600 text-sm">
                  View, edit, and manage all surveys
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/admin/surveys/create"
                className="bg-white text-green-600 hover:bg-green-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create New Survey</span>
              </Link>
              <Link
                href="/admin"
                className="bg-white/90 text-gray-600 hover:bg-white border border-white/50 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Survey Overview</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{surveys.length}</div>
                    <div className="text-sm font-medium text-blue-800">Total Surveys</div>
                    <div className="text-xs text-blue-600 mt-1">All created surveys</div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {surveys.filter(s => !s.isPublished).length}
                    </div>
                    <div className="text-sm font-medium text-orange-800">Draft Surveys</div>
                    <div className="text-xs text-orange-600 mt-1">Ready to publish</div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {surveys.filter(s => s.isPublished).length}
                    </div>
                    <div className="text-sm font-medium text-green-800">Published Surveys</div>
                    <div className="text-xs text-green-600 mt-1">Live and active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Surveys List */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">All Surveys</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {surveys.map((survey) => (
                  <div key={survey.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {survey.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            survey.isPublished 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          }`}>
                            {survey.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3 text-sm">
                          {survey.description || 'No description provided'}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{survey.templateId} • {survey.totalQuestions} questions</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(survey.createdAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          href={`/admin/surveys/${survey.id}`}
                          className="bg-blue-600/90 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View</span>
                        </Link>
                        
                        <button
                          onClick={() => handleDeleteSurvey(survey.id)}
                          disabled={deleteLoading === survey.id}
                          className="bg-red-600/90 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm font-medium shadow-sm flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>{deleteLoading === survey.id ? 'Deleting...' : 'Delete'}</span>
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