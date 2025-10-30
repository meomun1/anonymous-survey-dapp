'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUniversity } from '@/hooks/useUniversity';
import { SchoolModal, SchoolFormData } from '@/components/admin/modals/SchoolModal';

export default function UniversityDataPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);

  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { schools, fetchSchools } = useUniversity();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      await fetchSchools();
    } catch (err: any) {
      console.error('Failed to load schools:', err);
      setError('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (data: SchoolFormData) => {
    const { apiClient } = await import('@/lib/api/client');
    await apiClient.post('/university/schools', data);
    await loadSchools(); // Reload schools list
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Schools</h1>
          <p className="text-white/80 mt-2">Select a school to view teachers, students, and courses</p>
        </div>
        <button
          onClick={() => setIsSchoolModalOpen(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Add New School
        </button>
      </div>

      {/* School Modal */}
      <SchoolModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        onSubmit={handleCreateSchool}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
        <input
          type="text"
          placeholder="Search schools by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Schools Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-white mt-4">Loading schools...</p>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-12 text-center">
          <p className="text-white/60 text-lg">
            {searchQuery ? 'No schools found matching your search' : 'No schools found. Add a new school to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchools.map((school) => (
            <Link
              key={school.id}
              href={`/admin/university/schools/${school.id}`}
              className="group bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🏫</span>
                </div>
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">
                  {school.code}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                {school.name}
              </h3>
              {school.description && (
                <p className="text-white/60 text-sm line-clamp-2">
                  {school.description}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center text-white/80 text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  View Details
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
