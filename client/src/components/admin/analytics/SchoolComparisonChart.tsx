'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface SchoolComparisonChartProps {
  schools: Array<{
    schoolId: string;
    schoolName: string;
    responseCount: number;
    averageScore: number;
  }>;
}

export const SchoolComparisonChart = ({ schools }: SchoolComparisonChartProps) => {
  // Sort schools by average score
  const sortedSchools = [...schools].sort((a, b) => b.averageScore - a.averageScore);

  // Take top 10 schools if there are many
  const displaySchools = sortedSchools.slice(0, 10);

  // Prepare data for chart
  const data = displaySchools.map(school => ({
    name: school.schoolName.length > 20 ? school.schoolName.substring(0, 20) + '...' : school.schoolName,
    fullName: school.schoolName,
    score: parseFloat(school.averageScore.toFixed(2)),
    responses: school.responseCount
  }));

  // Color based on score
  const getColor = (score: number) => {
    if (score >= 4.5) return '#10b981'; // green
    if (score >= 4.0) return '#3b82f6'; // blue
    if (score >= 3.5) return '#eab308'; // yellow
    if (score >= 3.0) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">School Performance Comparison</h3>
        <p className="text-sm text-gray-600 mt-1">
          {schools.length > 10 ? `Top 10 out of ${schools.length} schools` : `All ${schools.length} schools`}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#d1d5db' }}
            width={95}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: any, name: string, props: any) => {
              return [
                `${value} / 5.0 (${props.payload.responses} responses)`,
                props.payload.fullName
              ];
            }}
            labelFormatter={() => ''}
          />
          <Bar dataKey="score" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span className="text-gray-700">Excellent (≥4.5)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
          <span className="text-gray-700">Very Good (4.0-4.5)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
          <span className="text-gray-700">Good (3.5-4.0)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
          <span className="text-gray-700">Fair (3.0-3.5)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span className="text-gray-700">Needs Work (&lt;3.0)</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {schools.filter(s => s.averageScore >= 4.5).length}
          </div>
          <div className="text-sm text-gray-600">Excellent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {schools.filter(s => s.averageScore >= 4.0 && s.averageScore < 4.5).length}
          </div>
          <div className="text-sm text-gray-600">Very Good</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {schools.filter(s => s.averageScore >= 3.5 && s.averageScore < 4.0).length}
          </div>
          <div className="text-sm text-gray-600">Good</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {schools.filter(s => s.averageScore < 3.5).length}
          </div>
          <div className="text-sm text-gray-600">Needs Work</div>
        </div>
      </div>
    </div>
  );
};
