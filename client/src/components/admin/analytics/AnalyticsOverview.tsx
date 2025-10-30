import { CampaignAnalytics } from '@/lib/api/analytics';

interface AnalyticsOverviewProps {
  analytics: CampaignAnalytics;
}

export const AnalyticsOverview = ({ analytics }: AnalyticsOverviewProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Campaign Statistics</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Surveys */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">📊</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded">SURVEYS</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{analytics.totalSurveys}</div>
          <div className="text-sm text-blue-700">Total Surveys</div>
        </div>

        {/* Total Responses */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">✅</span>
            <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded">RESPONSES</span>
          </div>
          <div className="text-3xl font-bold text-green-900">{analytics.totalResponses}</div>
          <div className="text-sm text-green-700">Total Responses</div>
        </div>

        {/* Participation Rate */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🎯</span>
            <span className="text-xs font-medium text-purple-600 bg-purple-200 px-2 py-1 rounded">PARTICIPATION</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">{analytics.participationRate.toFixed(1)}%</div>
          <div className="text-sm text-purple-700">Participation Rate</div>
          <div className="text-xs text-purple-600 mt-1">
            {analytics.usedTokens} / {analytics.totalTokens} tokens used
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">⭐</span>
            <span className="text-xs font-medium text-orange-600 bg-orange-200 px-2 py-1 rounded">SCORE</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">{analytics.averageScore.toFixed(2)}</div>
          <div className="text-sm text-orange-700">Average Score (out of 5.0)</div>
        </div>
      </div>

      {/* Completion Rate Progress Bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Completion Rate</span>
          <span className="text-sm font-bold text-gray-900">{analytics.completionRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              analytics.completionRate >= 80
                ? 'bg-gradient-to-r from-green-500 to-green-600'
                : analytics.completionRate >= 60
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}
            style={{ width: `${analytics.completionRate}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {analytics.completionRate >= 80 ? '✓ Excellent completion rate' :
           analytics.completionRate >= 60 ? '⚠ Good completion rate' :
           '⚠ Low completion rate - consider follow-up'}
        </p>
      </div>

    </div>
  );
};
