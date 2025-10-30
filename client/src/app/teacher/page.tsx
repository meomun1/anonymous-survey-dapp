'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Campaign } from '@/lib/api/campaigns';
import { CampaignStatus } from '@/components/admin/campaigns/CampaignStatus';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

export default function TeacherDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const { isAuthenticated, hasRole } = useAuth();
  const { fetchCampaigns } = useCampaigns();

  useEffect(() => {
    if (!isAuthenticated() || !hasRole('teacher')) {
      router.push('/login/teacher');
      return;
    }
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch only open campaigns of type 'course'
      const campaignsData = await fetchCampaigns({
        status: 'teachers_input',
        type: 'course'
      });

      setCampaigns(campaignsData);
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated() || !hasRole('teacher')) {
    return null;
  }

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Campaigns</h1>
        <p className="text-white/80 mt-2">
          Open course survey campaigns that require your input
        </p>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Open Campaigns ({campaigns.length})
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <LoadingSpinner message="Loading campaigns..." />
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Open Campaigns
              </h3>
              <p className="text-gray-600 mb-4">
                There are currently no campaigns open for teacher input.
              </p>
              <p className="text-sm text-gray-500">
                Please check back later or contact your administrator.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {campaign.name}
                      </h3>
                      <CampaignStatus status={campaign.status} />
                      <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                        Course Survey
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Semester: {campaign.semesterName || campaign.semesterId}</p>
                      <p>Opened: {new Date(campaign.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <Link
                    href={`/teacher/campaigns/${campaign.id}`}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 transform hover:scale-105 shadow-lg ml-6"
                  >
                    Manage Courses
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {campaigns.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="text-4xl font-bold text-white mb-2">
              {campaigns.length}
            </div>
            <div className="text-white/80 text-sm">Open Campaigns</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="text-4xl font-bold text-green-400 mb-2">
              {campaigns.filter(c => c.status === 'teachers_input').length}
            </div>
            <div className="text-white/80 text-sm">Accepting Input</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="text-4xl font-bold text-purple-400 mb-2">
              {campaigns.filter(c => c.type === 'course').length}
            </div>
            <div className="text-white/80 text-sm">Course Surveys</div>
          </div>
        </div>
      )}
    </div>
  );
}
