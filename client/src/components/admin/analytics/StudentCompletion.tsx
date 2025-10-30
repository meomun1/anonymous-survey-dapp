'use client';

import { useState } from 'react';

interface StudentCompletionProps {
  completionData: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    schoolName: string;
    totalSurveys: number;
    completedSurveys: number;
    completionRate: number;
  }>;
}

export const StudentCompletion = ({ completionData }: StudentCompletionProps) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'complete'>('all');
  const [searchText, setSearchText] = useState('');

  if (!completionData || completionData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Completion Tracking</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎓</div>
          <p className="text-gray-600">No student completion data available</p>
        </div>
      </div>
    );
  }

  // Filter students
  const filteredStudents = completionData.filter(student => {
    const matchesSearch =
      student.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
      student.studentEmail.toLowerCase().includes(searchText.toLowerCase()) ||
      student.schoolName.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'complete' && student.completionRate === 100) ||
      (filterStatus === 'incomplete' && student.completionRate < 100);

    return matchesSearch && matchesStatus;
  });

  // Sort by completion rate (incomplete first)
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (a.completionRate === b.completionRate) {
      return a.studentName.localeCompare(b.studentName);
    }
    return a.completionRate - b.completionRate;
  });

  const incompleteStudents = completionData.filter(s => s.completionRate < 100);
  const completeStudents = completionData.filter(s => s.completionRate === 100);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Student Completion Tracking</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{completionData.length}</div>
          <div className="text-sm text-blue-700">Total Students</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{completeStudents.length}</div>
          <div className="text-sm text-green-700">Completed (100%)</div>
          <div className="text-xs text-green-600 mt-1">
            {((completeStudents.length / completionData.length) * 100).toFixed(1)}% of all students
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-900">{incompleteStudents.length}</div>
          <div className="text-sm text-red-700">Incomplete (&lt;100%)</div>
          <div className="text-xs text-red-600 mt-1">
            {((incompleteStudents.length / completionData.length) * 100).toFixed(1)}% of all students
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or school..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({completionData.length})
          </button>
          <button
            onClick={() => setFilterStatus('incomplete')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'incomplete'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Incomplete ({incompleteStudents.length})
          </button>
          <button
            onClick={() => setFilterStatus('complete')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'complete'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Complete ({completeStudents.length})
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                School
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completion
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStudents.map((student) => {
              const isComplete = student.completionRate === 100;
              const statusColor = isComplete
                ? 'bg-green-100 text-green-800'
                : student.completionRate >= 50
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800';

              return (
                <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                    <div className="text-xs text-gray-500">{student.studentEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{student.schoolName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      {student.completedSurveys} / {student.totalSurveys}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isComplete ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${student.completionRate}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {student.completionRate.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                      {isComplete ? '✓ Complete' : '⚠ Incomplete'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No students match your search criteria</p>
        </div>
      )}

      {/* Export Button */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export Completion Report</span>
        </button>
      </div>
    </div>
  );
};
