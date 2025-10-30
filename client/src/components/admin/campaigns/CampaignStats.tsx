interface CampaignStatsProps {
  stats: {
    totalSurveys: number;
    totalResponses: number;
    totalTokens: number;
    usedTokens: number;
    completionRate: number;
    participationRate: number;
  };
}

export const CampaignStats = ({ stats }: CampaignStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.totalSurveys}</div>
        <div className="text-sm text-gray-600">Total Surveys</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-blue-600">{stats.totalResponses}</div>
        <div className="text-sm text-gray-600">Responses</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-purple-600">{stats.totalTokens}</div>
        <div className="text-sm text-gray-600">Total Tokens</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-green-600">{stats.usedTokens}</div>
        <div className="text-sm text-gray-600">Used Tokens</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-orange-600">{stats.completionRate ? stats.completionRate.toFixed(1) : '0.0'}%</div>
        <div className="text-sm text-gray-600">Completion</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-indigo-600">{stats.participationRate ? stats.participationRate.toFixed(1) : '0.0'}%</div>
        <div className="text-sm text-gray-600">Participation</div>
      </div>
    </div>
  );
};
