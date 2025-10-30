'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useUniversity } from '@/hooks/useUniversity';
import { Campaign } from '@/lib/api/campaigns';
import { CampaignCard } from '@/components/admin/campaigns/CampaignCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { apiClient } from '@/lib/api/client';

export default function SemesterCampaignsPage() {
  const [semester, setSemester] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'planning'
  });

  const router = useRouter();
  const params = useParams();
  const semesterId = params.id as string;

  const { isAuthenticated } = useAuth();
  const { fetchCampaigns, openCampaign, closeCampaign, launchCampaign, publishCampaign } = useCampaigns();
  const { fetchSemesters } = useUniversity();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [semesterId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch semester and campaigns
      const [semestersData, campaignsData] = await Promise.all([
        fetchSemesters(),
        fetchCampaigns({ semesterId })
      ]);

      const currentSemester = semestersData.find(s => s.id === semesterId);
      if (!currentSemester) {
        setError('Semester not found');
        return;
      }

      setSemester(currentSemester);
      setCampaigns(campaignsData);

    } catch (err: any) {
      console.error('Failed to load semester data:', err);
      setError('Failed to load semester data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (campaignId: string, action: string) => {
    try {
      switch (action) {
        case 'open':
          await openCampaign(campaignId);
          break;
        case 'close':
          await closeCampaign(campaignId);
          break;
        case 'launch':
          await launchCampaign(campaignId);
          break;
        case 'publish':
          await publishCampaign(campaignId);
          break;
      }
      await loadData(); // Refresh the list
    } catch (err: any) {
      console.error(`Failed to ${action} campaign:`, err);
      setError(`Failed to ${action} campaign`);
    }
  };


  const openEditModal = () => {
    if (!semester) return;
    setFormData({
      name: semester.name,
      startDate: semester.startDate.split('T')[0],
      endDate: semester.endDate.split('T')[0],
      status: semester.status
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/university/semesters/${semesterId}`, formData);
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to update semester:', err);
      setError(err.response?.data?.error || 'Failed to update semester');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this semester? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/university/semesters/${semesterId}`);
      router.push('/admin');
    } catch (err: any) {
      console.error('Failed to delete semester:', err);
      setError(err.response?.data?.error || 'Failed to delete semester');
    }
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {semester ? semester.name : 'Loading...'}
          </h1>
          <p className="text-white/80 mt-2">
            {semester && semester.startDate && semester.endDate && (
              <>
                {new Date(semester.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} - {new Date(semester.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/admin/semesters/${semesterId}/campaigns/create`}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200"
          >
            Create Campaign
          </Link>
          <button
            onClick={openEditModal}
            className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
          >
            Delete
          </button>
          <Link
            href="/admin"
            className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Semesters</span>
          </Link>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Campaigns ({campaigns.length})
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <LoadingSpinner message="Loading campaigns..." />
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-600 mb-4">No campaigns found</p>
              <Link
                href={`/admin/semesters/${semesterId}/campaigns/create`}
                className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Your First Campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  semesterId={semesterId}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Semester</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Fall 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="surveying">Surveying</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
