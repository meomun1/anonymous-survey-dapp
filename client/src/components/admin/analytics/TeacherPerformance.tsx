'use client';

import { useState } from 'react';

interface TeacherPerformanceProps {
  teachers: Array<{
    teacherId: string;
    teacherName: string;
    courseCode: string;
    courseName: string;
    schoolId: string;
    responseCount: number;
    averageScore: number;
  }>;
  schools?: Array<{
    schoolId: string;
    schoolName: string;
    responseCount: number;
    averageScore: number;
  }>;
}

export const TeacherPerformance = ({ teachers, schools }: TeacherPerformanceProps) => {
  const [sortBy, setSortBy] = useState<'score' | 'responses'>('score');
  const [filterText, setFilterText] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  if (!teachers || teachers.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Teacher Performance</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">👩‍🏫</div>
          <p className="text-gray-600">No teacher performance data available</p>
        </div>
      </div>
    );
  }

  // Filter and sort teachers
  const filteredTeachers = teachers.filter(teacher => {
    const matchesText = teacher.teacherName.toLowerCase().includes(filterText.toLowerCase()) ||
      teacher.courseCode.toLowerCase().includes(filterText.toLowerCase()) ||
      teacher.courseName.toLowerCase().includes(filterText.toLowerCase());

    const matchesSchool = selectedSchool === 'all' || teacher.schoolId === selectedSchool;

    return matchesText && matchesSchool;
  });

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (sortBy === 'score') {
      return b.averageScore - a.averageScore;
    }
    return b.responseCount - a.responseCount;
  });

  const getRating = (score: number) => {
    if (score >= 4.5) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', icon: '⭐' };
    if (score >= 4.0) return { label: 'Very Good', color: 'text-blue-600', bg: 'bg-blue-50', icon: '✨' };
    if (score >= 3.5) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '👍' };
    if (score >= 3.0) return { label: 'Fair', color: 'text-orange-600', bg: 'bg-orange-50', icon: '📊' };
    return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50', icon: '⚠️' };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Teacher Performance</h3>

        <div className="flex items-center space-x-4">
          {/* School Filter */}
          {schools && schools.length > 0 && (
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Schools</option>
              {schools.map(school => (
                <option key={school.schoolId} value={school.schoolId}>
                  {school.schoolName}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <input
            type="text"
            placeholder="Search teacher or course..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'responses')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="score">Sort by Score</option>
            <option value="responses">Sort by Responses</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responses
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTeachers.map((teacher) => {
              const rating = getRating(teacher.averageScore);

              return (
                <tr key={`${teacher.teacherId}-${teacher.courseCode}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{teacher.teacherName}</div>
                    <div className="text-xs text-gray-500">ID: {teacher.teacherId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{teacher.courseCode}</div>
                    <div className="text-xs text-gray-500">{teacher.courseName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {teacher.responseCount} responses
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-lg font-bold text-purple-600">{teacher.averageScore.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">out of 5.0</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${rating.bg} ${rating.color}`}>
                      <span className="mr-1">{rating.icon}</span>
                      {rating.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredTeachers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No teachers match your search criteria</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{teachers.length}</div>
          <div className="text-sm text-gray-600">Total Evaluations</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {teachers.filter(t => t.averageScore >= 4.5).length}
          </div>
          <div className="text-sm text-gray-600">Excellent (≥4.5)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {teachers.filter(t => t.averageScore >= 3.5 && t.averageScore < 4.5).length}
          </div>
          <div className="text-sm text-gray-600">Good (3.5-4.5)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {teachers.filter(t => t.averageScore < 3.5).length}
          </div>
          <div className="text-sm text-gray-600">Needs Work (&lt;3.5)</div>
        </div>
      </div>
    </div>
  );
};
