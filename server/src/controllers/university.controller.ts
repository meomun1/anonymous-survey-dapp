import { Request, Response } from 'express';
import { UniversityService } from '../services/university.service';

const universityService = new UniversityService();

export class UniversityController {
  // ============================================================================
  // SCHOOL MANAGEMENT
  // ============================================================================

  async createSchool(req: Request, res: Response) {
    try {
      const { name, code, description } = req.body;
      
      const school = await universityService.createSchool({
        name,
        code,
        description,
      });

      res.status(201).json(school);
    } catch (error) {
      console.error('Failed to create school:', error);
      res.status(500).json({ error: 'Failed to create school' });
    }
  }

  async getSchools(req: Request, res: Response) {
    try {
      const schools = await universityService.getSchools();
      res.json(schools);
    } catch (error) {
      console.error('Failed to get schools:', error);
      res.status(500).json({ error: 'Failed to get schools' });
    }
  }

  async getSchool(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const school = await universityService.getSchool(id);
      res.json(school);
    } catch (error) {
      console.error('Failed to get school:', error);
      if (error instanceof Error && error.message === 'School not found') {
        return res.status(404).json({ error: 'School not found' });
      }
      res.status(500).json({ error: 'Failed to get school' });
    }
  }

  async updateSchool(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, description } = req.body;
      
      const school = await universityService.updateSchool(id, {
        name,
        code,
        description,
      });

      res.json(school);
    } catch (error) {
      console.error('Failed to update school:', error);
      if (error instanceof Error && error.message === 'School not found') {
        return res.status(404).json({ error: 'School not found' });
      }
      res.status(500).json({ error: 'Failed to update school' });
    }
  }

  async deleteSchool(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const school = await universityService.deleteSchool(id);
      res.json(school);
    } catch (error) {
      console.error('Failed to delete school:', error);
      if (error instanceof Error && error.message === 'School not found') {
        return res.status(404).json({ error: 'School not found' });
      }
      if (error instanceof Error && error.message.includes('Cannot delete school')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete school' });
    }
  }

  // ============================================================================
  // TEACHER MANAGEMENT
  // ============================================================================

  async createTeacher(req: Request, res: Response) {
    try {
      const { name, email, schoolId } = req.body;
      
      const teacher = await universityService.createTeacher({
        name,
        email,
        schoolId,
      });

      res.status(201).json(teacher);
    } catch (error) {
      console.error('Failed to create teacher:', error);
      res.status(500).json({ error: 'Failed to create teacher' });
    }
  }

  async getTeachers(req: Request, res: Response) {
    try {
      const { schoolId } = req.query;
      const teachers = await universityService.getTeachers(schoolId as string);
      res.json(teachers);
    } catch (error) {
      console.error('Failed to get teachers:', error);
      res.status(500).json({ error: 'Failed to get teachers' });
    }
  }

  async getTeacher(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teacher = await universityService.getTeacher(id);
      res.json(teacher);
    } catch (error) {
      console.error('Failed to get teacher:', error);
      if (error instanceof Error && error.message === 'Teacher not found') {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      res.status(500).json({ error: 'Failed to get teacher' });
    }
  }

  async updateTeacher(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, schoolId } = req.body;
      
      const teacher = await universityService.updateTeacher(id, {
        name,
        email,
        schoolId,
      });

      res.json(teacher);
    } catch (error) {
      console.error('Failed to update teacher:', error);
      if (error instanceof Error && error.message === 'Teacher not found') {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      res.status(500).json({ error: 'Failed to update teacher' });
    }
  }

  async deleteTeacher(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teacher = await universityService.deleteTeacher(id);
      res.json(teacher);
    } catch (error) {
      console.error('Failed to delete teacher:', error);
      if (error instanceof Error && error.message === 'Teacher not found') {
        return res.status(404).json({ error: 'Teacher not found' });
      }
      if (error instanceof Error && error.message.includes('Cannot delete teacher')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete teacher' });
    }
  }

  async bulkImportTeachers(req: Request, res: Response) {
    try {
      const { teachers } = req.body;

      if (!Array.isArray(teachers)) {
        return res.status(400).json({ error: 'Teachers must be an array' });
      }

      const result = await universityService.bulkImportTeachers(teachers);
      res.status(201).json(result);
    } catch (error) {
      console.error('Failed to bulk import teachers:', error);
      res.status(500).json({ error: 'Failed to bulk import teachers' });
    }
  }

  // ============================================================================
  // COURSE MANAGEMENT
  // ============================================================================

  async createCourse(req: Request, res: Response) {
    try {
      const { code, name, description, credits, schoolId } = req.body;
      
      const course = await universityService.createCourse({
        code,
        name,
        description,
        credits,
        schoolId,
      });

      res.status(201).json(course);
    } catch (error) {
      console.error('Failed to create course:', error);
      res.status(500).json({ error: 'Failed to create course' });
    }
  }

  async getCourses(req: Request, res: Response) {
    try {
      const { schoolId } = req.query;
      const courses = await universityService.getCourses(schoolId as string);
      res.json(courses);
    } catch (error) {
      console.error('Failed to get courses:', error);
      res.status(500).json({ error: 'Failed to get courses' });
    }
  }

  async getCourse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const course = await universityService.getCourse(id);
      res.json(course);
    } catch (error) {
      console.error('Failed to get course:', error);
      if (error instanceof Error && error.message === 'Course not found') {
        return res.status(404).json({ error: 'Course not found' });
      }
      res.status(500).json({ error: 'Failed to get course' });
    }
  }

  async updateCourse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { code, name, description, credits, schoolId } = req.body;
      
      const course = await universityService.updateCourse(id, {
        code,
        name,
        description,
        credits,
        schoolId,
      });

      res.json(course);
    } catch (error) {
      console.error('Failed to update course:', error);
      if (error instanceof Error && error.message === 'Course not found') {
        return res.status(404).json({ error: 'Course not found' });
      }
      res.status(500).json({ error: 'Failed to update course' });
    }
  }

  async deleteCourse(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const course = await universityService.deleteCourse(id);
      res.json(course);
    } catch (error) {
      console.error('Failed to delete course:', error);
      if (error instanceof Error && error.message === 'Course not found') {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (error instanceof Error && error.message.includes('Cannot delete course')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete course' });
    }
  }

  async bulkImportCourses(req: Request, res: Response) {
    try {
      const { courses } = req.body;

      if (!Array.isArray(courses)) {
        return res.status(400).json({ error: 'Courses must be an array' });
      }

      const result = await universityService.bulkImportCourses(courses);
      res.status(201).json(result);
    } catch (error) {
      console.error('Failed to bulk import courses:', error);
      res.status(500).json({ error: 'Failed to bulk import courses' });
    }
  }

  // ============================================================================
  // STUDENT MANAGEMENT
  // ============================================================================

  async createStudent(req: Request, res: Response) {
    try {
      const { email, name, studentId, schoolId } = req.body;
      
      const student = await universityService.createStudent({
        email,
        name,
        studentId,
        schoolId,
      });

      res.status(201).json(student);
    } catch (error) {
      console.error('Failed to create student:', error);
      res.status(500).json({ error: 'Failed to create student' });
    }
  }

  async getStudents(req: Request, res: Response) {
    try {
      const { schoolId } = req.query;
      const students = await universityService.getStudents(schoolId as string);
      res.json(students);
    } catch (error) {
      console.error('Failed to get students:', error);
      res.status(500).json({ error: 'Failed to get students' });
    }
  }

  async getStudent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const student = await universityService.getStudent(id);
      res.json(student);
    } catch (error) {
      console.error('Failed to get student:', error);
      if (error instanceof Error && error.message === 'Student not found') {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.status(500).json({ error: 'Failed to get student' });
    }
  }

  async updateStudent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email, name, studentId, schoolId } = req.body;
      
      const student = await universityService.updateStudent(id, {
        email,
        name,
        studentId,
        schoolId,
      });

      res.json(student);
    } catch (error) {
      console.error('Failed to update student:', error);
      if (error instanceof Error && error.message === 'Student not found') {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.status(500).json({ error: 'Failed to update student' });
    }
  }

  async deleteStudent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const student = await universityService.deleteStudent(id);
      res.json(student);
    } catch (error) {
      console.error('Failed to delete student:', error);
      if (error instanceof Error && error.message === 'Student not found') {
        return res.status(404).json({ error: 'Student not found' });
      }
      if (error instanceof Error && error.message.includes('Cannot delete student')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete student' });
    }
  }

  async bulkImportStudents(req: Request, res: Response) {
    try {
      const { students } = req.body;
      
      if (!Array.isArray(students)) {
        return res.status(400).json({ error: 'Students must be an array' });
      }

      const result = await universityService.bulkImportStudents(students);
      res.status(201).json(result);
    } catch (error) {
      console.error('Failed to bulk import students:', error);
      res.status(500).json({ error: 'Failed to bulk import students' });
    }
  }

  // ============================================================================
  // SEMESTER MANAGEMENT
  // ============================================================================

  async createSemester(req: Request, res: Response) {
    try {
      const { name, startDate, endDate, status } = req.body;
      
      const semester = await universityService.createSemester({
        name,
        startDate,
        endDate,
        status,
      });

      res.status(201).json(semester);
    } catch (error) {
      console.error('Failed to create semester:', error);
      res.status(500).json({ error: 'Failed to create semester' });
    }
  }

  async getSemesters(req: Request, res: Response) {
    try {
      const semesters = await universityService.getSemesters();
      res.json(semesters);
    } catch (error) {
      console.error('Failed to get semesters:', error);
      res.status(500).json({ error: 'Failed to get semesters' });
    }
  }

  async getSemester(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const semester = await universityService.getSemester(id);
      res.json(semester);
    } catch (error) {
      console.error('Failed to get semester:', error);
      if (error instanceof Error && error.message === 'Semester not found') {
        return res.status(404).json({ error: 'Semester not found' });
      }
      res.status(500).json({ error: 'Failed to get semester' });
    }
  }

  async updateSemester(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, startDate, endDate, status } = req.body;

      const semester = await universityService.updateSemester(id, {
        name,
        startDate,
        endDate,
        status,
      });

      res.json(semester);
    } catch (error) {
      console.error('Failed to update semester:', error);
      if (error instanceof Error && error.message === 'Semester not found') {
        return res.status(404).json({ error: 'Semester not found' });
      }
      res.status(500).json({ error: 'Failed to update semester' });
    }
  }

  async deleteSemester(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const semester = await universityService.deleteSemester(id);
      res.json(semester);
    } catch (error) {
      console.error('Failed to delete semester:', error);
      if (error instanceof Error && error.message === 'Semester not found') {
        return res.status(404).json({ error: 'Semester not found' });
      }
      if (error instanceof Error && error.message.includes('Cannot delete semester')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete semester' });
    }
  }

  // ============================================================================
  // COURSE ASSIGNMENTS MANAGEMENT
  // ============================================================================

  async createCourseAssignment(req: Request, res: Response) {
    try {
      const assignment = await universityService.createCourseAssignment(req.body);
      res.status(201).json(assignment);
    } catch (error) {
      console.error('Failed to create course assignment:', error);
      res.status(500).json({ error: 'Failed to create course assignment' });
    }
  }

  async getCourseAssignments(req: Request, res: Response) {
    try {
      const assignments = await universityService.getCourseAssignments(req.query as any);
      res.json(assignments);
    } catch (error) {
      console.error('Failed to get course assignments:', error);
      res.status(500).json({ error: 'Failed to get course assignments' });
    }
  }

  async updateCourseAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const assignment = await universityService.updateCourseAssignment(id, req.body);
      res.json(assignment);
    } catch (error) {
      console.error('Failed to update course assignment:', error);
      res.status(500).json({ error: 'Failed to update course assignment' });
    }
  }

  async deleteCourseAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await universityService.deleteCourseAssignment(id);
      res.json(result);
    } catch (error) {
      console.error('Failed to delete course assignment:', error);
      res.status(500).json({ error: 'Failed to delete course assignment' });
    }
  }

  // ============================================================================
  // ENROLLMENTS MANAGEMENT
  // ============================================================================

  async createEnrollment(req: Request, res: Response) {
    try {
      const enrollment = await universityService.createEnrollment(req.body);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error('Failed to create enrollment:', error);
      res.status(500).json({ error: 'Failed to create enrollment' });
    }
  }

  async getEnrollments(req: Request, res: Response) {
    try {
      const enrollments = await universityService.getEnrollments(req.query as any);
      res.json(enrollments);
    } catch (error) {
      console.error('Failed to get enrollments:', error);
      res.status(500).json({ error: 'Failed to get enrollments' });
    }
  }

  async updateEnrollment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const enrollment = await universityService.updateEnrollment(id, req.body);
      res.json(enrollment);
    } catch (error) {
      console.error('Failed to update enrollment:', error);
      res.status(500).json({ error: 'Failed to update enrollment' });
    }
  }

  async deleteEnrollment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await universityService.deleteEnrollment(id);
      res.json(result);
    } catch (error) {
      console.error('Failed to delete enrollment:', error);
      res.status(500).json({ error: 'Failed to delete enrollment' });
    }
  }

  async bulkImportEnrollments(req: Request, res: Response) {
    try {
      const { enrollments } = req.body;
      if (!Array.isArray(enrollments)) {
        return res.status(400).json({ error: 'enrollments must be an array' });
      }
      const result = await universityService.bulkImportEnrollments(enrollments);
      res.status(201).json(result);
    } catch (error) {
      console.error('Failed to bulk import enrollments:', error);
      res.status(500).json({ error: 'Failed to bulk import enrollments' });
    }
  }

  async getTeacherAssignments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { semesterId } = req.query;
      
      const assignments = await universityService.getTeacherAssignments(id, semesterId as string);
      res.json(assignments);
    } catch (error) {
      console.error('Failed to get teacher assignments:', error);
      res.status(500).json({ error: 'Failed to get teacher assignments' });
    }
  }
}
