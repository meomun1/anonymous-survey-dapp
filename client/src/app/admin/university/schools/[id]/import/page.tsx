'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';

export default function SchoolDataImportPage() {
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importType, setImportType] = useState<'teachers' | 'students' | 'courses'>('students');
  const [file, setFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const router = useRouter();
  const params = useParams();
  const schoolId = params.id as string;
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSchool();
  }, [schoolId]);

  const loadSchool = async () => {
    try {
      const response = await apiClient.get(`/university/schools/${schoolId}`);
      setSchool(response.data);
    } catch (err: any) {
      console.error('Failed to load school:', err);
      setError('Failed to load school');
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
        // Expected headers: email, name, studentId
        const students = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            email: values[0],
            name: values[1],
            studentId: values[2],
            schoolId: schoolId // Automatically use the current school
          };
        });

        // Bulk import students
        const result = await apiClient.post('/university/students/bulk-import', { students });
        setImportResults(result.data);
        setSuccess(`Successfully imported ${result.data.imported} students to ${school?.name}`);
      } else if (importType === 'teachers') {
        // Expected headers: name, email
        const teachers = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            name: values[0],
            email: values[1],
            schoolId: schoolId // Automatically use the current school
          };
        });

        // Bulk import teachers
        const result = await apiClient.post('/university/teachers/bulk-import', { teachers });
        setImportResults(result.data);
        setSuccess(`Successfully imported ${result.data.imported} teachers to ${school?.name}`);
      } else if (importType === 'courses') {
        // Expected headers: code, name, description, credits
        const courses = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            code: values[0],
            name: values[1],
            description: values[2] || '',
            credits: parseInt(values[3]) || 3,
            schoolId: schoolId // Automatically use the current school
          };
        });

        // Bulk import courses
        const result = await apiClient.post('/university/courses/bulk-import', { courses });
        setImportResults(result.data);
        setSuccess(`Successfully imported ${result.data.imported} courses to ${school?.name}`);
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
      csvContent = 'email,name,studentId\n';
      csvContent += 'john.doe@university.edu,John Doe,STU001\n';
      csvContent += 'jane.smith@university.edu,Jane Smith,STU002\n';
      filename = 'students_template.csv';
    } else if (importType === 'teachers') {
      csvContent = 'name,email\n';
      csvContent += 'Dr. John Smith,john.smith@university.edu\n';
      csvContent += 'Dr. Jane Doe,jane.doe@university.edu\n';
      filename = 'teachers_template.csv';
    } else if (importType === 'courses') {
      csvContent = 'code,name,description,credits\n';
      csvContent += 'CS101,Introduction to Computer Science,Basic programming concepts,3\n';
      csvContent += 'MATH201,Calculus II,Advanced calculus topics,4\n';
      filename = 'courses_template.csv';
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Import Data</h1>
          <p className="text-white/80 mt-2">
            {school && `Import teachers, students, and courses for ${school.name}`}
          </p>
        </div>

        <Link
          href={`/admin/university/schools/${schoolId}`}
          className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{school?.name || 'School'}</span>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Left Column - Import Type Selection */}
        <div className="flex-1">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 h-full">
            <h3 className="text-lg font-semibold text-white mb-4">Select Import Type</h3>
            <div className="space-y-4">
              <button
                onClick={() => setImportType('teachers')}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  importType === 'teachers'
                    ? 'border-green-500 bg-green-500/20 text-green-100'
                    : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">👨‍🏫</div>
                  <div className="text-left">
                    <h4 className="font-semibold">Import Teachers</h4>
                    <p className="text-sm opacity-80">Bulk import teachers for this school</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setImportType('students')}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  importType === 'students'
                    ? 'border-green-500 bg-green-500/20 text-green-100'
                    : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🎓</div>
                  <div className="text-left">
                    <h4 className="font-semibold">Import Students</h4>
                    <p className="text-sm opacity-80">Bulk import students for this school</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setImportType('courses')}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  importType === 'courses'
                    ? 'border-green-500 bg-green-500/20 text-green-100'
                    : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📚</div>
                  <div className="text-left">
                    <h4 className="font-semibold">Import Courses</h4>
                    <p className="text-sm opacity-80">Bulk import courses for this school</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - File Upload */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            <div className="space-y-4 flex-1 flex flex-col">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200 hover:border-purple-400"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-1 text-sm text-gray-600">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">CSV files only</p>
                    </div>
                  </label>
                </div>
                {file && (
                  <div className="mt-2 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                        const input = document.getElementById('file') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Need a template?</h4>
                <p className="text-xs text-blue-800 mb-2">
                  Download a CSV template with the correct format for {importType} import.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 transition-colors"
                >
                  Download Template
                </button>
              </div>

              {/* Import Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-1.5">Import Instructions</h4>
                {importType === 'students' ? (
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <p>• CSV headers: <strong>email, name, studentId</strong></p>
                    <p>• All fields are required</p>
                    <p>• Email must be unique</p>
                    <p>• Student ID must be unique</p>
                    <p>• Importing to: <strong>{school?.name}</strong></p>
                  </div>
                ) : importType === 'teachers' ? (
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <p>• CSV headers: <strong>name, email</strong></p>
                    <p>• All fields are required</p>
                    <p>• Email must be unique</p>
                    <p>• Importing to: <strong>{school?.name}</strong></p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <p>• CSV headers: <strong>code, name, description, credits</strong></p>
                    <p>• Code and name are required</p>
                    <p>• Course code must be unique</p>
                    <p>• Credits defaults to 3 if not specified</p>
                    <p>• Importing to: <strong>{school?.name}</strong></p>
                  </div>
                )}
              </div>

              {/* Import Results */}
              {importResults && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-900 mb-1">Import Results</h4>
                  <div className="text-xs text-green-800">
                    <p>Successfully imported {importResults.imported} {importType}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center space-x-4 pt-4 mt-auto">
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
                  href={`/admin/university/schools/${schoolId}`}
                  className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
