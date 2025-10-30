'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUniversity } from '@/hooks/useUniversity';
import { Campaign } from '@/lib/api/campaigns';
import { CampaignStatus } from '@/components/admin/campaigns/CampaignStatus';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface CourseAssignment {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  teacherId: string;
  campaignId: string;
  createdAt: string;
}

export default function TeacherCourseAssignmentPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<CourseAssignment[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;

  const { isAuthenticated, hasRole, getUser } = useAuth();
  const { fetchCourses } = useUniversity();

  useEffect(() => {
    if (!isAuthenticated() || !hasRole('teacher')) {
      router.push('/login/teacher');
      return;
    }

    // Clear state when campaign changes to prevent showing stale data
    setCampaign(null);
    setAvailableCourses([]);
    setMyAssignments([]);
    setSelectedCourses(new Set());

    loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');
      const user = getUser();

      // Load campaign
      const campaignResponse = await apiClient.get(`/campaigns/${campaignId}`);
      setCampaign(campaignResponse.data);

      // Load courses filtered by teacher's school
      const coursesData = await fetchCourses(user?.schoolId);
      setAvailableCourses(coursesData);

      // Load teacher's course assignments for this campaign (campaign-specific)
      if (user?.id) {
        try {
          const assignmentsResponse = await apiClient.get(
            `/university/course-assignments?teacherId=${user.id}&campaignId=${campaignId}`
          );
          console.log('Assignments response:', assignmentsResponse.data);

          // Transform snake_case to camelCase
          const transformedAssignments = (assignmentsResponse.data || []).map((a: any) => ({
            id: a.id,
            teacherId: a.teacher_id,
            courseId: a.course_id,
            courseCode: a.course_code,
            courseName: a.course_name,
            campaignId: a.campaign_id,
            semesterId: a.semester_id,
            createdAt: a.created_at
          }));

          setMyAssignments(transformedAssignments);
        } catch (err: any) {
          console.error('Failed to load assignments:', err);
          setMyAssignments([]);
        }
      } else {
        console.log('Missing user.id:', { userId: user?.id });
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourses(newSelected);
  };

  const handleSaveAssignments = async () => {
    if (selectedCourses.size === 0) {
      setError('Please select at least one course');
      return;
    }

    if (!campaign?.semesterId || !campaign?.id) {
      setError('Campaign information is missing');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { apiClient } = await import('@/lib/api/client');
      const user = getUser();

      // Create assignments for selected courses (campaign-specific)
      const promises = Array.from(selectedCourses).map(courseId =>
        apiClient.post('/university/course-assignments', {
          teacherId: user?.id,
          courseId,
          campaignId: campaign.id,
          semesterId: campaign.semesterId
        })
      );

      await Promise.all(promises);

      // Reload assignments
      await loadData();

      // Clear selection
      setSelectedCourses(new Set());
    } catch (err: any) {
      console.error('Failed to save assignments:', err);
      setError(err.message || 'Failed to save course assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!courseToDelete) return;

    try {
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.delete(`/university/course-assignments/${courseToDelete}`);

      // Reload assignments
      await loadData();

      setShowConfirmDelete(false);
      setCourseToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete assignment:', err);
      setError('Failed to delete course assignment');
    }
  };

  const confirmDelete = (assignmentId: string) => {
    setCourseToDelete(assignmentId);
    setShowConfirmDelete(true);
  };

  // Filter out already assigned courses
  const assignedCourseIds = new Set(myAssignments.map(a => a.courseId));
  const unassignedCourses = availableCourses.filter(c => !assignedCourseIds.has(c.id));

  if (!isAuthenticated() || !hasRole('teacher')) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner message="Loading course assignments..." fullScreen />;
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-white mb-2">Campaign Not Found</h2>
        <Link
          href="/teacher"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Course Assignments</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-white/80">{campaign.name}</p>
            <CampaignStatus status={campaign.status} size="sm" />
          </div>
        </div>
        <Link
          href="/teacher"
          className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* My Assigned Courses */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            My Assigned Courses ({myAssignments.length})
          </h3>
        </div>
        <div className="p-6">
          {myAssignments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📚</div>
              <p className="text-gray-600">No courses assigned yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Select courses below to add them to your assignment list
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {assignment.courseCode}
                      </h4>
                      <p className="text-sm text-gray-600">{assignment.courseName}</p>
                    </div>
                    <button
                      onClick={() => confirmDelete(assignment.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <Link
                    href={`/teacher/campaigns/${campaignId}/courses/${assignment.courseId}`}
                    className="block w-full bg-purple-600 text-white text-center px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Manage Students
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Courses */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Available Courses ({unassignedCourses.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Select courses you're teaching this semester
          </p>
        </div>
        <div className="p-6">
          {unassignedCourses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-600">All available courses have been assigned</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {unassignedCourses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => handleToggleCourse(course.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedCourses.has(course.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {course.code}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{course.name}</p>
                        <p className="text-xs text-gray-500">
                          School: {course.schoolName}
                        </p>
                        {course.credits && (
                          <p className="text-xs text-gray-500">
                            Credits: {course.credits}
                          </p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        selectedCourses.has(course.id)
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedCourses.has(course.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedCourses.size > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {selectedCourses.size} course{selectedCourses.size !== 1 ? 's' : ''} selected
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedCourses(new Set())}
                      className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleSaveAssignments}
                      disabled={saving}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : `Add ${selectedCourses.size} Course${selectedCourses.size !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDeleteAssignment}
        title="Remove Course Assignment"
        message="Are you sure you want to remove this course assignment? Any student enrollments for this course will also be removed."
        confirmText="Remove"
        type="danger"
      />
    </div>
  );
}
