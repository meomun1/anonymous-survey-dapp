'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Campaign } from '@/lib/api/campaigns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

export default function EditCampaignPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'course' | 'event'>('course');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const params = useParams();
  const semesterId = params.id as string;
  const campaignId = params.campaignId as string;

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');
      const response = await apiClient.get(`/campaigns/${campaignId}`);

      if (response.data) {
        setCampaign(response.data);
        setName(response.data.name);
        setType(response.data.type);
      }
    } catch (err: any) {
      console.error('Failed to load campaign:', err);
      setError('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');

      await apiClient.put(`/campaigns/${campaignId}`, {
        name: name.trim(),
        type
      });

      router.push(`/admin/semesters/${semesterId}/campaigns/${campaignId}`);
    } catch (err: any) {
      console.error('Failed to update campaign:', err);
      setError(err.message || 'Failed to update campaign');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner message="Loading campaign..." fullScreen />;
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">Not Found</div>
        <h2 className="text-xl font-semibold text-white mb-2">Campaign Not Found</h2>
        <Link
          href={`/admin/semesters/${semesterId}`}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Semester
        </Link>
      </div>
    );
  }

  const canEditType = campaign.status === 'draft';

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Campaign</h1>
          <p className="text-white/80 mt-2">{campaign.name}</p>
        </div>
        <Link
          href={`/admin/semesters/${semesterId}/campaigns/${campaignId}`}
          className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Campaign</span>
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="e.g., Fall 2025 Quality Survey"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'course' | 'event')}
              disabled={!canEditType}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              <option value="course">Course Survey</option>
              <option value="event">Event Survey</option>
            </select>
            {!canEditType && (
              <p className="text-sm text-orange-600 mt-1">
                Type can only be changed when campaign is in draft status
              </p>
            )}
          </div>

          {/* Campaign Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-900 mb-2">Campaign Information</h3>
            <div className="text-sm text-purple-800 space-y-1">
              <p><strong>Status:</strong> <span className="capitalize">{campaign.status}</span></p>
              {campaign.createdAt && (
                <p><strong>Created:</strong> {new Date(campaign.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              )}
              {campaign.blockchainAddress && (
                <p><strong>Blockchain:</strong> <span className="font-mono text-xs">{campaign.blockchainAddress.substring(0, 10)}...</span></p>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
            <Link
              href={`/admin/semesters/${semesterId}/campaigns/${campaignId}`}
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
