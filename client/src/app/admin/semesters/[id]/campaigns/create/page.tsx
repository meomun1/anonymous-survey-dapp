'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useUniversity } from '@/hooks/useUniversity';

export default function CreateCampaignPage() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'course' as 'course' | 'event'
  });
  const [semester, setSemester] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const params = useParams();
  const semesterId = params.id as string;
  
  const { isAuthenticated } = useAuth();
  const { createCampaign } = useCampaigns();
  const { fetchSemesters } = useUniversity();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSemester();
  }, [semesterId]);

  const loadSemester = async () => {
    try {
      const semestersData = await fetchSemesters();
      const currentSemester = semestersData.find(s => s.id === semesterId);
      if (!currentSemester) {
        setError('Semester not found');
        return;
      }
      setSemester(currentSemester);
    } catch (err: any) {
      console.error('Failed to load semester:', err);
      setError('Failed to load semester');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const campaign = await createCampaign({
        name: formData.name.trim(),
        type: formData.type,
        semesterId: semesterId
      });
      
      // Redirect to campaign details
      router.push(`/admin/semesters/${semesterId}/campaigns/${campaign.id}`);
    } catch (err: any) {
      console.error('Failed to create campaign:', err);
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Campaign</h1>
          {semester && (
            <p className="text-white/80 mt-2">
              For {semester.name} ({semester.startDate && semester.endDate ? (
                <>
                  {new Date(semester.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} - {new Date(semester.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </>
              ) : 'Loading dates...'})
            </p>
          )}
        </div>
        <Link
          href={`/admin/semesters/${semesterId}`}
          className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to {semester?.name || 'Semester'}</span>
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Fall 2025 Quality Survey"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Choose a descriptive name for your survey campaign
            </p>
          </div>

          {/* Campaign Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Type *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              <option value="course">Course Survey</option>
              <option value="event">Event Survey</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Course surveys are for academic courses, event surveys are for special events
            </p>
          </div>

          {/* Semester Info */}
          {semester && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-900 mb-2">Selected Semester</h3>
              <div className="text-sm text-purple-800 space-y-1">
                <p><strong>Name:</strong> {semester.name}</p>
                {semester.startDate && semester.endDate && (
                  <p><strong>Period:</strong> {new Date(semester.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} - {new Date(semester.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                )}
                <p><strong>Status:</strong> <span className="capitalize">{semester.status}</span></p>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Campaign'
              )}
            </button>

            <Link
              href={`/admin/semesters/${semesterId}`}
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
