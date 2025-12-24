'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { getAllProofsFromSession } from '@/lib/crypto-utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Survey {
  id: string;
  tokenId: string;
  token: string;
  courseCode: string;
  courseName: string;
  campaignName: string;
  campaignId: string;
  teacherName?: string;
  used: boolean;
  completedAt?: string;
}

export default function StudentSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');

  const router = useRouter();

  useEffect(() => {
    // Load surveys from sessionStorage (populated during Phase 1)
    // We no longer check for studentToken as it's not stored for privacy
    const surveysData = sessionStorage.getItem('surveys');
    if (!surveysData) {
      // If no surveys in session, redirect back to login
      router.push('/login/student');
      return;
    }

    try {
      const parsedSurveys = JSON.parse(surveysData);
      setSurveys(parsedSurveys);

      // Student name is no longer stored for privacy
      // Set default name
      setStudentName('Student');
    } catch (err) {
      console.error('Failed to parse surveys from session:', err);
      setError('Failed to load surveys. Please login again.');
      router.push('/login/student');
      return;
    }

    setLoading(false);
  }, [router]);

  const handleSubmitAll = () => {
    // Check if all surveys are completed
    const completedResponses = JSON.parse(sessionStorage.getItem('completedResponses') || '[]');

    if (completedResponses.length === 0) {
      setError('Please complete at least one survey before submitting.');
      return;
    }

    if (completedResponses.length < surveys.length) {
      const confirmSubmit = window.confirm(
        `You have completed ${completedResponses.length} out of ${surveys.length} surveys. ` +
        'Do you want to submit what you have completed so far. Your participation will not be recorded after submission.'
      );
      if (!confirmSubmit) return;
    }

    // Redirect to batch submission page
    router.push('/student/surveys/submit-all');
  };

  if (loading) {
    return <LoadingSpinner message="Loading your surveys..." fullScreen />;
  }

  // Get completed responses from sessionStorage (Phase 2)
  const completedResponses = JSON.parse(sessionStorage.getItem('completedResponses') || '[]');
  const completedSurveyIds = completedResponses.map((r: any) => r.surveyId);

  // A survey is completed if it's in the completedResponses array
  const completedSurveys = surveys.filter(s => completedSurveyIds.includes(s.id));
  const pendingSurveys = surveys.filter(s => !completedSurveyIds.includes(s.id));

  const completionRate = surveys.length > 0
    ? Math.round((completedSurveys.length / surveys.length) * 100)
    : 0;

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Course Evaluations</h1>
        <p className="text-white/80 mt-2">
          {studentName && `Welcome back, ${studentName}!`}
        </p>
      </div>

      {/* Progress Overview */}
      {surveys.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">Your Progress</h3>
              <p className="text-white/70 text-sm">
                {completedSurveys.length} of {surveys.length} evaluations completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white">{completionRate}%</div>
              <div className="text-white/60 text-sm">Complete</div>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completionRate === 100
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Pending Surveys */}
      {pendingSurveys.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Evaluations ({pendingSurveys.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Please complete these course evaluations
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingSurveys.map((survey) => (
                <div
                  key={survey.id}
                  className="border-2 border-purple-200 rounded-lg p-6 hover:border-purple-400 hover:shadow-lg transition-all bg-gradient-to-br from-purple-50 to-pink-50"
                >
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                        PENDING
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {survey.courseCode}
                    </h3>
                    <p className="text-sm text-gray-700 mb-1">{survey.courseName}</p>
                    {survey.teacherName && (
                      <p className="text-xs text-gray-600">
                        Instructor: {survey.teacherName}
                      </p>
                    )}
                  </div>

                  <div className="mb-4 pt-4 border-t border-purple-200">
                    <p className="text-xs text-gray-500">
                      Campaign: {survey.campaignName}
                    </p>
                  </div>

                  <button
                    onClick={() => router.push(`/student/surveys/${survey.id}`)}
                    className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
                  >
                    Start Evaluation
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completed Surveys */}
      {completedSurveys.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Completed Evaluations ({completedSurveys.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Review your completed evaluations or submit them all
              </p>
            </div>
            <button
              onClick={handleSubmitAll}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Submit All Surveys
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSurveys.map((survey) => (
                <div
                  key={survey.id}
                  className="border-2 border-green-200 rounded-lg p-6 hover:border-green-400 hover:shadow-lg transition-all bg-gradient-to-br from-green-50 to-emerald-50"
                >
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>COMPLETED</span>
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {survey.courseCode}
                    </h3>
                    <p className="text-sm text-gray-700 mb-1">{survey.courseName}</p>
                    {survey.teacherName && (
                      <p className="text-xs text-gray-600">
                        Instructor: {survey.teacherName}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-green-200">
                    <p className="text-xs text-gray-500 mb-1">
                      Campaign: {survey.campaignName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Surveys */}
      {surveys.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            No Surveys Available
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have any course evaluations to complete at this time.
          </p>
          <p className="text-sm text-gray-500">
            Please check back later or contact your instructor.
          </p>
        </div>
      )}

    </div>
  );
}
