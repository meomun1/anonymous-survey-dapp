'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { surveysApi } from '@/lib/api/surveys';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { getTemplate, ANSWER_SCALE } from '@/lib/templates';

interface Survey {
  id: string;
  title: string;
  description: string;
  templateId: string;
  totalQuestions: number;
  totalResponses: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export default function SurveyResponsesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const surveyId = params.id;
  const { isAuthenticated } = useAuth();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'questions' | 'categories'>('overview');

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

      // Load survey results with statistics
      const resultsResponse = await surveysApi.getResults(surveyId);
      setResults(resultsResponse.data);

    } catch (err: any) {
      console.error('Failed to load survey results:', err);
      if (err.response?.status === 404) {
        setError('Survey results not found. The survey may not be published yet or responses may not be processed.');
      } else {
        setError('Failed to load survey results. The responses may not be decrypted yet.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProcessResponses = async () => {
    if (!survey) return;

    try {
      setDecryptLoading(true);
      setError('');

      // Trigger server-side processing of responses from blockchain
      await apiClient.post(`/surveys/${surveyId}/process-responses`);

      // Reload data to show processed results
      await loadData();

    } catch (err: any) {
      console.error('Failed to process responses:', err);
      setError(err.response?.data?.error || 'Failed to process responses from blockchain');
    } finally {
      setDecryptLoading(false);
    }
  };

  const exportResults = () => {
    if (!results || !survey) return;
    
    const exportData = {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        templateId: survey.templateId,
        totalQuestions: survey.totalQuestions,
        totalResponses: survey.totalResponses
      },
      results: results,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-results-${surveyId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getQuestionAverage = (questionNumber: number): number => {
    if (!results) return 0;
    const questionStats = results.questionStatistics[questionNumber];
    if (!questionStats) return 0;
    
    let totalScore = 0;
    let totalCount = 0;
    for (let answer = 1; answer <= 5; answer++) {
      const count = questionStats[answer] || 0;
      totalScore += (answer * count);
      totalCount += count;
    }
    
    return totalCount > 0 ? totalScore / totalCount : 0;
  };

  const getCategoryStats = (category: string) => {
    if (!results || !survey) return null;
    const template = getTemplate(survey.templateId);
    if (!template) return null;
    
    const categoryQuestions = template.questions.filter(q => q.category === category);
    const categoryAverages = categoryQuestions.map(q => getQuestionAverage(q.id));
    const overallAverage = categoryAverages.reduce((sum, avg) => sum + avg, 0) / categoryAverages.length;
    
    return {
      category,
      questionCount: categoryQuestions.length,
      averageScore: overallAverage,
      questions: categoryQuestions
    };
  };

  if (!isAuthenticated()) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey results...</p>
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

  // Use templateId from results if available, fallback to survey.templateId
  const templateId = results?.templateId || survey.templateId;
  const template = getTemplate(templateId);

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
                <div className="bg-purple-200 backdrop-blur-sm rounded-full p-2">
                  <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
            <div>
                  <h1 className="text-2xl font-bold text-purple-600">{survey.title}</h1>
                </div>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/admin/surveys/${surveyId}`}
                className="bg-white text-purple-700 hover:bg-purple-50 border border-purple-300 px-4 py-2 rounded-lg transition-colors"
              >
                Back to Survey
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Survey Info */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
                {error.includes('not be processed') && (
                  <button
                    onClick={handleProcessResponses}
                    disabled={decryptLoading}
                    className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:bg-red-400"
                  >
                    {decryptLoading ? 'Processing...' : 'Process Responses Now'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-center">
            <div className="bg-gray-100 rounded-lg p-1 flex space-x-1">
              <button
                onClick={() => setSelectedView('overview')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex flex-col items-center ${
                  selectedView === 'overview' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-lg mb-1">📊</span>
                <span>Overview</span>
                <span className="text-xs opacity-75 mt-1">Key statistics & summary</span>
              </button>
              <button
                onClick={() => setSelectedView('questions')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex flex-col items-center ${
                  selectedView === 'questions' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-lg mb-1">❓</span>
                <span>Questions</span>
                <span className="text-xs opacity-75 mt-1">Individual question analysis</span>
              </button>
              <button
                onClick={() => setSelectedView('categories')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex flex-col items-center ${
                  selectedView === 'categories' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-lg mb-1">📋</span>
                <span>Categories</span>
                <span className="text-xs opacity-75 mt-1">Grouped by topic areas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results Display */}
        {results ? (
          <div className="space-y-6">
            {selectedView === 'overview' && <OverviewView results={results} />}
            {selectedView === 'questions' && template && <QuestionsView results={results} template={template} />}
            {selectedView === 'questions' && !template && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="text-yellow-600 text-lg font-medium mb-2">Template Not Found</div>
                <p className="text-yellow-700 text-sm">Template ID: {templateId}</p>
              </div>
            )}
            {selectedView === 'categories' && template && <CategoriesView results={results} template={template} />}
            {selectedView === 'categories' && !template && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="text-yellow-600 text-lg font-medium mb-2">Template Not Found</div>
                <p className="text-yellow-700 text-sm">Template ID: {templateId}</p>
              </div>
            )}
            
            {/* Show Process Responses button if no responses yet */}
            {results.overallStatistics.totalResponses === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="text-yellow-600 text-lg font-medium mb-2">No responses processed yet</div>
                <p className="text-yellow-700 text-sm mb-4">
                  Click the button below to process responses from the blockchain
                </p>
                <button
                  onClick={handleProcessResponses}
                  disabled={decryptLoading}
                  className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-yellow-400"
                >
                  {decryptLoading ? 'Processing...' : 'Process Responses'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-500 text-lg">Loading results...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the survey data</p>
          </div>
        )}

        {/* Export Button */}
        {results && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={exportResults}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Export Results
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Overview View Component
interface OverviewViewProps {
  results: SurveyResults;
}

function OverviewView({ results }: OverviewViewProps) {
  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{results.totalResponses}</div>
          <div className="text-gray-600">Total Responses</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">
            {results.overallStatistics.averageScore.toFixed(2)}
          </div>
          <div className="text-gray-600">Average Score</div>
            </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{results.totalQuestions}</div>
          <div className="text-gray-600">Questions</div>
            </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-orange-600">
            {results.publishedAt ? 'Published' : 'Draft'}
                    </div>
          <div className="text-gray-600">Status</div>
                    </div>
                  </div>
                  
      {/* Overall Score Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-3">
          {ANSWER_SCALE.map((scale) => {
            const count = results.overallStatistics.scoreDistribution[scale.value] || 0;
            // Calculate total answers across all questions
            const totalAnswers = Object.values(results.overallStatistics.scoreDistribution).reduce((sum, val) => sum + val, 0);
            const percentage = totalAnswers > 0 
              ? (count / totalAnswers) * 100 
              : 0;
            
            return (
              <div key={scale.value} className="flex items-center">
                <div className="w-20 text-sm font-medium text-gray-700">{scale.label}</div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    >
                      {count > 0 && <span className="text-white text-xs font-medium">{count}</span>}
                  </div>
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">{percentage.toFixed(1)}%</div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Questions View Component
interface QuestionsViewProps {
  results: SurveyResults;
  template: any;
}

function QuestionsView({ results, template }: QuestionsViewProps) {
  const getQuestionAverage = (questionNumber: number): number => {
    const questionStats = results.questionStatistics[questionNumber];
    if (!questionStats) return 0;
    
    let totalScore = 0;
    let totalCount = 0;
    for (let answer = 1; answer <= 5; answer++) {
      const count = questionStats[answer] || 0;
      totalScore += (answer * count);
      totalCount += count;
    }
    
    return totalCount > 0 ? totalScore / totalCount : 0;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Individual Question Analysis</h3>
          <div className="text-sm text-gray-500">
            {template.questions.length} questions • {results.overallStatistics.totalResponses} responses
          </div>
        </div>
        
        {/* Compact Questions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {template.questions.map((question: any) => {
            const questionStats = results.questionStatistics[question.id];
            const average = getQuestionAverage(question.id);
            
            if (!questionStats) return null;
            
            // Get the most common answer for quick overview
            let mostCommonAnswer = 1;
            let maxCount = 0;
            for (let answer = 1; answer <= 5; answer++) {
              const count = questionStats[answer] || 0;
              if (count > maxCount) {
                maxCount = count;
                mostCommonAnswer = answer;
              }
            }
            const mostCommonCount = questionStats[mostCommonAnswer];
            const totalCount = Object.values(questionStats).reduce((sum, val) => sum + val, 0);
            
            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      Q{question.id}
                    </span>
                    <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                      {question.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {average.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Avg</div>
                  </div>
                </div>
                
                <h4 className="text-sm font-medium text-gray-900 mb-3 line-clamp-2">
                  {question.text}
                </h4>
                
                {/* Compact Answer Distribution */}
                <div className="space-y-1">
                  {ANSWER_SCALE.map((scale) => {
                    const count = questionStats[scale.value] || 0;
                    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                    const isMostCommon = scale.value === mostCommonAnswer;
                    
                    return (
                      <div key={scale.value} className="flex items-center">
                        <div className="w-8 text-xs font-medium text-gray-600">{scale.value}</div>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isMostCommon ? 'bg-blue-600' : 'bg-blue-400'
                              }`}
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-8 text-xs text-gray-600 text-right">
                          {count > 0 ? count : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Quick Stats */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Most common: {ANSWER_SCALE.find(s => s.value === mostCommonAnswer)?.label} ({mostCommonCount})</span>
                    <span>Total: {totalCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Categories View Component
interface CategoriesViewProps {
  results: SurveyResults;
  template: any;
}

function CategoriesView({ results, template }: CategoriesViewProps) {
  const getQuestionAverage = (questionNumber: number): number => {
    const questionStats = results.questionStatistics[questionNumber];
    if (!questionStats) return 0;
    
    let totalScore = 0;
    let totalCount = 0;
    for (let answer = 1; answer <= 5; answer++) {
      const count = questionStats[answer] || 0;
      totalScore += (answer * count);
      totalCount += count;
    }
    
    return totalCount > 0 ? totalScore / totalCount : 0;
  };

  const getCategoryStats = (category: string) => {
    const categoryQuestions = template.questions.filter((q: any) => q.category === category);
    const categoryAverages = categoryQuestions.map((q: any) => getQuestionAverage(q.id));
    const overallAverage = categoryAverages.reduce((sum: number, avg: number) => sum + avg, 0) / categoryAverages.length;
    
    return {
      category,
      questionCount: categoryQuestions.length,
      averageScore: overallAverage,
      questions: categoryQuestions
    };
  };

  const categories = Array.from(new Set(template.questions.map((q: any) => q.category)))
    .map((category) => getCategoryStats(category as string))
    .sort((a, b) => b.averageScore - a.averageScore);

  return (
    <div className="space-y-6">
      {/* Category Overview Cards */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((categoryStats) => (
            <div key={categoryStats.category} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{categoryStats.category}</h4>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                  {categoryStats.questionCount} questions
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {categoryStats.averageScore.toFixed(1)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(categoryStats.averageScore / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compact Category Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Category Breakdown</h3>
        <div className="space-y-6">
          {categories.map((categoryStats) => (
            <div key={categoryStats.category} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">{categoryStats.category}</h4>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">{categoryStats.averageScore.toFixed(1)}</div>
                  <div className="text-sm text-gray-500">Category Average</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {categoryStats.questions.map((question: any) => {
                  const average = getQuestionAverage(question.id);
                  const questionStats = results.questionStatistics[question.id];
                  
                  return (
                    <div key={question.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            Q{question.id}
                          </span>
                          <span className="text-lg font-bold text-blue-600">{average.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 mb-3 line-clamp-2">{question.text}</p>
                      
                      {/* Compact Answer Distribution */}
                      <div className="flex items-center space-x-1">
                        {ANSWER_SCALE.map((scale) => {
                          const count = questionStats?.[scale.value] || 0;
                          const totalCount = Object.values(questionStats || {}).reduce((sum, val) => sum + val, 0);
                          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                          
                          return (
                            <div key={scale.value} className="flex-1 text-center">
                              <div className="text-xs font-medium text-gray-700">{scale.value}</div>
                              <div className="text-xs text-gray-500">{count}</div>
                              <div 
                                className="bg-blue-400 rounded-sm mx-1"
                                style={{ height: `${Math.max(percentage * 0.8, 2)}px` }}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 