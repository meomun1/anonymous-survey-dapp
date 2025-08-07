'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { surveysApi } from '@/lib/api/surveys';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';

interface Survey {
  id: string;
  title: string;
  description: string;
  question: string;
  totalResponses: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  decryptedAnswer: string;
  commitmentHash: string;
  createdAt: string;
  updatedAt: string;
}

interface ResponseStats {
  totalResponses: number;
  averageLength: number;
  responseDistribution: { [key: string]: number };
}

export default function SurveyResponsesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const surveyId = params.id;
  const { isAuthenticated } = useAuth();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [decryptLoading, setDecryptLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [surveyId, isAuthenticated, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load survey details
      const surveyResponse = await surveysApi.getById(surveyId);
      setSurvey(surveyResponse.data);

      // Load survey responses
      const responsesResponse = await apiClient.get(`/responses/survey/${surveyId}`);
      setResponses(responsesResponse.data.responses || []);

      // Calculate stats
      const responseData = responsesResponse.data.responses || [];
      if (responseData.length > 0) {
        const averageLength = responseData.reduce((sum: number, r: SurveyResponse) => sum + r.decryptedAnswer.length, 0) / responseData.length;
        
        // Simple word frequency for distribution
        const wordCounts: { [key: string]: number } = {};
        responseData.forEach((r: SurveyResponse) => {
          const words = r.decryptedAnswer.toLowerCase().split(/\s+/);
          words.forEach((word: string) => {
            if (word.length > 3) { // Only count meaningful words
              wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
          });
        });

        setStats({
          totalResponses: responseData.length,
          averageLength: Math.round(averageLength),
          responseDistribution: wordCounts
        });
      }

    } catch (err: any) {
      console.error('Failed to load survey responses:', err);
      setError('Failed to load survey responses. The responses may not be decrypted yet.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecryptResponses = async () => {
    if (!survey) return;

    try {
      setDecryptLoading(true);
      setError('');

      // Trigger server-side decryption of all responses
      await apiClient.post(`/responses/decrypt-all/${surveyId}`);

      // Reload data to show decrypted responses
      await loadData();

    } catch (err: any) {
      console.error('Failed to decrypt responses:', err);
      setError(err.response?.data?.error || 'Failed to decrypt responses');
    } finally {
      setDecryptLoading(false);
    }
  };

  const filteredResponses = responses.filter(response =>
    response.decryptedAnswer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.commitmentHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportResponses = () => {
    const exportData = {
      survey: {
        id: survey?.id,
        title: survey?.title,
        question: survey?.question,
        totalResponses: survey?.totalResponses
      },
      responses: responses.map(r => ({
        responseId: r.id,
        answer: r.decryptedAnswer,
        commitmentHash: r.commitmentHash,
        submittedAt: r.createdAt
      })),
      statistics: stats,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-responses-${surveyId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated()) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey responses...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Survey not found</p>
          <Link 
            href="/admin/surveys"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Surveys
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <Link href="/admin" className="text-gray-400 hover:text-gray-500">
                      Admin
                    </Link>
                  </li>
                  <li>
                    <span className="text-gray-400">/</span>
                    <Link href="/admin/surveys" className="text-gray-400 hover:text-gray-500 ml-4">
                      Surveys
                    </Link>
                  </li>
                  <li>
                    <span className="text-gray-400">/</span>
                    <Link href={`/admin/surveys/${surveyId}`} className="text-gray-400 hover:text-gray-500 ml-4">
                      {survey.title}
                    </Link>
                  </li>
                  <li>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-900 ml-4">Responses</span>
                  </li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">Survey Responses</h1>
              <p className="text-gray-600">View and analyze all survey responses</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/admin/surveys/${surveyId}`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Survey
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Survey Info */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{survey.title}</h2>
              <p className="text-gray-600 mt-1">{survey.description}</p>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-900">Question: {survey.question}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{responses.length}</div>
              <div className="text-sm text-gray-600">Total Responses</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
                {error.includes('not be decrypted yet') && (
                  <button
                    onClick={handleDecryptResponses}
                    disabled={decryptLoading}
                    className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:bg-red-400"
                  >
                    {decryptLoading ? 'Decrypting...' : 'Decrypt Responses Now'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.totalResponses}</div>
              <div className="text-gray-600">Total Responses</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">{stats.averageLength}</div>
              <div className="text-gray-600">Average Length (chars)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(stats.responseDistribution).length}
              </div>
              <div className="text-gray-600">Unique Keywords</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search responses or commitment hashes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportResponses}
                disabled={responses.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                Export Data
              </button>
              <button
                onClick={handleDecryptResponses}
                disabled={decryptLoading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
              >
                {decryptLoading ? 'Decrypting...' : 'Refresh & Decrypt'}
              </button>
            </div>
          </div>
        </div>

        {/* Responses List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              All Responses ({filteredResponses.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Individual responses are decrypted and displayed below
            </p>
          </div>
          
          {responses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">No responses yet</p>
              <p className="text-gray-400 text-sm">Responses will appear here once students submit them</p>
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-500 text-lg">No responses match your search</p>
              <p className="text-gray-400 text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredResponses.map((response, index) => (
                <div key={response.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm font-medium text-gray-900">
                      Response #{index + 1}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(response.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <p className="text-gray-900 whitespace-pre-wrap">{response.decryptedAnswer}</p>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>
                      Commitment: <code className="bg-gray-100 px-1 rounded">
                        {response.commitmentHash.substring(0, 16)}...
                      </code>
                    </span>
                    <span>
                      Length: {response.decryptedAnswer.length} characters
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Word Cloud Preview */}
        {stats && Object.keys(stats.responseDistribution).length > 0 && (
          <div className="bg-white rounded-lg shadow mt-6 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Common Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.responseDistribution)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20)
                .map(([word, count]) => (
                  <span
                    key={word}
                    className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    style={{ fontSize: `${Math.min(14 + count * 2, 20)}px` }}
                  >
                    {word} ({count})
                  </span>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 