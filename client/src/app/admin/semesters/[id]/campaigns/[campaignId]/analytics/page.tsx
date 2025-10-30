'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Campaign } from '@/lib/api/campaigns';
import { AnalyticsOverview } from '@/components/admin/analytics/AnalyticsOverview';
import { SchoolBreakdown } from '@/components/admin/analytics/SchoolBreakdown';
import { TeacherPerformance } from '@/components/admin/analytics/TeacherPerformance';
import { StudentCompletion } from '@/components/admin/analytics/StudentCompletion';
import { ScoreDistributionChart } from '@/components/admin/analytics/ScoreDistributionChart';
import { QuestionAnalysisChart } from '@/components/admin/analytics/QuestionAnalysisChart';
import { SchoolComparisonChart } from '@/components/admin/analytics/SchoolComparisonChart';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

type TabType = 'overview' | 'schools' | 'teachers' | 'students';

export default function CampaignAnalyticsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [studentCompletionData, setStudentCompletionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const router = useRouter();
  const params = useParams();
  const semesterId = params.id as string;
  const campaignId = params.campaignId as string;

  const { isAuthenticated } = useAuth();
  const { analytics, fetchCampaignAnalytics } = useAnalytics();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadAnalyticsData();
  }, [campaignId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load campaign details
      const { apiClient } = await import('@/lib/api/client');
      const campaignResponse = await apiClient.get(`/campaigns/${campaignId}`);
      setCampaign(campaignResponse.data);

      // Load campaign analytics
      await fetchCampaignAnalytics(campaignId);

      // Load student completion data (generate if not exists)
      try {
        const completionResponse = await apiClient.post(`/analytics/campaigns/${campaignId}/student-completion`);
        if (completionResponse.data && completionResponse.data.students) {
          setStudentCompletionData(completionResponse.data.students);
        } else {
          setStudentCompletionData([]);
        }
      } catch (err: any) {
        console.log('Student completion data not available:', err.message);
        setStudentCompletionData([]);
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." fullScreen />;
  }

  if (!campaign || !analytics) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-white mb-2">Analytics Not Available</h2>
        <p className="text-white/80 mb-6">
          {!campaign
            ? "Campaign not found."
            : "Analytics data is not available. Please process responses first."}
        </p>
        <Link
          href={`/admin/semesters/${semesterId}/campaigns/${campaignId}`}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Fixed Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/admin/semesters/${semesterId}/campaigns/${campaignId}`}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
                <p className="text-sm text-gray-600">{campaign.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.print()}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>

              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium transition-colors relative ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Overview</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('schools')}
              className={`px-6 py-4 font-medium transition-colors relative ${
                activeTab === 'schools'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Schools</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-6 py-4 font-medium transition-colors relative ${
                activeTab === 'teachers'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Teachers</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`px-6 py-4 font-medium transition-colors relative ${
                activeTab === 'students'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Student Completion</span>
              </div>
            </button>
          </div>
        </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Overall Analytics */}
            <AnalyticsOverview analytics={analytics} />

            {/* Score Distribution Chart */}
            {analytics.scoreDistribution && (
              <ScoreDistributionChart scoreDistribution={analytics.scoreDistribution} />
            )}

            {/* Question Analysis Chart */}
            {analytics.questionStatistics && Object.keys(analytics.questionStatistics).length > 0 && (
              <QuestionAnalysisChart questionStatistics={analytics.questionStatistics} />
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">About This Report</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• All data is anonymized and encrypted using RSA-2048 encryption</li>
                    <li>• Response integrity is verified using Merkle tree proofs</li>
                    <li>• Students can verify their submissions were included using their commitment hash</li>
                    <li>• All analytics are calculated from decrypted responses stored securely</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Schools Tab */}
        {activeTab === 'schools' && (
          <>
            {analytics.schoolBreakdown && analytics.schoolBreakdown.length > 0 ? (
              <>
                {/* School Comparison Chart */}
                <SchoolComparisonChart schools={analytics.schoolBreakdown} />

                {/* School Breakdown Table */}
                <SchoolBreakdown
                  schools={analytics.schoolBreakdown}
                  teachers={analytics.teacherPerformance}
                />
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-4">🏫</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No School Data Available</h3>
                <p className="text-gray-600">School breakdown will appear here once responses are processed.</p>
              </div>
            )}
          </>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <>
            {analytics.teacherPerformance && analytics.teacherPerformance.length > 0 ? (
              <TeacherPerformance
                teachers={analytics.teacherPerformance}
                schools={analytics.schoolBreakdown}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-4">👨‍🏫</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Teacher Data Available</h3>
                <p className="text-gray-600">Teacher performance data will appear here once responses are processed.</p>
              </div>
            )}
          </>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <>
            {studentCompletionData.length > 0 ? (
              <StudentCompletion completionData={studentCompletionData} />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Student Completion Data</h3>
                <p className="text-gray-600">Student completion tracking will appear here once the campaign is active.</p>
              </div>
            )}
          </>
        )}

      </div>
      </div>
    </div>
  );
}
