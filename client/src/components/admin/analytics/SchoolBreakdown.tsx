'use client';

import { useState } from 'react';

interface SchoolBreakdownProps {
  schools: Array<{
    schoolId: string;
    schoolName: string;
    responseCount: number;
    averageScore: number;
  }>;
  teachers?: Array<{
    teacherId: string;
    teacherName: string;
    courseCode: string;
    courseName: string;
    responseCount: number;
    averageScore: number;
    schoolId?: string;
  }>;
}

export const SchoolBreakdown = ({ schools, teachers }: SchoolBreakdownProps) => {
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'responses'>('score');
  const [filterText, setFilterText] = useState('');

  if (!schools || schools.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">School-wise Breakdown</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🏫</div>
          <p className="text-gray-600">No school data available</p>
        </div>
      </div>
    );
  }

  // Filter schools
  const filteredSchools = schools.filter(school =>
    school.schoolName.toLowerCase().includes(filterText.toLowerCase())
  );

  // Sort schools
  const sortedSchools = [...filteredSchools].sort((a, b) => {
    if (sortBy === 'score') {
      return b.averageScore - a.averageScore;
    }
    return b.responseCount - a.responseCount;
  });

  // Get school details if one is selected
  const schoolDetails = selectedSchool ? schools.find(s => s.schoolId === selectedSchool) : null;
  const schoolTeachers = selectedSchool && teachers
    ? teachers.filter(t => t.schoolId === selectedSchool)
    : [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">School-wise Breakdown</h3>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search schools..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'responses')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="score">Sort by Score</option>
            <option value="responses">Sort by Responses</option>
          </select>
        </div>
      </div>

      {/* School Details Modal/Panel */}
      {schoolDetails && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{schoolDetails.schoolName}</h4>
              <p className="text-sm text-gray-600">Detailed Statistics</p>
            </div>
            <button
              onClick={() => setSelectedSchool(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{schoolDetails.responseCount}</div>
              <div className="text-sm text-gray-600">Total Responses</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{schoolDetails.averageScore.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{schoolTeachers.length}</div>
              <div className="text-sm text-gray-600">Teachers Evaluated</div>
            </div>
          </div>

          {schoolTeachers.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-3">Teachers in this School</h5>
              <div className="space-y-2">
                {schoolTeachers.map(teacher => (
                  <div key={`${teacher.teacherId}-${teacher.courseCode}`} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{teacher.teacherName}</div>
                      <div className="text-sm text-gray-600">{teacher.courseCode} - {teacher.courseName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">{teacher.averageScore.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{teacher.responseCount} responses</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                School
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responses
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSchools.map((school, index) => {
              const score = school.averageScore;
              const getRating = (score: number) => {
                if (score >= 4.5) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
                if (score >= 4.0) return { label: 'Very Good', color: 'text-blue-600', bg: 'bg-blue-50' };
                if (score >= 3.5) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-50' };
                if (score >= 3.0) return { label: 'Fair', color: 'text-orange-600', bg: 'bg-orange-50' };
                return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' };
              };
              const rating = getRating(score);

              return (
                <tr
                  key={school.schoolId}
                  onClick={() => setSelectedSchool(school.schoolId)}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && <span className="text-xl mr-2">🥇</span>}
                      {index === 1 && <span className="text-xl mr-2">🥈</span>}
                      {index === 2 && <span className="text-xl mr-2">🥉</span>}
                      <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{school.schoolName}</div>
                    <div className="text-xs text-gray-500">ID: {school.schoolId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-gray-900">{school.responseCount}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-purple-600">{score.toFixed(2)}</span>
                    <span className="text-sm text-gray-500"> / 5.0</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${rating.bg} ${rating.color}`}>
                      {rating.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{schools.length}</div>
          <div className="text-sm text-gray-600">Total Schools</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {schools.reduce((sum, s) => sum + s.responseCount, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Responses</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {(schools.reduce((sum, s) => sum + s.averageScore, 0) / schools.length).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Overall Average</div>
        </div>
      </div>
    </div>
  );
};
