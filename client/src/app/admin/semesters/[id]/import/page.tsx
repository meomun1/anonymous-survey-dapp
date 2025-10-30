'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUniversity } from '@/hooks/useUniversity';

export default function UniversityDataImportPage() {
  const [semester, setSemester] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importType, setImportType] = useState<'students' | 'enrollments'>('students');
  const [file, setFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  
  const router = useRouter();
  const params = useParams();
  const semesterId = params.id as string;
  
  const { isAuthenticated } = useAuth();
  const { fetchSemesters, bulkImportStudents, bulkImportEnrollments } = useUniversity();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSemester();
  }, [semesterId]);

  const loadSemester = async () => {
    try {
      const semestersData = await fetchSemesters();
      const currentSemester = semestersData.find(s => s.id === semesterId);
      if (!currentSemester) {
        setError('Semester not found');
        return;
      }
      setSemester(currentSemester);
    } catch (err: any) {
      console.error('Failed to load semester:', err);
      setError('Failed to load semester');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccess('');
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Parse CSV file
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      if (importType === 'students') {
        // Expected headers: email, name, studentId, schoolId
        const students = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            email: values[0],
            name: values[1],
            studentId: values[2],
            schoolId: values[3]
          };
        });

        const result = await bulkImportStudents({ students });
        setImportResults(result);
        setSuccess(`Successfully imported ${result.imported} students`);
      } else {
        // Expected headers: studentId, courseId, semesterId
        const enrollments = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            studentId: values[0],
            courseId: values[1],
            semesterId: values[2] || semesterId // Use current semester if not specified
          };
        });

        const result = await bulkImportEnrollments({ enrollments });
        setImportResults(result);
        setSuccess(`Successfully imported ${result.created} enrollments`);
      }

    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    let csvContent = '';
    let filename = '';

    if (importType === 'students') {
      csvContent = 'email,name,studentId,schoolId\n';
      csvContent += 'john.doe@university.edu,John Doe,STU001,school-uuid-here\n';
      csvContent += 'jane.smith@university.edu,Jane Smith,STU002,school-uuid-here\n';
      filename = 'students_template.csv';
    } else {
      csvContent = 'studentId,courseId,semesterId\n';
      csvContent += 'student-uuid-here,course-uuid-here,semester-uuid-here\n';
      csvContent += 'student-uuid-here,course-uuid-here,semester-uuid-here\n';
      filename = 'enrollments_template.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Link
          href={`/admin/semesters/${semesterId}`}
          className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to {semester?.name || 'Semester'}</span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Import University Data</h1>
          <p className="text-white/80 mt-2">
            {semester && `Import data for ${semester.name} (${new Date(semester.startDate).getFullYear()})`}
          </p>
        </div>
      </div>

      {/* Import Type Selection */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Select Import Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setImportType('students')}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              importType === 'students'
                ? 'border-green-500 bg-green-500/20 text-green-100'
                : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <div className="text-2xl mb-2">🎓</div>
            <h4 className="font-semibold mb-1">Import Students</h4>
            <p className="text-sm opacity-80">Bulk import student data from CSV</p>
          </button>
          
          <button
            onClick={() => setImportType('enrollments')}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              importType === 'enrollments'
                ? 'border-green-500 bg-green-500/20 text-green-100'
                : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <div className="text-2xl mb-2">📚</div>
            <h4 className="font-semibold mb-1">Import Enrollments</h4>
            <p className="text-sm opacity-80">Bulk import course enrollments from CSV</p>
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* File Input */}
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              id="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Need a template?</h4>
            <p className="text-sm text-blue-800 mb-3">
              Download a CSV template with the correct format for {importType} import.
            </p>
            <button
              onClick={downloadTemplate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Download Template
            </button>
          </div>

          {/* Import Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Import Instructions</h4>
            {importType === 'students' ? (
              <div className="text-sm text-gray-700 space-y-1">
                <p>• CSV must have headers: email, name, studentId, schoolId</p>
                <p>• All fields are required</p>
                <p>• Email must be unique</p>
                <p>• Student ID must be unique</p>
                <p>• School ID must exist in the system</p>
              </div>
            ) : (
              <div className="text-sm text-gray-700 space-y-1">
                <p>• CSV must have headers: studentId, courseId, semesterId</p>
                <p>• All fields are required</p>
                <p>• Student ID must exist in the system</p>
                <p>• Course ID must exist in the system</p>
                <p>• Semester ID can be omitted (will use current semester)</p>
              </div>
            )}
          </div>

          {/* Import Results */}
          {importResults && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">Import Results</h4>
              <div className="text-sm text-green-800">
                {importType === 'students' ? (
                  <p>Successfully imported {importResults.imported} students</p>
                ) : (
                  <p>Successfully created {importResults.created} enrollments</p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center space-x-4 pt-6">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Importing...</span>
                </div>
              ) : (
                'Import Data'
              )}
            </button>
            
            <Link
              href={`/admin/semesters/${semesterId}`}
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
