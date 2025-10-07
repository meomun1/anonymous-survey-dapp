'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { tokensApi, Token, BatchGenerateTokensData } from '@/lib/api/tokens';
import { surveysApi } from '@/lib/api/surveys';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

export default function TokenManagementPage({ params }: { params: { id: string } }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [emailList, setEmailList] = useState('');
  const [generating, setGenerating] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const surveyId = params.id;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [surveyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tokensResponse, surveyResponse] = await Promise.all([
        tokensApi.getSurveyTokens(surveyId),
        surveysApi.getById(surveyId)
      ]);
      
      setTokens(tokensResponse.data);
      setSurveyTitle(surveyResponse.data.title);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTokens = async () => {
    if (!emailList.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    const emails = emailList.split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emails.length === 0) {
      setError('Please enter valid email addresses');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const data: BatchGenerateTokensData = {
        surveyId,
        students: emails.map(email => ({ email }))
      };

      await tokensApi.batchGenerateTokens(data);
      setEmailList('');
      setShowGenerateForm(false);
      await loadData(); // Refresh tokens
    } catch (err: any) {
      console.error('Failed to generate tokens:', err);
      setError(err.response?.data?.error || 'Failed to generate tokens');
    } finally {
      setGenerating(false);
    }
  };

  // Resend/Delete are not supported by current server; keep handlers as no-ops guarded out in UI
  const handleDeleteToken = async (_tokenId: string) => {};
  const handleResendEmail = async (_tokenId: string) => {};

  if (!isAuthenticated()) {
    return null;
  }

  const stats = {
    total: tokens.length,
    used: tokens.filter(t => t.used).length,
    completed: tokens.filter(t => t.isCompleted).length,
    pending: tokens.filter(t => !t.used).length
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4a2 2 0 012-2m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m6 0h-6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-purple-600">
                  {surveyTitle ? ` ${surveyTitle}` : 'Loading...'}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowGenerateForm(true)}
                className="bg-white text-green-600 hover:bg-green-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Generate Tokens</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    setBulkActionLoading(true);
                    const res = await tokensApi.testEmailService();
                    alert(res.data.message || 'SMTP test completed');
                  } catch (e: any) {
                    alert(e?.response?.data?.error || e?.message || 'SMTP test failed');
                  } finally {
                    setBulkActionLoading(false);
                  }
                }}
                disabled={bulkActionLoading}
                className="bg-white text-blue-600 hover:bg-blue-50 border border-white/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Test SMTP</span>
              </button>
              <Link
                href={`/admin/surveys/${surveyId}`}
                className="bg-white/90 text-gray-600 hover:bg-white border border-white/50 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Survey</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Token Generation Form */}
        {showGenerateForm && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Generate New Tokens</h2>
                <button
                  onClick={() => setShowGenerateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="emails" className="block text-sm font-medium text-gray-700 mb-2">
                    Student Email Addresses
                  </label>
                  <textarea
                    id="emails"
                    value={emailList}
                    onChange={(e) => setEmailList(e.target.value)}
                    placeholder="Enter email addresses (one per line):&#10;student1@university.edu&#10;student2@university.edu&#10;student3@university.edu"
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter one email address per line. Tokens will be automatically generated and sent via email.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2">📧 Email Distribution</h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Each student will receive a unique survey token</li>
                    <li>• Tokens are one-time use and cannot be shared</li>
                    <li>• Email includes survey link and participation instructions</li>
                    <li>• Students can download proof of participation after completion</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowGenerateForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateTokens}
                    disabled={generating || !emailList.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {generating ? 'Generating...' : 'Generate & Send Tokens'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Token Statistics</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.used}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tokens List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Tokens</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading tokens...</p>
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎫</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tokens Generated</h3>
                <p className="text-gray-600 mb-6">Generate tokens to start collecting survey responses</p>
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Generate Your First Tokens
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tokens.map((token) => (
                    <tr key={token.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {token.studentEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {token.token.substring(0, 8)}...
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          token.isCompleted 
                            ? 'bg-green-100 text-green-800'
                            : token.used
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {token.isCompleted ? 'Completed' : token.used ? 'In Progress' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(token.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {token.completedAt 
                          ? `Completed ${new Date(token.completedAt).toLocaleDateString()}`
                          : token.usedAt
                          ? `Started ${new Date(token.usedAt).toLocaleDateString()}`
                          : 'No activity'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 text-gray-400">
                        <span title="Resend Email - not available">Resend Email</span>
                        <span className="mx-2">·</span>
                        <span title="Delete - not available">Delete</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 