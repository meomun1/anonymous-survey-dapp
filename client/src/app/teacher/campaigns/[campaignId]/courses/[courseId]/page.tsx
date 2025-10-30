'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUniversity } from '@/hooks/useUniversity';
import { Campaign } from '@/lib/api/campaigns';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface CourseAssignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  schoolName: string;
  teacherId: string;
  campaignId: string;
}

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseAssignmentId: string;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  schoolId: string;
  schoolName: string;
}

export default function TeacherStudentEnrollmentPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [courseAssignment, setCourseAssignment] = useState<CourseAssignment | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null);
  const [enrollmentMode, setEnrollmentMode] = useState<'select' | 'import'>('select');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const courseId = params.courseId as string;

  const { isAuthenticated, hasRole, getUser } = useAuth();
  const { fetchStudents } = useUniversity();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (!isAuthenticated() || !hasRole('teacher')) {
      router.push('/login/teacher');
      return;
    }

    // Clear state when campaign or course changes to prevent showing stale data
    setCampaign(null);
    setCourseAssignment(null);
    setEnrollments([]);
    setAvailableStudents([]);
    setSelectedStudents(new Set());
    setSearchText('');
    setError('');
    setSuccess('');
    setImportResults(null);

    loadData();
  }, [isClient, campaignId, courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');
      const user = getUser();

      // Load campaign
      const campaignResponse = await apiClient.get(`/campaigns/${campaignId}`);
      setCampaign(campaignResponse.data);

      // Load course assignment using semester ID
      if (!campaignResponse.data.semesterId) {
        setError('Campaign semester information is missing');
        setLoading(false);
        return;
      }

      const assignmentsResponse = await apiClient.get(
        `/university/course-assignments?teacherId=${user?.id}&semesterId=${campaignResponse.data.semesterId}`
      );

      // Transform snake_case to camelCase
      const assignments = (assignmentsResponse.data || []).map((a: any) => ({
        id: a.id,
        teacherId: a.teacher_id,
        courseId: a.course_id,
        courseCode: a.course_code,
        courseName: a.course_name,
        semesterId: a.semester_id,
        createdAt: a.created_at
      }));

      const assignment = assignments.find((a: CourseAssignment) => a.courseId === courseId);

      if (!assignment) {
        setError('Course assignment not found');
        setLoading(false);
        return;
      }

      setCourseAssignment(assignment);

      // Load enrollments for this course in this campaign (campaign-specific)
      try {
        const enrollmentsResponse = await apiClient.get(
          `/university/enrollments?courseId=${assignment.courseId}&campaignId=${campaignId}`
        );
        setEnrollments(enrollmentsResponse.data || []);
      } catch (err) {
        setEnrollments([]);
      }

      // Load students filtered by teacher's school
      const studentsData = await fetchStudents(user?.schoolId);
      setAvailableStudents(studentsData as Student[]);

    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSaveEnrollments = async () => {
    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    if (!courseAssignment || !campaign) {
      setError('Course assignment not found');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { apiClient } = await import('@/lib/api/client');

      // Create enrollments for selected students (campaign-specific)
      const promises = Array.from(selectedStudents).map(studentId =>
        apiClient.post('/university/enrollments', {
          studentId,
          courseId: courseAssignment.courseId,
          campaignId: campaign.id,
          semesterId: campaign.semesterId
        })
      );

      await Promise.all(promises);
      setSuccess(`Successfully enrolled ${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''}`);

      // Reload enrollments
      await loadData();

      // Clear selection
      setSelectedStudents(new Set());
      setSearchText('');
    } catch (err: any) {
      console.error('Failed to save enrollments:', err);
      setError(err.message || 'Failed to save student enrollments');
    } finally {
      setSaving(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    if (!courseAssignment || !campaign) {
      setError('Course assignment not found');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setImportResults(null);

      // Parse CSV file
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header row and get student IDs
      const studentIds = lines.slice(1).map(line => line.trim()).filter(id => id);

      if (studentIds.length === 0) {
        setError('No student IDs found in CSV file');
        setSaving(false);
        return;
      }

      // Find matching students by student ID and skip already enrolled students
      const enrollments = [];
      const notFound = [];
      const alreadyEnrolled = [];

      for (const studentId of studentIds) {
        const student = availableStudents.find(s => s.id === studentId);
        if (!student) {
          notFound.push(studentId);
        } else if (enrolledStudentIds.has(student.id)) {
          alreadyEnrolled.push(studentId);
        } else {
          enrollments.push({
            studentId: student.id,
            courseId: courseAssignment.courseId,
            campaignId: campaign.id,
            semesterId: campaign.semesterId
          });
        }
      }

      if (enrollments.length === 0) {
        if (alreadyEnrolled.length > 0 && notFound.length === 0) {
          setError('All students in the CSV are already enrolled');
        } else {
          setError('No valid student IDs found to enroll');
        }
        setImportResults({
          imported: 0,
          alreadyEnrolled: alreadyEnrolled.length > 0 ? alreadyEnrolled : null,
          notFound: notFound.length > 0 ? notFound : null
        });
        setSaving(false);
        return;
      }

      // Bulk import enrollments
      const { apiClient } = await import('@/lib/api/client');
      const result = await apiClient.post('/university/enrollments/bulk-import', { enrollments });

      setImportResults({
        imported: enrollments.length,
        alreadyEnrolled: alreadyEnrolled.length > 0 ? alreadyEnrolled : null,
        notFound: notFound.length > 0 ? notFound : null
      });
      setSuccess(`Successfully enrolled ${enrollments.length} student${enrollments.length !== 1 ? 's' : ''}`);

      // Reload enrollments
      await loadData();

      // Clear file
      setCsvFile(null);
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error('Failed to import enrollments:', err);
      setError(err.message || 'Failed to import student enrollments');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEnrollment = async () => {
    if (!enrollmentToDelete) return;

    try {
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.delete(`/university/enrollments/${enrollmentToDelete}`);

      // Reload enrollments
      await loadData();

      setShowConfirmDelete(false);
      setEnrollmentToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete enrollment:', err);
      setError('Failed to delete student enrollment');
    }
  };

  const confirmDelete = (enrollmentId: string) => {
    setEnrollmentToDelete(enrollmentId);
    setShowConfirmDelete(true);
  };

  // Filter out already enrolled students
  const enrolledStudentIds = new Set(enrollments.map(e => e.studentId));
  const unenrolledStudents = availableStudents.filter(s => !enrolledStudentIds.has(s.id));

  // Filter by search text
  const filteredStudents = unenrolledStudents.filter(student => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      student.name.toLowerCase().includes(search) ||
      student.email.toLowerCase().includes(search) ||
      student.schoolName.toLowerCase().includes(search)
    );
  });

  // Prevent hydration mismatch by waiting for client
  if (!isClient) {
    return null;
  }

  if (!isAuthenticated() || !hasRole('teacher')) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner message="Loading student enrollments..." fullScreen />;
  }

  if (!campaign || !courseAssignment) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-white mb-2">
          {!campaign ? 'Campaign Not Found' : 'Course Assignment Not Found'}
        </h2>
        <Link
          href={`/teacher/campaigns/${campaignId}`}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Course Assignments
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Student Enrollments</h1>
          <p className="text-white/80 mt-2">{courseAssignment.courseCode} - {courseAssignment.courseName}</p>
        </div>
        <Link
          href={`/teacher/campaigns/${campaignId}`}
          className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Courses</span>
        </Link>
      </div>

      {/* Current Enrollments */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Enrolled Students ({enrollments.length})
          </h3>
        </div>
        <div className="p-6">
          {enrollments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎓</div>
              <p className="text-gray-600">No students enrolled yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add students below to enroll them in this course
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrolled Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{enrollment.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{enrollment.studentEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(enrollment.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => confirmDelete(enrollment.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Students */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Add Students ({unenrolledStudents.length} available)
          </h3>

          {/* Tabs */}
          <div className="flex space-x-4">
            <button
              onClick={() => setEnrollmentMode('select')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                enrollmentMode === 'select'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Select Students
            </button>
            <button
              onClick={() => setEnrollmentMode('import')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                enrollmentMode === 'import'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Import CSV
            </button>
          </div>
        </div>
        <div className="p-6">
          {enrollmentMode === 'select' ? (
            unenrolledStudents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-gray-600">All available students have been enrolled</p>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by name, email, or school..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No students match your search</p>
                </div>
              ) : (
                <>
                  {/* Student List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => handleToggleStudent(student.id)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedStudents.has(student.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {student.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{student.email}</p>
                            <p className="text-xs text-gray-500">
                              School: {student.schoolName}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            selectedStudents.has(student.id)
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedStudents.has(student.id) && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  {selectedStudents.size > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedStudents(new Set())}
                          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          Clear Selection
                        </button>
                        <button
                          onClick={handleSaveEnrollments}
                          disabled={saving}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Enrolling...' : `Enroll ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              </>
            )
          ) : (
            <>
              {/* CSV Import Mode */}
              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="csvFile"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCsvFile(file);
                          setError('');
                          setSuccess('');
                          setImportResults(null);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="csvFile"
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
                  {csvFile && (
                    <div className="mt-2 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-2">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-700">{csvFile.name}</span>
                        <span className="text-xs text-gray-500">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setCsvFile(null);
                          const input = document.getElementById('csvFile') as HTMLInputElement;
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Need a template?</h4>
                  <p className="text-xs text-blue-800 mb-3">
                    Download a CSV template with the correct format for student enrollment.
                  </p>
                  <button
                    onClick={() => {
                      const csvContent = 'studentId\n' + unenrolledStudents.slice(0, 3).map(s => s.id).join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'enrollment_template.csv';
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Download Template
                  </button>
                </div>

                {/* Import Instructions */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Import Instructions</h4>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>• CSV header: <strong>studentId</strong></p>
                    <p>• Each row should contain one student ID</p>
                    <p>• Student IDs must match existing students in the system</p>
                    <p>• Students already enrolled will be skipped</p>
                  </div>
                </div>

                {/* Import Results */}
                {importResults && (
                  <div className={`border rounded-lg p-4 ${
                    importResults.imported > 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <h4 className={`text-sm font-medium mb-2 ${
                      importResults.imported > 0 ? 'text-green-900' : 'text-yellow-900'
                    }`}>Import Results</h4>
                    <div className="text-sm space-y-2">
                      {importResults.imported > 0 && (
                        <p className="text-green-800">
                          ✓ Successfully enrolled {importResults.imported} student{importResults.imported !== 1 ? 's' : ''}
                        </p>
                      )}
                      {importResults.alreadyEnrolled && (
                        <p className="text-blue-700">
                          ℹ {importResults.alreadyEnrolled.length} student{importResults.alreadyEnrolled.length !== 1 ? 's' : ''} already enrolled (skipped): {importResults.alreadyEnrolled.join(', ')}
                        </p>
                      )}
                      {importResults.notFound && (
                        <p className="text-orange-700">
                          ⚠ {importResults.notFound.length} student ID{importResults.notFound.length !== 1 ? 's' : ''} not found: {importResults.notFound.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex items-center space-x-4 pt-4">
                  <button
                    onClick={handleCsvImport}
                    disabled={!csvFile || saving}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Importing...</span>
                      </div>
                    ) : (
                      'Import Students'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setCsvFile(null);
                      setImportResults(null);
                      const input = document.getElementById('csvFile') as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                    className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDeleteEnrollment}
        title="Remove Student Enrollment"
        message="Are you sure you want to remove this student from the course? Their survey token (if generated) will also be invalidated."
        confirmText="Remove"
        type="danger"
      />
    </div>
  );
}
