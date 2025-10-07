'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { surveysApi } from '@/lib/api/surveys';
import { SurveyForm } from '@/components/survey/SurveyForm';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

export default function CreateSurveyPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null; // Will redirect to login
  }

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError('');

    try {
      const response = await surveysApi.create(data);
      const survey = response.data;

      // Redirect to the survey management page
      router.push(`/admin/surveys/${survey.id}`);
      
    } catch (err: any) {
      console.error('Survey creation error:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Failed to create survey. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                <svg className="w-6 h-6 text-purple-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-purple-600">
                  Create New Survey
                </h1>
                <p className="text-purple-600 text-sm">
                  Design an anonymous survey with cryptographic privacy
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/admin"
                className="bg-white text-gray-600 hover:bg-gray-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
              
              <button
                type="button"
                onClick={() => document.querySelector('form')?.requestSubmit()}
                disabled={loading || !title.trim()}
                className="bg-white text-blue-600 hover:bg-blue-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Survey</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

             <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">


        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Survey Configuration</h2>
                <p className="text-gray-600 text-sm">
                  Configure your survey with the teaching quality assurance template
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <SurveyForm
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              onTitleChange={setTitle}
            />

          </div>
        </div>
      </main>
    </div>
  );
} 