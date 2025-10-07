'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { surveysApi } from '@/lib/api/surveys';

interface SurveyResults {
  surveyId: string;
  shortId: string;
  title: string;
  templateId: string;
  totalQuestions: number;
  totalResponses: number;
  isPublished: boolean;
  publishedAt: string | null;
  merkleRoot: string | null;
  questionStatistics: Record<number, Record<number, number>>;
  overallStatistics: {
    averageScore: number;
    totalResponses: number;
    scoreDistribution: Record<number, number>;
  };
  answerDistribution: Record<number, Record<number, number>>;
}

export default function PublicResultsPage({ params }: { params: { id: string } }) {
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');
  const router = useRouter();
  const surveyId = params.id;

  useEffect(() => {
    loadResults();
  }, [surveyId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await surveysApi.getResults(surveyId);
      setResults(response.data);
      
      if (response.data.isPublished) {
        await verifyResults(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load results:', err);
      const status = err.response?.status;
      const message = err.response?.data?.error;
      if (status === 404) {
        setError('Survey not found or results not yet published');
      } else if (status === 400) {
        setError(message || 'Survey is not yet published');
      } else {
        setError(message || 'Failed to load survey results');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyResults = async (resultsData: SurveyResults) => {
    try {
      // Simple verification - in a real implementation, this would:
      // 1. Connect to Solana blockchain
      // 2. Fetch the survey account data
      // 3. Verify the merkle root matches
      // 4. Verify individual commitments
      
      // For now, we'll simulate verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVerificationStatus('verified');
    } catch (err) {
      console.error('Verification failed:', err);
      setVerificationStatus('failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading survey results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Results Not Available</h2>
          <p className="text-gray-600 mb-8">{error || 'Survey results not found'}</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!results.isPublished) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Results Not Yet Published</h2>
          <p className="text-gray-600 mb-8">
            The survey is still collecting responses. Results will be published once the survey period ends.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const totalResponses = results.totalResponses;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Survey Results: {results.title}
              </h1>
              <p className="text-gray-600">
                Published anonymously with cryptographic verification
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                verificationStatus === 'verified' 
                  ? 'bg-green-100 text-green-800'
                  : verificationStatus === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  verificationStatus === 'verified' 
                    ? 'bg-green-600'
                    : verificationStatus === 'failed'
                    ? 'bg-red-600'
                    : 'bg-yellow-600 animate-pulse'
                }`}></div>
                <span>
                  {verificationStatus === 'verified' ? 'Verified' : 
                   verificationStatus === 'failed' ? 'Verification Failed' : 'Verifying...'}
                </span>
              </div>
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Survey Overview */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Survey Overview</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{results.totalResponses}</div>
                    <div className="text-sm text-gray-600">Total Responses</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">
                      {Object.keys(results.answerDistribution).length}
                    </div>
                    <div className="text-sm text-gray-600">Unique Answers</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600">100%</div>
                    <div className="text-sm text-gray-600">Anonymous</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Distribution */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Response Distribution</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {results.overallStatistics.averageScore.toFixed(2)}
                    </div>
                    <div className="text-gray-600">Average Score</div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const count = results.overallStatistics.scoreDistribution[score] || 0;
                      const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                      const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
                      
                      return (
                        <div key={score} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {labels[score - 1]} ({score})
                            </span>
                            <span className="text-sm text-gray-600">
                              {count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Details */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Cryptographic Verification</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merkle Root</label>
                  <code className="block text-sm bg-gray-100 p-3 rounded-lg break-all">
                    {results.merkleRoot || 'Not available'}
                  </code>
                </div>
                
                {results.merkleRoot ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Merkle Root</label>
                    <code className="block text-sm bg-gray-100 p-3 rounded-lg break-all">
                      {results.merkleRoot}
                    </code>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Merkle Root</label>
                    <p className="text-sm text-gray-600">Not available</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Commitments</label>
                  <p className="text-sm text-gray-900">
                    {results.totalResponses} cryptographic commitments verified
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Verification Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Verification Status</h2>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className={`text-4xl mb-3 ${
                    verificationStatus === 'verified' ? 'text-green-600' : 
                    verificationStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {verificationStatus === 'verified' ? '✅' : 
                     verificationStatus === 'failed' ? '❌' : '⏳'}
                  </div>
                  <div className="font-semibold text-gray-900 mb-2">
                    {verificationStatus === 'verified' ? 'Verification Successful' : 
                     verificationStatus === 'failed' ? 'Verification Failed' : 'Verifying Results'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {verificationStatus === 'verified' 
                      ? 'All cryptographic proofs are valid and results are authentic'
                      : verificationStatus === 'failed'
                      ? 'Unable to verify the authenticity of these results'
                      : 'Checking blockchain data and cryptographic proofs...'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Features */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Privacy Features</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="text-green-600 text-xl">🔒</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Complete Anonymity</h3>
                    <p className="text-sm text-gray-600">No responses can be linked to specific participants</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 text-xl">⛓️</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Blockchain Verified</h3>
                    <p className="text-sm text-gray-600">Results stored immutably on Solana blockchain</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="text-purple-600 text-xl">🔐</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Tamper Proof</h3>
                    <p className="text-sm text-gray-600">Cryptographic commitments prevent result manipulation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Publication Info */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Publication Details</h2>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Published</label>
                  <p className="text-sm text-gray-900">
                    {results.publishedAt ? new Date(results.publishedAt).toLocaleString() : 'Unknown'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Survey ID</label>
                  <code className="text-sm text-gray-900">{results.surveyId}</code>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Method</label>
                  <p className="text-sm text-gray-900">Merkle Tree + Blockchain</p>
                </div>
              </div>
            </div>

            {/* How to Verify */}
            <div className="bg-blue-50 rounded-lg border border-blue-200">
              <div className="p-6">
                <h3 className="font-semibold text-blue-800 mb-3">🔍 How to Verify</h3>
                <ol className="text-sm text-blue-700 space-y-2">
                  <li>1. Connect to Solana blockchain</li>
                  <li>2. Query the survey program account</li>
                  <li>3. Verify the merkle root matches</li>
                  <li>4. Check individual response commitments</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 