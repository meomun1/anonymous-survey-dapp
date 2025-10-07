'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SurveyCompletedPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = params.id;
  const token = searchParams?.get('token');
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Redirect to home after 10 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Survey Submitted Successfully!
          </h1>
          <p className="text-gray-600">
            Thank you for your anonymous participation
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Return to Home
          </button>
          
          <p className="text-sm text-gray-500">
            Automatically redirecting in {countdown} seconds...
          </p>
        </div>

        {token && (
          <div className="mt-6 text-xs text-gray-400 font-mono">
            Survey: {surveyId}<br />
            Token: {token.substring(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
} 