'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ScoreDistributionChartProps {
  scoreDistribution: Record<number, number>;
}

export const ScoreDistributionChart = ({ scoreDistribution }: ScoreDistributionChartProps) => {
  // Transform data for recharts
  const data = [1, 2, 3, 4, 5].map(score => ({
    score: `${score} Star${score > 1 ? 's' : ''}`,
    count: scoreDistribution[score] || 0,
    percentage: 0
  }));

  // Calculate percentages
  const total = data.reduce((sum, item) => sum + item.count, 0);
  data.forEach(item => {
    item.percentage = total > 0 ? (item.count / total * 100) : 0;
  });

  // Color scheme for bars
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
      <p className="text-sm text-gray-600 mb-6">Overall distribution of ratings across all responses</p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="score"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
            label={{ value: 'Number of Responses', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: any, name: string) => {
              const item = data.find(d => d.count === value);
              return [
                `${value} responses (${item?.percentage.toFixed(1)}%)`,
                'Count'
              ];
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-5 gap-2">
        {data.map((item, index) => (
          <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: colors[index] }}>
              {item.count}
            </div>
            <div className="text-xs text-gray-600 mt-1">{item.percentage.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">{index + 1} Star</div>
          </div>
        ))}
      </div>
    </div>
  );
};
