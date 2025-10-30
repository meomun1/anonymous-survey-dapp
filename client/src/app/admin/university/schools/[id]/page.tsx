'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import { SchoolModal, SchoolFormData } from
'@/components/admin/modals/SchoolModal';
import { TeacherModal, TeacherFormData } from
'@/components/admin/modals/TeacherModal';
import { StudentModal, StudentFormData } from
'@/components/admin/modals/StudentModal';
import { CourseModal, CourseFormData } from
'@/components/admin/modals/CourseModal';
import { ConfirmDialog } from '@/components/admin/modals/ConfirmDialog';

interface School {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  schoolId: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string;
  schoolId: string;
  status: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  credits?: number;
  schoolId: string;
  description?: string;
}

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'teachers' | 'students' |
'courses'>('teachers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Modal states
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });

  // Edit states
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const schoolId = params.id as string;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSchoolData();
  }, [schoolId]);

  const loadSchoolData = async () => {
    try {
      setLoading(true);
      const schoolRes = await apiClient.get(`/university/schools/${schoolId}`);
      setSchool(schoolRes.data);

      const [teachersRes, studentsRes, coursesRes] = await Promise.all([
        apiClient.get(`/university/teachers?schoolId=${schoolId}`),
        apiClient.get(`/university/students?schoolId=${schoolId}`),
        apiClient.get(`/university/courses?schoolId=${schoolId}`)
      ]);

      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load school data:', err);
      setError('Failed to load school data');
    } finally {
      setLoading(false);
    }
  };

  // School handlers
  const handleUpdateSchool = async (data: SchoolFormData) => {
    await apiClient.put(`/university/schools/${schoolId}`, data);
    await loadSchoolData();
  };

  const handleDeleteSchool = async () => {
    await apiClient.delete(`/university/schools/${schoolId}`);
    router.push('/admin/university');
  };

  // Teacher handlers
  const handleCreateTeacher = async (data: TeacherFormData) => {
    await apiClient.post('/university/teachers', data);
    await loadSchoolData();
  };

  const handleUpdateTeacher = async (data: TeacherFormData) => {
    await apiClient.put(`/university/teachers/${editingTeacher!.id}`, data);
    setEditingTeacher(null);
    await loadSchoolData();
  };

  const handleDeleteTeacher = async (id: string) => {
    await apiClient.delete(`/university/teachers/${id}`);
    await loadSchoolData();
  };

  // Student handlers
  const handleCreateStudent = async (data: StudentFormData) => {
    await apiClient.post('/university/students', data);
    await loadSchoolData();
  };

  const handleUpdateStudent = async (data: StudentFormData) => {
    await apiClient.put(`/university/students/${editingStudent!.id}`, data);
    setEditingStudent(null);
    await loadSchoolData();
  };

  const handleDeleteStudent = async (id: string) => {
    await apiClient.delete(`/university/students/${id}`);
    await loadSchoolData();
  };

  // Course handlers
  const handleCreateCourse = async (data: CourseFormData) => {
    await apiClient.post('/university/courses', data);
    await loadSchoolData();
  };

  const handleUpdateCourse = async (data: CourseFormData) => {
    await apiClient.put(`/university/courses/${editingCourse!.id}`, data);
    setEditingCourse(null);
    await loadSchoolData();
  };

  const handleDeleteCourse = async (id: string) => {
    await apiClient.delete(`/university/courses/${id}`);
    await loadSchoolData();
  };

  if (!isAuthenticated() || !school) {
    return null;
  }

  const tabs = [
    { id: 'teachers', label: 'Teachers', count: teachers.length, icon: '👩‍🏫' },
    { id: 'students', label: 'Students', count: students.length, icon: '🎓' },
    { id: 'courses', label: 'Courses', count: courses.length, icon: '📚' },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/admin/university" className="text-white/60 hover:text-white text-sm transition-colors">
          ← Back to Schools
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🏫</span>
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{school.name}</h1>
                <span className="px-3 py-1 bg-white/20 text-white text-sm font-semibold rounded-full">
                  {school.code}
                </span>
              </div>
              {school.description && (
                <p className="text-white/70">{school.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/admin/university/schools/${schoolId}/import`}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Import Data
            </Link>
            <button 
            onClick={() => setIsSchoolModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg">
              Edit School
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'bg-white/20 text-white'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'teachers' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Teachers ({teachers.length})</h2>
                  <button 
                  onClick={() => { setEditingTeacher(null); setIsTeacherModalOpen(true); }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Add Teacher
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teachers.map((teacher) => (
                        <tr key={teacher.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                            onClick={() => { setEditingTeacher(teacher); setIsTeacherModalOpen(true); }}
                            className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                            <button 
                            onClick={() => setConfirmDialog({
                              isOpen: true,
                              title: 'Delete Teacher',
                              message: `Are you sure you want to delete ${teacher.name}?`,
                              onConfirm: async () => await handleDeleteTeacher(teacher.id)
                            })}
                            className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {teachers.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No teachers found in this school</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Students ({students.length})</h2>
                  <button
                    onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add Student
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.studentId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                            onClick={() => { setEditingStudent(student); setIsStudentModalOpen(true); }}
                            className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                            <button
                            onClick={() => setConfirmDialog({
                              isOpen: true,
                              title: 'Delete Student',
                              message: `Are you sure you want to delete ${student.name}?`,
                              onConfirm: async () => await handleDeleteStudent(student.id)
                            })}
                            className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No students found in this school</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Courses ({courses.length})</h2>
                  <button
                    onClick={() => { setEditingCourse(null); setIsCourseModalOpen(true); }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Add Course
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {courses.map((course) => (
                        <tr key={course.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.credits || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                            onClick={() => { setEditingCourse(course); setIsCourseModalOpen(true); }}
                            className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                            <button
                            onClick={() => setConfirmDialog({
                              isOpen: true,
                              title: 'Delete Course',
                              message: `Are you sure you want to delete ${course.code}?`,
                              onConfirm: async () => await handleDeleteCourse(course.id)
                            })}
                            className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {courses.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No courses found in this school</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <SchoolModal
      isOpen={isSchoolModalOpen}
      onClose={() => setIsSchoolModalOpen(false)}
      onSubmit={handleUpdateSchool}
      school={school}
    />

    <TeacherModal
      isOpen={isTeacherModalOpen}
      onClose={() => { setIsTeacherModalOpen(false); setEditingTeacher(null); }}
      onSubmit={editingTeacher ? handleUpdateTeacher : handleCreateTeacher}
      teacher={editingTeacher}
      schoolId={schoolId}
    />

    <StudentModal
      isOpen={isStudentModalOpen}
      onClose={() => { setIsStudentModalOpen(false); setEditingStudent(null); }}
      onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent}
      student={editingStudent}
      schoolId={schoolId}
    />

    <CourseModal
      isOpen={isCourseModalOpen}
      onClose={() => { setIsCourseModalOpen(false); setEditingCourse(null); }}
      onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse}
      course={editingCourse}
      schoolId={schoolId}
    />

    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      onConfirm={confirmDialog.onConfirm}
      title={confirmDialog.title}
      message={confirmDialog.message}
      confirmText="Delete"
      type="danger"
    />

    </div>
  );
}
