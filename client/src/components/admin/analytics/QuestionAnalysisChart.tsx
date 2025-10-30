'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface QuestionAnalysisChartProps {
  questionStatistics: Record<number, Record<number, number>>;
}

export const QuestionAnalysisChart = ({ questionStatistics }: QuestionAnalysisChartProps) => {
  const [viewMode, setViewMode] = useState<'average' | 'distribution'>('average');

  // Calculate average score for each question
  const averageData = Object.entries(questionStatistics).map(([questionNum, distribution]) => {
    const distObj = distribution as Record<number, number>;
    const totalAnswers = Object.values(distObj).reduce((sum, count) => sum + count, 0);
    const totalScore = Object.entries(distObj).reduce((sum, [score, count]) =>
      sum + (parseInt(score) * count), 0);
    const avgScore = totalAnswers > 0 ? totalScore / totalAnswers : 0;

    return {
      question: `Q${questionNum}`,
      questionNumber: parseInt(questionNum),
      average: parseFloat(avgScore.toFixed(2)),
      responses: totalAnswers
    };
  }).sort((a, b) => a.questionNumber - b.questionNumber);

  // Get top 5 best and worst performing questions
  const sortedByScore = [...averageData].sort((a, b) => b.average - a.average);
  const bestQuestions = sortedByScore.slice(0, 5);
  const worstQuestions = sortedByScore.slice(-5).reverse();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Question-by-Question Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">Average scores across all 25 survey questions</p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('average')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'average'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Average Scores
          </button>
          <button
            onClick={() => setViewMode('distribution')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'distribution'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Top & Bottom 5
          </button>
        </div>
      </div>

      {viewMode === 'average' ? (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={averageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="question"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#d1d5db' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                label={{ value: 'Average Score', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any) => [`${value} / 5.0`, 'Average Score']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Average Score"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Overall Statistics */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(averageData.reduce((sum, q) => sum + q.average, 0) / averageData.length).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Overall Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.max(...averageData.map(q => q.average)).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Highest Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.min(...averageData.map(q => q.average)).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Lowest Score</div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Best Performing Questions */}
          <div>
            <h4 className="text-md font-semibold text-green-700 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Top 5 Best Performing Questions
            </h4>
            <div className="space-y-2">
              {bestQuestions.map((q, index) => (
                <div key={q.questionNumber} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-bold text-green-700">#{index + 1}</div>
                    <div>
                      <div className="font-medium text-gray-900">Question {q.questionNumber}</div>
                      <div className="text-xs text-gray-600">{q.responses} responses</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">{q.average}</div>
                    <div className="text-xs text-gray-600">out of 5.0</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Performing Questions */}
          <div>
            <h4 className="text-md font-semibold text-orange-700 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Bottom 5 - Areas for Improvement
            </h4>
            <div className="space-y-2">
              {worstQuestions.map((q, index) => (
                <div key={q.questionNumber} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-bold text-orange-700">#{index + 1}</div>
                    <div>
                      <div className="font-medium text-gray-900">Question {q.questionNumber}</div>
                      <div className="text-xs text-gray-600">{q.responses} responses</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-600">{q.average}</div>
                    <div className="text-xs text-gray-600">out of 5.0</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
