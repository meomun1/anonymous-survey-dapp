'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Campaign } from '@/lib/api/campaigns';
import { CampaignOverview } from '@/components/admin/campaigns/CampaignOverview';
import { StatusManager } from '@/components/admin/campaigns/StatusManager';
import { BlockchainFinalizer } from '@/components/admin/campaigns/BlockchainFinalizer';
import { CampaignStats } from '@/components/admin/campaigns/CampaignStats';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

export default function CampaignDetailsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const params = useParams();
  const semesterId = params.id as string;
  const campaignId = params.campaignId as string;

  const { isAuthenticated } = useAuth();
  const {
    openCampaign,
    closeCampaign,
    launchCampaign,
    publishCampaign,
    publishResponses,
    publishClaims,
    closeBlockchain
  } = useCampaigns();
  const {
    analytics,
    fetchCampaignAnalytics
  } = useAnalytics();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch campaign details using API client directly
      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.get(`/campaigns/${campaignId}`);
      setCampaign(response.data);

      // Try to load analytics only if campaign is closed or published
      // (Analytics are not available for launched campaigns until they're closed)
      if (['closed', 'published'].includes(response.data.status)) {
        try {
          await fetchCampaignAnalytics(campaignId);
        } catch (err) {
          // Analytics might not be available yet (before processing responses)
          console.log('Analytics not available yet');
        }
      }
    } catch (err: any) {
      console.error('Failed to load campaign:', err);
      setError('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: 'open' | 'close' | 'launch' | 'publish') => {
    try {
      setError('');
      let updatedCampaign;

      switch (action) {
        case 'open':
          updatedCampaign = await openCampaign(campaignId);
          break;
        case 'close':
          updatedCampaign = await closeCampaign(campaignId);
          break;
        case 'launch':
          await launchCampaign(campaignId);
          // Reload campaign data after launch
          await loadCampaignData();
          return;
        case 'publish':
          // Merkle roots already published via blockchain operations
          // Just change the status to published
          updatedCampaign = await publishCampaign(campaignId, 'dummy-merkle-root');
          break;
      }

      if (updatedCampaign) {
        setCampaign(updatedCampaign);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${action} campaign`);
      throw err;
    }
  };

  const handlePublishResponses = async () => {
    const result = await publishResponses(campaignId);
    // Refresh campaign data without triggering full page loading
    const { apiClient } = await import('@/lib/api/client');
    const response = await apiClient.get(`/campaigns/${campaignId}`);
    setCampaign(response.data);
    return result;
  };

  const handlePublishClaims = async () => {
    const result = await publishClaims(campaignId);
    // Refresh campaign data without triggering full page loading
    const { apiClient } = await import('@/lib/api/client');
    const response = await apiClient.get(`/campaigns/${campaignId}`);
    setCampaign(response.data);
    return result;
  };

  const handleCloseBlockchain = async () => {
    const result = await closeBlockchain(campaignId);
    // Refresh campaign data without triggering full page loading
    const { apiClient } = await import('@/lib/api/client');
    const response = await apiClient.get(`/campaigns/${campaignId}`);
    setCampaign(response.data);
    return result;
  };

  if (!isAuthenticated()) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner message="Loading campaign details..." fullScreen />;
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">L</div>
        <h2 className="text-xl font-semibold text-white mb-2">Campaign Not Found</h2>
        <p className="text-white/80 mb-6">The campaign you're looking for doesn't exist.</p>
        <Link
          href={`/admin/semesters/${semesterId}`}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
          <p className="text-white/80 mt-2">Manage and monitor your survey campaign</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/semesters/${semesterId}/campaigns/${campaignId}/analytics`}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
          >
            View Analytics
          </Link>
          <Link
            href={`/admin/semesters/${semesterId}/campaigns/${campaignId}/edit`}
            className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
          >
            Edit
          </Link>
          <Link
            href={`/admin/semesters/${semesterId}`}
            className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Campaigns</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Campaign Overview */}
        <CampaignOverview campaign={campaign} />

        {/* Statistics (if available) */}
        {analytics && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Campaign Statistics</h3>
            <CampaignStats stats={{
              totalSurveys: analytics.totalSurveys,
              totalResponses: analytics.totalResponses,
              totalTokens: analytics.totalTokens,
              usedTokens: analytics.usedTokens,
              completionRate: analytics.completionRate,
              participationRate: analytics.participationRate
            }} />
          </div>
        )}

        {/* Campaign Management - Lifecycle and blockchain operations */}
        <StatusManager
          campaign={campaign}
          onStatusChange={handleStatusChange}
          onPublishResponses={handlePublishResponses}
          onPublishClaims={handlePublishClaims}
        />

        {/* Blockchain Finalization - Danger Zone */}
        <BlockchainFinalizer
          campaign={campaign}
          onFinalize={handleCloseBlockchain}
        />
      </div>
    </div>
  );
}
