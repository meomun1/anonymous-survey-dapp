'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useResponses } from '@/hooks/useResponses';
import { Campaign } from '@/lib/api/campaigns';
import { CampaignOverview } from '@/components/admin/campaigns/CampaignOverview';
import { StatusManager } from '@/components/admin/campaigns/StatusManager';
import { ProcessResponses } from '@/components/admin/campaigns/ProcessResponses';
import { PublishResults } from '@/components/admin/campaigns/PublishResults';
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
    publishCampaign
  } = useCampaigns();
  const {
    analytics,
    merkleRoot,
    fetchCampaignAnalytics,
    calculateMerkleRoot,
    fetchMerkleRoot
  } = useAnalytics();
  const {
    ingestFromBlockchain,
    decryptCampaignResponses
  } = useResponses();

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

        // Fetch merkle root if exists (404 is expected if not calculated yet)
        try {
          await fetchMerkleRoot(campaignId);
        } catch (err) {
          // Merkle root not calculated yet - this is normal
        }
      }
    } catch (err: any) {
      console.error('Failed to load campaign:', err);
      setError('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: 'open' | 'close' | 'launch' | 'publish', merkleRootParam?: string) => {
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
          if (!merkleRootParam) {
            throw new Error('Merkle root is required to publish campaign');
          }
          updatedCampaign = await publishCampaign(campaignId, merkleRootParam);
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

  const handleIngest = async () => {
    const result = await ingestFromBlockchain(campaignId);
    // Optionally reload analytics after ingestion
    return result;
  };

  const handleDecrypt = async () => {
    const result = await decryptCampaignResponses(campaignId);
    // Reload analytics after decryption
    if (result.success) {
      await fetchCampaignAnalytics(campaignId);
    }
    return result;
  };

  const handleCalculateMerkle = async () => {
    const result = await calculateMerkleRoot({ campaignId });
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

        {/* Status Management */}
        <StatusManager
          campaign={campaign}
          onStatusChange={handleStatusChange}
          merkleRoot={merkleRoot?.merkleRoot || null}
        />

        {/* Process Responses */}
        <ProcessResponses
          campaign={campaign}
          onIngest={handleIngest}
          onDecrypt={handleDecrypt}
        />

        {/* Publish Results */}
        <PublishResults
          campaign={campaign}
          onCalculateMerkle={handleCalculateMerkle}
          existingMerkleRoot={merkleRoot}
        />

        {/* Analytics Preview */}
        {analytics && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Average Score</div>
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.averageScore ? analytics.averageScore.toFixed(2) : '0.00'} / 5.0
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Schools</div>
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.schoolBreakdown?.length || 0}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Teachers</div>
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.teacherPerformance?.length || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
