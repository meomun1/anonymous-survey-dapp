import { apiClient } from './client';
import { AxiosResponse } from 'axios';

// ============================================================================
// SCHOOL INTERFACES
// ============================================================================
export interface School {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolData {
  name: string;
  code: string;
  description?: string;
}

// ============================================================================
// TEACHER INTERFACES
// ============================================================================
export interface Teacher {
  id: string;
  name: string;
  email: string;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherData {
  name: string;
  email: string;
  schoolId: string;
}

// ============================================================================
// COURSE INTERFACES
// ============================================================================
export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits?: number;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseData {
  code: string;
  name: string;
  description?: string;
  credits?: number;
  schoolId: string;
}

// ============================================================================
// STUDENT INTERFACES
// ============================================================================
export interface Student {
  id: string;
  email: string;
  name: string;
  studentId: string;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  status: 'active' | 'graduated' | 'transferred' | 'suspended' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentData {
  email: string;
  name: string;
  studentId: string;
  schoolId: string;
}

export interface BulkImportStudentsData {
  students: CreateStudentData[];
}

// ============================================================================
// SEMESTER INTERFACES
// ============================================================================
export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSemesterData {
  name: string;
  startDate: string;
  endDate: string;
  status?: string;
}

// ============================================================================
// COURSE ASSIGNMENT INTERFACES
// ============================================================================
export interface CourseAssignment {
  id: string;
  teacherId: string;
  courseId: string;
  semesterId: string;
  course?: Course;
  semester?: Semester;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseAssignmentData {
  teacherId: string;
  courseId: string;
  semesterId: string;
}

// ============================================================================
// ENROLLMENT INTERFACES
// ============================================================================
export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  course?: Course;
  semester?: Semester;
  student?: Student;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnrollmentData {
  studentId: string;
  courseId: string;
  semesterId: string;
}

export interface BulkImportEnrollmentsData {
  enrollments: CreateEnrollmentData[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================
export const universityApi = {
  // ============================================================================
  // SCHOOLS
  // ============================================================================
  schools: {
    getAll: (): Promise<AxiosResponse<School[]>> => apiClient.get('/university/schools'),
    getById: (id: string): Promise<AxiosResponse<School>> => apiClient.get(`/university/schools/${id}`),
    create: (data: CreateSchoolData): Promise<AxiosResponse<School>> => apiClient.post('/university/schools', data),
    update: (id: string, data: Partial<CreateSchoolData>): Promise<AxiosResponse<School>> => 
      apiClient.put(`/university/schools/${id}`, data),
    delete: (id: string): Promise<AxiosResponse<School>> => apiClient.delete(`/university/schools/${id}`),
  },

  // ============================================================================
  // TEACHERS
  // ============================================================================
  teachers: {
    getAll: (schoolId?: string): Promise<AxiosResponse<Teacher[]>> => {
      const params = schoolId ? `?schoolId=${schoolId}` : '';
      return apiClient.get(`/university/teachers${params}`);
    },
    getById: (id: string): Promise<AxiosResponse<Teacher>> => apiClient.get(`/university/teachers/${id}`),
    create: (data: CreateTeacherData): Promise<AxiosResponse<Teacher>> => apiClient.post('/university/teachers', data),
    update: (id: string, data: Partial<CreateTeacherData>): Promise<AxiosResponse<Teacher>> => 
      apiClient.put(`/university/teachers/${id}`, data),
    delete: (id: string): Promise<AxiosResponse<Teacher>> => apiClient.delete(`/university/teachers/${id}`),
    getAssignments: (id: string, semesterId?: string): Promise<AxiosResponse<CourseAssignment[]>> => {
      const params = semesterId ? `?semesterId=${semesterId}` : '';
      return apiClient.get(`/university/teachers/${id}/assignments${params}`);
    },
  },

  // ============================================================================
  // COURSES
  // ============================================================================
  courses: {
    getAll: (schoolId?: string): Promise<AxiosResponse<Course[]>> => {
      const params = schoolId ? `?schoolId=${schoolId}` : '';
      return apiClient.get(`/university/courses${params}`);
    },
    getById: (id: string): Promise<AxiosResponse<Course>> => apiClient.get(`/university/courses/${id}`),
    create: (data: CreateCourseData): Promise<AxiosResponse<Course>> => apiClient.post('/university/courses', data),
    update: (id: string, data: Partial<CreateCourseData>): Promise<AxiosResponse<Course>> => 
      apiClient.put(`/university/courses/${id}`, data),
    delete: (id: string): Promise<AxiosResponse<Course>> => apiClient.delete(`/university/courses/${id}`),
  },

  // ============================================================================
  // STUDENTS
  // ============================================================================
  students: {
    getAll: (schoolId?: string): Promise<AxiosResponse<Student[]>> => {
      const params = schoolId ? `?schoolId=${schoolId}` : '';
      return apiClient.get(`/university/students${params}`);
    },
    getById: (id: string): Promise<AxiosResponse<Student>> => apiClient.get(`/university/students/${id}`),
    create: (data: CreateStudentData): Promise<AxiosResponse<Student>> => apiClient.post('/university/students', data),
    update: (id: string, data: Partial<CreateStudentData>): Promise<AxiosResponse<Student>> => 
      apiClient.put(`/university/students/${id}`, data),
    delete: (id: string): Promise<AxiosResponse<Student>> => apiClient.delete(`/university/students/${id}`),
    bulkImport: (data: BulkImportStudentsData): Promise<AxiosResponse<{ imported: number; students: Student[] }>> => 
      apiClient.post('/university/students/bulk-import', data),
  },

  // ============================================================================
  // SEMESTERS
  // ============================================================================
  semesters: {
    getAll: (): Promise<AxiosResponse<Semester[]>> => apiClient.get('/university/semesters'),
    getById: (id: string): Promise<AxiosResponse<Semester>> => apiClient.get(`/university/semesters/${id}`),
    create: (data: CreateSemesterData): Promise<AxiosResponse<Semester>> => apiClient.post('/university/semesters', data),
    update: (id: string, data: Partial<CreateSemesterData>): Promise<AxiosResponse<Semester>> => 
      apiClient.put(`/university/semesters/${id}`, data),
    delete: (id: string): Promise<AxiosResponse<Semester>> => apiClient.delete(`/university/semesters/${id}`),
  },

  // ============================================================================
  // COURSE ASSIGNMENTS
  // ============================================================================
  courseAssignments: {
    getAll: (filters?: { teacherId?: string; courseId?: string; semesterId?: string }): Promise<AxiosResponse<CourseAssignment[]>> => {
      const params = new URLSearchParams();
      if (filters?.teacherId) params.append('teacherId', filters.teacherId);
      if (filters?.courseId) params.append('courseId', filters.courseId);
      if (filters?.semesterId) params.append('semesterId', filters.semesterId);
      
      const queryString = params.toString();
      return apiClient.get(`/university/course-assignments${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id: string): Promise<AxiosResponse<CourseAssignment>> => apiClient.get(`/university/course-assignments/${id}`),
    create: (data: CreateCourseAssignmentData): Promise<AxiosResponse<CourseAssignment>> => 
      apiClient.post('/university/course-assignments', data),
    update: (id: string, data: Partial<CreateCourseAssignmentData>): Promise<AxiosResponse<CourseAssignment>> => 
      apiClient.put(`/university/course-assignments/${id}`, data),
    delete: (id: string): Promise<AxiosResponse<CourseAssignment>> => 
      apiClient.delete(`/university/course-assignments/${id}`),
  },

  // ============================================================================
  // ENROLLMENTS
  // ============================================================================
  enrollments: {
    getAll: (filters?: { studentId?: string; courseId?: string; semesterId?: string }): Promise<AxiosResponse<Enrollment[]>> => {
      const params = new URLSearchParams();
      if (filters?.studentId) params.append('studentId', filters.studentId);
      if (filters?.courseId) params.append('courseId', filters.courseId);
      if (filters?.semesterId) params.append('semesterId', filters.semesterId);
      
      const queryString = params.toString();
      return apiClient.get(`/university/enrollments${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id: string): Promise<AxiosResponse<Enrollment>> => apiClient.get(`/university/enrollments/${id}`),
    create: (data: CreateEnrollmentData): Promise<AxiosResponse<Enrollment>> => 
      apiClient.post('/university/enrollments', data),
    update: (id: string, data: Partial<CreateEnrollmentData>): Promise<AxiosResponse<Enrollment>> => 
      apiClient.put(`/university/enrollments/${id}`, data),
    delete: (id: string): Promise<AxiosResponse<Enrollment>> => apiClient.delete(`/university/enrollments/${id}`),
    bulkImport: (data: BulkImportEnrollmentsData): Promise<AxiosResponse<{ created: number; rows: Enrollment[] }>> => 
      apiClient.post('/university/enrollments/bulk-import', data),
  },
};
