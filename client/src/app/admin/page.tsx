'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { surveysApi } from '@/lib/api/surveys';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

interface DashboardStats {
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  publishedSurveys: number;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  totalResponses: number;
  isPublished: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    totalResponses: 0,
    publishedSurveys: 0
  });
  const [recentSurveys, setRecentSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await surveysApi.getAll();
      const surveys = response.data;

      // Calculate stats
      const totalSurveys = surveys.length;
      const activeSurveys = surveys.filter((s: Survey) => !s.isPublished).length;
      const publishedSurveys = surveys.filter((s: Survey) => s.isPublished).length;
      const totalResponses = surveys.reduce((total: number, s: Survey) => total + s.totalResponses, 0);

      setStats({
        totalSurveys,
        activeSurveys,
        totalResponses,
        publishedSurveys
      });

      // Get recent surveys (last 5)
      setRecentSurveys(surveys.slice(0, 5));

    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!isAuthenticated()) {
    return null; // Will redirect to login
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
                  Survey Administration
                </h1>
                <p className="text-purple-600 text-sm">
                  Manage surveys, tokens, and view analytics
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/"
                className="bg-white text-purple-700 hover:bg-purple-50 border border-purple-300 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Home</span>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white text-red-600 hover:bg-red-50 border border-red-300 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">📊</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Surveys
                  </dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats.totalSurveys}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">🟡</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Surveys
                  </dt>
                  <dd className="text-2xl font-bold text-orange-600">
                    {loading ? '...' : stats.activeSurveys}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-3xl">✅</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Published Surveys
                  </dt>
                  <dd className="text-2xl font-bold text-green-600">
                    {loading ? '...' : stats.publishedSurveys}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/admin/surveys/create"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="text-2xl mr-4">➕</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Create Survey</h3>
                  <p className="text-sm text-gray-600">Design a new anonymous survey</p>
                </div>
              </Link>

              <Link
                href="/admin/surveys"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="text-2xl mr-4">📋</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Manage Surveys</h3>
                  <p className="text-sm text-gray-600">View and edit existing surveys</p>
                </div>
              </Link>


            </div>
          </div>
        </div>

        {/* Recent Surveys */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Recent Surveys</h2>
              <Link
                href="/admin/surveys"
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading surveys...</p>
              </div>
            ) : recentSurveys.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600 mb-4">No surveys created yet</p>
                <Link
                  href="/admin/surveys/create"
                  className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Your First Survey
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSurveys.map((survey) => (
                  <div key={survey.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{survey.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className="text-xs text-gray-500">
                          {survey.totalResponses} responses
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          survey.isPublished 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {survey.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Created {new Date(survey.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        href={`/admin/surveys/${survey.id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/surveys/${survey.id}/tokens`}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
                      >
                        Tokens
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 