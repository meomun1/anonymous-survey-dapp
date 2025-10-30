'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useUniversity } from '@/hooks/useUniversity';
import { Semester } from '@/lib/api/university';
import { apiClient } from '@/lib/api/client';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

export default function SemesterSelectionPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semesterCampaigns, setSemesterCampaigns] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'planning'
  });
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const { fetchCampaigns } = useCampaigns();
  const { fetchSemesters } = useUniversity();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSemesterData();
  }, []);

  const loadSemesterData = async () => {
    try {
      setLoading(true);
      
      // Fetch semesters and campaigns
      const [semestersData, campaignsData] = await Promise.all([
        fetchSemesters(),
        fetchCampaigns()
      ]);

      setSemesters(semestersData);

      // Group campaigns by semester
      const campaignsBySemester: Record<string, any[]> = {};
      campaignsData.forEach(campaign => {
        if (!campaignsBySemester[campaign.semesterId]) {
          campaignsBySemester[campaign.semesterId] = [];
        }
        campaignsBySemester[campaign.semesterId].push(campaign);
      });

      setSemesterCampaigns(campaignsBySemester);

    } catch (err: any) {
      console.error('Failed to load semester data:', err);
      setError('Failed to load semester data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      status: 'planning'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create
      await apiClient.post('/university/semesters', formData);
      setShowModal(false);
      loadSemesterData();
    } catch (err: any) {
      console.error('Failed to save semester:', err);
      setError(err.response?.data?.error || 'Failed to save semester');
    }
  };

  if (!isAuthenticated()) {
    return null; // Will redirect to login
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Select Semester</h1>
          <p className="text-white/80 mt-2">Choose a semester to manage campaigns and university data</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Create Semester
        </button>
      </div>

      {/* Semesters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-white/80 mt-4">Loading semesters...</p>
          </div>
        ) : semesters.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-white/80 mb-4">No semesters found</p>
            <p className="text-white/60 text-sm">Create a semester first to manage campaigns</p>
          </div>
        ) : (
          semesters.map((semester) => {
            const campaigns = semesterCampaigns[semester.id] || [];
            const activeCampaigns = campaigns.filter(c => c.status === 'open' || c.status === 'teachers_input' || c.status === 'launched').length;
            const totalCampaigns = campaigns.length;

            return (
              <Link
                key={semester.id}
                href={`/admin/semesters/${semester.id}`}
                className="block bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 hover:bg-white/20 transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{semester.name}</h3>
                    <p className="text-white/70 text-sm">
                      {new Date(semester.startDate).toLocaleDateString()} - {new Date(semester.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    semester.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : semester.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {semester.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{totalCampaigns}</div>
                    <div className="text-xs text-white/70">Total Campaigns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{activeCampaigns}</div>
                    <div className="text-xs text-white/70">Active</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">
                    {totalCampaigns === 0 ? 'No campaigns yet' : `${activeCampaigns} of ${totalCampaigns} active`}
                  </span>
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Semester</h2>

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
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
} 