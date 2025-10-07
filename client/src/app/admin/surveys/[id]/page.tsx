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
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const surveyId = params.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSurveyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, surveyId]);

  const loadSurveyData = async () => {
    try {
      setLoading(true);
      const [surveyResponse, statsResponse] = await Promise.all([
        surveysApi.getById(surveyId),
        surveysApi.getStats(surveyId)
      ]);

      // Normalize survey shape (snake_case from API to camelCase used in UI)
      const s: any = surveyResponse.data as any;
      const normalized: Survey = {
        id: s.id,
        title: s.title,
        description: s.description ?? '',
        templateId: s.templateId ?? s.template_id ?? 'teaching_quality_25q',
        totalQuestions: s.totalQuestions ?? s.total_questions ?? 25,
        totalResponses: s.totalResponses ?? s.total_responses ?? 0,
        isPublished: s.isPublished ?? s.is_published ?? false,
        createdAt: s.createdAt ?? s.created_at ?? new Date().toISOString(),
        updatedAt: s.updatedAt ?? s.updated_at ?? new Date().toISOString(),
      };

      setSurvey(normalized);
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
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
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-purple-600">
                    {survey.title}
                  </h1>
                  <span className={`px-3 py-2 text-xs font-medium rounded-full ${
                    survey.isPublished 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {survey.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link
                href={`/admin/surveys/${surveyId}/responses`}
                className="bg-white text-blue-600 hover:bg-blue-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Responses</span>
              </Link>

              <Link
                href={`/admin/surveys/${surveyId}/tokens`}
                className="bg-white text-purple-600 hover:bg-purple-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4a2 2 0 012-2m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m6 0h-6" />
                </svg>
                <span>Tokens</span>
              </Link>

              {!survey.isPublished ? (
                <button
                  onClick={handlePublishSurvey}
                  disabled={publishLoading}
                  className="bg-white text-green-600 hover:bg-green-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Publish</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <Link
                    href={`/admin/surveys/${surveyId}/attendance`}
                    className="bg-white text-gray-600 hover:bg-gray-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Attendance</span>
                  </Link>
                  
                  <Link
                    href={`/admin/surveys/${surveyId}/publication`}
                    className="bg-white text-indigo-600 hover:bg-indigo-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>Public</span>
                  </Link>
                  
                  <Link
                    href={`/surveys/${surveyId}/results`}
                    className="bg-white text-emerald-600 hover:bg-emerald-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Public Results</span>
                  </Link>
                </>
              )}

              <Link
                href="/admin/surveys"
                className="bg-white/90 text-gray-600 hover:bg-white border border-white/50 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

             <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Survey Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Survey Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                  <p className="text-gray-900 text-lg font-medium">{survey.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <p className="text-gray-900">{survey.description || 'No description provided'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Template</label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-700 text-sm">25 multiple-choice questions (1-5 scale)</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900 text-sm">{new Date(survey.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-900 text-sm">{new Date(survey.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Survey Status */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Survey Status</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`text-4xl ${survey.isPublished ? 'text-green-600' : 'text-yellow-600'}`}>
                    {survey.isPublished ? '✅' : '⏳'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">
                      {survey.isPublished ? 'Published' : 'Draft'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {survey.isPublished 
                        ? 'Results are publicly verifiable and accessible' 
                        : 'Ready to collect responses from participants'
                      }
                    </div>
                    {survey.isPublished && (
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        ✓ Blockchain verified • ✓ Merkle tree generated • ✓ Public access enabled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-6">
            {/* Participation Stats */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Statistics</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">{stats.totalResponses}</div>
                  <div className="text-sm text-gray-600 font-medium">Total Responses</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gray-900">{stats.totalTokens}</div>
                    <div className="text-xs text-gray-600 font-medium">Total Tokens</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{stats.usedTokens}</div>
                    <div className="text-xs text-gray-600 font-medium">Used Tokens</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Participation Rate</span>
                      <span className="font-bold text-blue-600">{stats.participationRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${stats.participationRate}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Completion Rate</span>
                      <span className="font-bold text-green-600">{stats.completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${stats.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-900">{stats.completedTokens}</div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{stats.totalTokens - stats.usedTokens}</div>
                      <div className="text-xs text-gray-600">Available</div>
                    </div>
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