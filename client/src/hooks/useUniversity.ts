import { useState, useCallback } from 'react';
import { 
  universityApi, 
  School, 
  Teacher, 
  Course, 
  Student, 
  Semester,
  CourseAssignment,
  Enrollment,
  CreateSchoolData,
  CreateTeacherData,
  CreateCourseData,
  CreateStudentData,
  CreateSemesterData,
  CreateCourseAssignmentData,
  CreateEnrollmentData,
  BulkImportStudentsData,
  BulkImportEnrollmentsData
} from '@/lib/api/university';

export const useUniversity = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // SCHOOLS
  // ============================================================================
  const [schools, setSchools] = useState<School[]>([]);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.schools.getAll();
      setSchools(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schools';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchool = useCallback(async (data: CreateSchoolData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.schools.create(data);
      setSchools(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create school';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // TEACHERS
  // ============================================================================
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const fetchTeachers = useCallback(async (schoolId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.teachers.getAll(schoolId);
      setTeachers(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teachers';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTeacher = useCallback(async (data: CreateTeacherData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.teachers.create(data);
      setTeachers(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create teacher';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTeacherAssignments = useCallback(async (teacherId: string, semesterId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.teachers.getAssignments(teacherId, semesterId);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teacher assignments';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // COURSES
  // ============================================================================
  const [courses, setCourses] = useState<Course[]>([]);

  const fetchCourses = useCallback(async (schoolId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.courses.getAll(schoolId);
      setCourses(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCourse = useCallback(async (data: CreateCourseData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.courses.create(data);
      setCourses(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create course';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // STUDENTS
  // ============================================================================
  const [students, setStudents] = useState<Student[]>([]);

  const fetchStudents = useCallback(async (schoolId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.students.getAll(schoolId);
      setStudents(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch students';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createStudent = useCallback(async (data: CreateStudentData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.students.create(data);
      setStudents(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create student';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkImportStudents = useCallback(async (data: BulkImportStudentsData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.students.bulkImport(data);
      setStudents(prev => [...prev, ...response.data.students]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk import students';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // SEMESTERS
  // ============================================================================
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const fetchSemesters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.semesters.getAll();
      setSemesters(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch semesters';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSemester = useCallback(async (data: CreateSemesterData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.semesters.create(data);
      setSemesters(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create semester';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // COURSE ASSIGNMENTS
  // ============================================================================
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([]);

  const fetchCourseAssignments = useCallback(async (filters?: { teacherId?: string; courseId?: string; semesterId?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.courseAssignments.getAll(filters);
      setCourseAssignments(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch course assignments';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCourseAssignment = useCallback(async (data: CreateCourseAssignmentData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.courseAssignments.create(data);
      setCourseAssignments(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create course assignment';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCourseAssignment = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await universityApi.courseAssignments.delete(id);
      setCourseAssignments(prev => prev.filter(assignment => assignment.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete course assignment';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // ENROLLMENTS
  // ============================================================================
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const fetchEnrollments = useCallback(async (filters?: { studentId?: string; courseId?: string; semesterId?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.enrollments.getAll(filters);
      setEnrollments(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch enrollments';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createEnrollment = useCallback(async (data: CreateEnrollmentData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.enrollments.create(data);
      setEnrollments(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create enrollment';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEnrollment = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await universityApi.enrollments.delete(id);
      setEnrollments(prev => prev.filter(enrollment => enrollment.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete enrollment';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkImportEnrollments = useCallback(async (data: BulkImportEnrollmentsData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await universityApi.enrollments.bulkImport(data);
      setEnrollments(prev => [...prev, ...response.data.rows]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk import enrollments';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    
    // Schools
    schools,
    fetchSchools,
    createSchool,
    
    // Teachers
    teachers,
    fetchTeachers,
    createTeacher,
    getTeacherAssignments,
    
    // Courses
    courses,
    fetchCourses,
    createCourse,
    
    // Students
    students,
    fetchStudents,
    createStudent,
    bulkImportStudents,
    
    // Semesters
    semesters,
    fetchSemesters,
    createSemester,
    
    // Course Assignments
    courseAssignments,
    fetchCourseAssignments,
    createCourseAssignment,
    deleteCourseAssignment,
    
    // Enrollments
    enrollments,
    fetchEnrollments,
    createEnrollment,
    deleteEnrollment,
    bulkImportEnrollments,
  };
};
