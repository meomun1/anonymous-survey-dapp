import db from '../config/database';
import Redis from 'ioredis';
import crypto from 'crypto';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Transform database row from snake_case to camelCase
 */
function transformSemester(row: any) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Service for university structure management (schools, teachers, courses, students)
 */
export class UniversityService {
  private static readonly CACHE_PREFIX = 'university:';
  private static readonly CACHE_TTL = 3600; // 1 hour

  // ============================================================================
  // SCHOOL MANAGEMENT
  // ============================================================================

  /**
   * Create a new school
   */
  async createSchool(data: {
    name: string;
    code: string;
    description?: string;
  }) {
    const schoolId = crypto.randomUUID();
    
    const result = await db.query(
      `INSERT INTO schools (id, name, code, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [schoolId, data.name, data.code, data.description || null]
    );

    // Clear cache
    await this.clearSchoolsCache();
    
    return result.rows[0];
  }

  /**
   * Get all schools
   */
  async getSchools() {
    const cacheKey = `${UniversityService.CACHE_PREFIX}schools:all`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(
      'SELECT * FROM schools ORDER BY name ASC'
    );

    const schools = result.rows;
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(schools));
    
    return schools;
  }

  /**
   * Get school by ID
   */
  async getSchool(id: string) {
    const cacheKey = `${UniversityService.CACHE_PREFIX}school:${id}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(
      'SELECT * FROM schools WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('School not found');
    }

    const school = result.rows[0];
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(school));
    
    return school;
  }

  /**
   * Update school
   */
  async updateSchool(id: string, data: {
    name?: string;
    code?: string;
    description?: string;
  }) {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.code !== undefined) {
      setClause.push(`code = $${paramCount++}`);
      values.push(data.code);
    }
    if (data.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await db.query(
      `UPDATE schools SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new Error('School not found');
    }

    // Clear cache
    await this.clearSchoolCache(id);
    await this.clearSchoolsCache();

    return result.rows[0];
  }

  /**
   * Delete school
   */
  async deleteSchool(id: string) {
    // Check if school has teachers or courses
    const checkResult = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM teachers WHERE school_id = $1) as teacher_count,
         (SELECT COUNT(*) FROM courses WHERE school_id = $1) as course_count`,
      [id]
    );

    const counts = checkResult.rows[0];
    if (parseInt(counts.teacher_count) > 0 || parseInt(counts.course_count) > 0) {
      throw new Error('Cannot delete school with existing teachers or courses');
    }

    const result = await db.query(
      'DELETE FROM schools WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('School not found');
    }

    // Clear cache
    await this.clearSchoolCache(id);
    await this.clearSchoolsCache();

    return result.rows[0];
  }

  // ============================================================================
  // TEACHER MANAGEMENT
  // ============================================================================

  /**
   * Create a new teacher
   */
  async createTeacher(data: {
    name: string;
    email: string;
    schoolId: string;
  }) {
    const teacherId = crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO teachers (id, name, email, school_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teacherId, data.name, data.email, data.schoolId]
    );

    const teacher = result.rows[0];

    // Auto-create teacher login credentials and send welcome email
    const { TeacherLoginService } = await import('./teacher-login.service');
    const teacherLoginService = new TeacherLoginService();

    const loginResult = await teacherLoginService.createTeacherLogin(
      teacherId,
      data.email,
      data.name
    );

    if (loginResult.success) {
      console.log(`✅ Teacher login auto-created for: ${data.email}`);
      if (loginResult.emailSent) {
        console.log(`📧 Welcome email sent to: ${data.email}`);
      } else if (loginResult.temporaryPassword) {
        console.log(`⚠️ Email not sent. Temporary password: ${loginResult.temporaryPassword}`);
      }
    } else {
      console.warn(`⚠️ Failed to auto-create login for ${data.email}: ${loginResult.error}`);
    }

    // Clear cache
    await this.clearTeachersCache();

    return teacher;
  }

  /**
   * Get all teachers (optionally filtered by school)
   */
  async getTeachers(schoolId?: string) {
    const cacheKey = schoolId 
      ? `${UniversityService.CACHE_PREFIX}teachers:school:${schoolId}`
      : `${UniversityService.CACHE_PREFIX}teachers:all`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let query = `
      SELECT t.*, s.name as school_name, s.code as school_code
      FROM teachers t
      JOIN schools s ON t.school_id = s.id
    `;
    const values = [];

    if (schoolId) {
      query += ' WHERE t.school_id = $1';
      values.push(schoolId);
    }

    query += ' ORDER BY t.name ASC';

    const result = await db.query(query, values);
    const teachers = result.rows;
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(teachers));
    
    return teachers;
  }

  /**
   * Get teacher by ID
   */
  async getTeacher(id: string) {
    const cacheKey = `${UniversityService.CACHE_PREFIX}teacher:${id}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(
      `SELECT t.*, s.name as school_name, s.code as school_code
       FROM teachers t
       JOIN schools s ON t.school_id = s.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Teacher not found');
    }

    const teacher = result.rows[0];
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(teacher));
    
    return teacher;
  }

  /**
   * Update teacher
   */
  async updateTeacher(id: string, data: {
    name?: string;
    email?: string;
    schoolId?: string;
  }) {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      setClause.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.schoolId !== undefined) {
      setClause.push(`school_id = $${paramCount++}`);
      values.push(data.schoolId);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await db.query(
      `UPDATE teachers SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new Error('Teacher not found');
    }

    // Clear cache
    await this.clearTeacherCache(id);
    await this.clearTeachersCache();

    return result.rows[0];
  }

  /**
   * Delete teacher
   */
  async deleteTeacher(id: string) {
    // Check if teacher has course assignments
    const checkResult = await db.query(
      'SELECT COUNT(*) as assignment_count FROM course_assignments WHERE teacher_id = $1',
      [id]
    );

    const count = checkResult.rows[0].assignment_count;
    if (parseInt(count) > 0) {
      throw new Error('Cannot delete teacher with existing course assignments');
    }

    const result = await db.query(
      'DELETE FROM teachers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Teacher not found');
    }

    // Clear cache
    await this.clearTeacherCache(id);
    await this.clearTeachersCache();

    return result.rows[0];
  }

  /**
   * Bulk import teachers from CSV data
   */
  async bulkImportTeachers(teachers: Array<{
    name: string;
    email: string;
    schoolId: string;
  }>) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const importedTeachers = [];

      for (const teacherData of teachers) {
        const teacherId = crypto.randomUUID();

        const result = await client.query(
          `INSERT INTO teachers (id, name, email, school_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [teacherId, teacherData.name, teacherData.email, teacherData.schoolId]
        );

        importedTeachers.push(result.rows[0]);
      }

      await client.query('COMMIT');

      // Clear cache
      await this.clearTeachersCache();

      return {
        imported: importedTeachers.length,
        teachers: importedTeachers
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // COURSE MANAGEMENT
  // ============================================================================

  /**
   * Create a new course
   */
  async createCourse(data: {
    code: string;
    name: string;
    description?: string;
    credits?: number;
    schoolId: string;
  }) {
    const courseId = crypto.randomUUID();
    
    const result = await db.query(
      `INSERT INTO courses (id, code, name, description, credits, school_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [courseId, data.code, data.name, data.description || null, data.credits || 3, data.schoolId]
    );

    // Clear cache
    await this.clearCoursesCache();

    return result.rows[0];
  }

  /**
   * Get all courses (optionally filtered by school)
   */
  async getCourses(schoolId?: string) {
    const cacheKey = schoolId 
      ? `${UniversityService.CACHE_PREFIX}courses:school:${schoolId}`
      : `${UniversityService.CACHE_PREFIX}courses:all`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let query = `
      SELECT c.*, s.name as school_name, s.code as school_code
      FROM courses c
      JOIN schools s ON c.school_id = s.id
    `;
    const values = [];

    if (schoolId) {
      query += ' WHERE c.school_id = $1';
      values.push(schoolId);
    }

    query += ' ORDER BY c.code ASC';

    const result = await db.query(query, values);
    const courses = result.rows;
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(courses));
    
    return courses;
  }

  /**
   * Get course by ID
   */
  async getCourse(id: string) {
    const cacheKey = `${UniversityService.CACHE_PREFIX}course:${id}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(
      `SELECT c.*, s.name as school_name, s.code as school_code
       FROM courses c
       JOIN schools s ON c.school_id = s.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Course not found');
    }

    const course = result.rows[0];
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(course));
    
    return course;
  }

  /**
   * Update course
   */
  async updateCourse(id: string, data: {
    code?: string;
    name?: string;
    description?: string;
    credits?: number;
    schoolId?: string;
  }) {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.code !== undefined) {
      setClause.push(`code = $${paramCount++}`);
      values.push(data.code);
    }
    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.credits !== undefined) {
      setClause.push(`credits = $${paramCount++}`);
      values.push(data.credits);
    }
    if (data.schoolId !== undefined) {
      setClause.push(`school_id = $${paramCount++}`);
      values.push(data.schoolId);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await db.query(
      `UPDATE courses SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new Error('Course not found');
    }

    // Clear cache
    await this.clearCourseCache(id);
    await this.clearCoursesCache();

    return result.rows[0];
  }

  /**
   * Delete course
   */
  async deleteCourse(id: string) {
    // Check if course has enrollments or assignments
    const checkResult = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM enrollments WHERE course_id = $1) as enrollment_count,
         (SELECT COUNT(*) FROM course_assignments WHERE course_id = $1) as assignment_count`,
      [id]
    );

    const counts = checkResult.rows[0];
    if (parseInt(counts.enrollment_count) > 0 || parseInt(counts.assignment_count) > 0) {
      throw new Error('Cannot delete course with existing enrollments or assignments');
    }

    const result = await db.query(
      'DELETE FROM courses WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Course not found');
    }

    // Clear cache
    await this.clearCourseCache(id);
    await this.clearCoursesCache();

    return result.rows[0];
  }

  /**
   * Bulk import courses from CSV data
   */
  async bulkImportCourses(courses: Array<{
    code: string;
    name: string;
    description?: string;
    credits?: number;
    schoolId: string;
  }>) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const importedCourses = [];

      for (const courseData of courses) {
        const courseId = crypto.randomUUID();

        const result = await client.query(
          `INSERT INTO courses (id, code, name, description, credits, school_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [courseId, courseData.code, courseData.name, courseData.description || null, courseData.credits || 3, courseData.schoolId]
        );

        importedCourses.push(result.rows[0]);
      }

      await client.query('COMMIT');

      // Clear cache
      await this.clearCoursesCache();

      return {
        imported: importedCourses.length,
        courses: importedCourses
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // STUDENT MANAGEMENT
  // ============================================================================

  /**
   * Create a new student
   */
  async createStudent(data: {
    email: string;
    name: string;
    studentId: string;
    schoolId: string;
  }) {
    const studentId = crypto.randomUUID();
    
    const result = await db.query(
      `INSERT INTO students (id, email, name, student_id, school_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [studentId, data.email, data.name, data.studentId, data.schoolId]
    );

    // Clear cache
    await this.clearStudentsCache();

    return result.rows[0];
  }

  /**
   * Get all students (optionally filtered by school)
   */
  async getStudents(schoolId?: string) {
    const cacheKey = schoolId 
      ? `${UniversityService.CACHE_PREFIX}students:school:${schoolId}`
      : `${UniversityService.CACHE_PREFIX}students:all`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let query = `
      SELECT s.*, sch.name as school_name, sch.code as school_code
      FROM students s
      JOIN schools sch ON s.school_id = sch.id
    `;
    const values = [];

    if (schoolId) {
      query += ' WHERE s.school_id = $1';
      values.push(schoolId);
    }

    query += ' ORDER BY s.name ASC';

    const result = await db.query(query, values);
    const students = result.rows;
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(students));
    
    return students;
  }

  /**
   * Get student by ID
   */
  async getStudent(id: string) {
    const cacheKey = `${UniversityService.CACHE_PREFIX}student:${id}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(
      `SELECT s.*, sch.name as school_name, sch.code as school_code
       FROM students s
       JOIN schools sch ON s.school_id = sch.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Student not found');
    }

    const student = result.rows[0];
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(student));
    
    return student;
  }

  /**
   * Update student
   */
  async updateStudent(id: string, data: {
    email?: string;
    name?: string;
    studentId?: string;
    schoolId?: string;
  }) {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      setClause.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.studentId !== undefined) {
      setClause.push(`student_id = $${paramCount++}`);
      values.push(data.studentId);
    }
    if (data.schoolId !== undefined) {
      setClause.push(`school_id = $${paramCount++}`);
      values.push(data.schoolId);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await db.query(
      `UPDATE students SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new Error('Student not found');
    }

    // Clear cache
    await this.clearStudentCache(id);
    await this.clearStudentsCache();

    return result.rows[0];
  }

  /**
   * Delete student
   */
  async deleteStudent(id: string) {
    // Check if student has enrollments
    const checkResult = await db.query(
      'SELECT COUNT(*) as enrollment_count FROM enrollments WHERE student_id = $1',
      [id]
    );

    const count = checkResult.rows[0].enrollment_count;
    if (parseInt(count) > 0) {
      throw new Error('Cannot delete student with existing enrollments');
    }

    const result = await db.query(
      'DELETE FROM students WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Student not found');
    }

    // Clear cache
    await this.clearStudentCache(id);
    await this.clearStudentsCache();

    return result.rows[0];
  }

  // =========================================================================
  // COURSE ASSIGNMENTS (teacher ↔ course ↔ semester)
  // =========================================================================
  async createCourseAssignment(data: { teacherId: string; courseId: string; campaignId: string; semesterId: string; }) {
    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO course_assignments (id, teacher_id, course_id, campaign_id, semester_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, data.teacherId, data.courseId, data.campaignId, data.semesterId]
    );
    return result.rows[0];
  }


  async deleteCourseAssignment(id: string) {
    // First, get the course assignment details
    const assignment = await db.query(
      'SELECT course_id, campaign_id FROM course_assignments WHERE id = $1',
      [id]
    );

    if (assignment.rowCount === 0) {
      throw new Error('Course assignment not found');
    }

    const { course_id, campaign_id } = assignment.rows[0];

    // Delete related enrollments for this course in this campaign
    const deleteEnrollments = await db.query(
      'DELETE FROM enrollments WHERE course_id = $1 AND campaign_id = $2 RETURNING id',
      [course_id, campaign_id]
    );

    console.log(`🗑️ Deleted ${deleteEnrollments.rowCount} enrollments for course ${course_id} in campaign ${campaign_id}`);

    // Delete the course assignment
    const res = await db.query('DELETE FROM course_assignments WHERE id = $1 RETURNING *', [id]);

    return res.rows[0];
  }

  async getCourseAssignments(filters: { teacherId?: string; courseId?: string; campaignId?: string; semesterId?: string; }) {
    const where: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (filters.teacherId) { where.push(`ca.teacher_id = $${idx++}`); values.push(filters.teacherId); }
    if (filters.courseId) { where.push(`ca.course_id = $${idx++}`); values.push(filters.courseId); }
    if (filters.campaignId) { where.push(`ca.campaign_id = $${idx++}`); values.push(filters.campaignId); }
    if (filters.semesterId) { where.push(`ca.semester_id = $${idx++}`); values.push(filters.semesterId); }
    const result = await db.query(
      `SELECT ca.*, c.name as course_name, c.code as course_code, s.name as semester_name, t.name as teacher_name
       FROM course_assignments ca
       JOIN courses c ON ca.course_id = c.id
       JOIN semesters s ON ca.semester_id = s.id
       JOIN teachers t ON ca.teacher_id = t.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY c.code ASC`,
      values
    );
    return result.rows;
  }

  async updateCourseAssignment(id: string, data: { teacherId?: string; courseId?: string; semesterId?: string; }) {
    const set: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.teacherId !== undefined) { set.push(`teacher_id = $${idx++}`); values.push(data.teacherId); }
    if (data.courseId !== undefined) { set.push(`course_id = $${idx++}`); values.push(data.courseId); }
    if (data.semesterId !== undefined) { set.push(`semester_id = $${idx++}`); values.push(data.semesterId); }
    if (set.length === 0) { throw new Error('No fields to update'); }
    values.push(id);
    const res = await db.query(
      `UPDATE course_assignments SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`,
      values
    );
    if (res.rowCount === 0) throw new Error('Course assignment not found');
    return res.rows[0];
  }

  // =========================================================================
  // ENROLLMENTS (student ↔ course ↔ semester)
  // =========================================================================
  async createEnrollment(data: { studentId: string; courseId: string; campaignId: string; semesterId: string; }) {
    const id = crypto.randomUUID();
    const result = await db.query(
      `INSERT INTO enrollments (id, student_id, course_id, campaign_id, semester_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, data.studentId, data.courseId, data.campaignId, data.semesterId]
    );
    return result.rows[0];
  }

  async bulkImportEnrollments(rows: Array<{ studentId: string; courseId: string; campaignId: string; semesterId: string; }>) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const created: any[] = [];
      for (const r of rows) {
        const id = crypto.randomUUID();
        const res = await client.query(
          `INSERT INTO enrollments (id, student_id, course_id, campaign_id, semester_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [id, r.studentId, r.courseId, r.campaignId, r.semesterId]
        );
        created.push(res.rows[0]);
      }
      await client.query('COMMIT');
      return { created: created.length, rows: created };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getStudentEnrollments(studentId: string, semesterId?: string) {
    const res = await db.query(
      `SELECT e.*, c.name as course_name, c.code as course_code, s.name as semester_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN semesters s ON e.semester_id = s.id
       WHERE e.student_id = $1 ${semesterId ? 'AND e.semester_id = $2' : ''}
       ORDER BY c.code ASC`,
      semesterId ? [studentId, semesterId] : [studentId]
    );
    return res.rows;
  }

  async deleteEnrollment(id: string) {
    const res = await db.query('DELETE FROM enrollments WHERE id = $1 RETURNING *', [id]);
    if (res.rowCount === 0) throw new Error('Enrollment not found');
    return res.rows[0];
  }

  async getEnrollments(filters: { studentId?: string; courseId?: string; campaignId?: string; semesterId?: string; }) {
    const where: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (filters.studentId) { where.push(`e.student_id = $${idx++}`); values.push(filters.studentId); }
    if (filters.courseId) { where.push(`e.course_id = $${idx++}`); values.push(filters.courseId); }
    if (filters.campaignId) { where.push(`e.campaign_id = $${idx++}`); values.push(filters.campaignId); }
    if (filters.semesterId) { where.push(`e.semester_id = $${idx++}`); values.push(filters.semesterId); }
    const res = await db.query(
      `SELECT e.*, c.name as course_name, c.code as course_code, s.name as semester_name,
              st.name as student_name, st.email as student_email
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN semesters s ON e.semester_id = s.id
       JOIN students st ON e.student_id = st.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY c.code ASC`,
      values
    );

    // Transform to camelCase for frontend
    return res.rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      courseId: row.course_id,
      semesterId: row.semester_id,
      courseName: row.course_name,
      courseCode: row.course_code,
      semesterName: row.semester_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async updateEnrollment(id: string, data: { studentId?: string; courseId?: string; semesterId?: string; }) {
    const set: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.studentId !== undefined) { set.push(`student_id = $${idx++}`); values.push(data.studentId); }
    if (data.courseId !== undefined) { set.push(`course_id = $${idx++}`); values.push(data.courseId); }
    if (data.semesterId !== undefined) { set.push(`semester_id = $${idx++}`); values.push(data.semesterId); }
    if (set.length === 0) { throw new Error('No fields to update'); }
    values.push(id);
    const res = await db.query(
      `UPDATE enrollments SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`,
      values
    );
    if (res.rowCount === 0) throw new Error('Enrollment not found');
    return res.rows[0];
  }
  /**
   * Bulk import students from CSV data
   */
  async bulkImportStudents(students: Array<{
    email: string;
    name: string;
    studentId: string;
    schoolId: string;
  }>) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const importedStudents = [];
      
      for (const studentData of students) {
        const studentId = crypto.randomUUID();
        
        const result = await client.query(
          `INSERT INTO students (id, email, name, student_id, school_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [studentId, studentData.email, studentData.name, studentData.studentId, studentData.schoolId]
        );
        
        importedStudents.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      
      // Clear cache
      await this.clearStudentsCache();
      
      return {
        imported: importedStudents.length,
        students: importedStudents
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // SEMESTER MANAGEMENT
  // ============================================================================

  /**
   * Create a new semester
   */
  async createSemester(data: {
    name: string;
    startDate: string;
    endDate: string;
    status?: string;
  }) {
    const semesterId = crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO semesters (id, name, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [semesterId, data.name, data.startDate, data.endDate, data.status || 'planning']
    );

    return transformSemester(result.rows[0]);
  }

  /**
   * Get all semesters
   */
  async getSemesters() {
    const result = await db.query(
      'SELECT * FROM semesters ORDER BY start_date DESC'
    );

    return result.rows.map(transformSemester);
  }

  /**
   * Get semester by ID
   */
  async getSemester(id: string) {
    const result = await db.query(
      'SELECT * FROM semesters WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Semester not found');
    }

    return transformSemester(result.rows[0]);
  }

  /**
   * Update semester
   */
  async updateSemester(id: string, data: {
    name?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const setClause = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.startDate !== undefined) {
      setClause.push(`start_date = $${paramCount++}`);
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      setClause.push(`end_date = $${paramCount++}`);
      values.push(data.endDate);
    }
    if (data.status !== undefined) {
      setClause.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const result = await db.query(
      `UPDATE semesters SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new Error('Semester not found');
    }

    return transformSemester(result.rows[0]);
  }

  /**
   * Delete semester
   */
  async deleteSemester(id: string) {
    // Check if semester has campaigns, course assignments, or enrollments
    const checkResult = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM survey_campaigns WHERE semester_id = $1) as campaign_count,
         (SELECT COUNT(*) FROM course_assignments WHERE semester_id = $1) as assignment_count,
         (SELECT COUNT(*) FROM enrollments WHERE semester_id = $1) as enrollment_count`,
      [id]
    );

    const counts = checkResult.rows[0];
    if (parseInt(counts.campaign_count) > 0 || parseInt(counts.assignment_count) > 0 || parseInt(counts.enrollment_count) > 0) {
      throw new Error('Cannot delete semester with existing campaigns, course assignments, or enrollments');
    }

    const result = await db.query(
      'DELETE FROM semesters WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Semester not found');
    }

    return transformSemester(result.rows[0]);
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private async clearSchoolsCache() {
    const pattern = `${UniversityService.CACHE_PREFIX}schools:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private async clearSchoolCache(id: string) {
    await redis.del(`${UniversityService.CACHE_PREFIX}school:${id}`);
  }

  private async clearTeachersCache() {
    const pattern = `${UniversityService.CACHE_PREFIX}teachers:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private async clearTeacherCache(id: string) {
    await redis.del(`${UniversityService.CACHE_PREFIX}teacher:${id}`);
  }

  private async clearCoursesCache() {
    const pattern = `${UniversityService.CACHE_PREFIX}courses:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private async clearCourseCache(id: string) {
    await redis.del(`${UniversityService.CACHE_PREFIX}course:${id}`);
  }

  private async clearStudentsCache() {
    const pattern = `${UniversityService.CACHE_PREFIX}students:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private async clearStudentCache(id: string) {
    await redis.del(`${UniversityService.CACHE_PREFIX}student:${id}`);
  }

  /**
   * Get teacher assignments with course and semester details
   */
  async getTeacherAssignments(teacherId: string, semesterId?: string) {
    const cacheKey = `${UniversityService.CACHE_PREFIX}teacher_assignments:${teacherId}:${semesterId || 'all'}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Returning cached teacher assignments');
      return JSON.parse(cached);
    }

    let query = `
      SELECT
        ca.id,
        ca.teacher_id,
        ca.course_id,
        ca.semester_id,
        ca.created_at,
        c.id as course_id,
        c.code as course_code,
        c.name as course_name,
        c.description as course_description,
        c.credits as course_credits,
        c.school_id as course_school_id,
        sc.name as school_name,
        s.id as semester_id,
        s.name as semester_name,
        s.start_date as semester_start_date,
        s.end_date as semester_end_date,
        s.status as semester_status
      FROM course_assignments ca
      JOIN courses c ON ca.course_id = c.id
      JOIN schools sc ON c.school_id = sc.id
      JOIN semesters s ON ca.semester_id = s.id
      WHERE ca.teacher_id = $1
    `;

    const values = [teacherId];

    if (semesterId) {
      query += ' AND ca.semester_id = $2';
      values.push(semesterId);
    }

    query += ' ORDER BY s.start_date DESC, c.code ASC';

    console.log('Querying teacher assignments:', { teacherId, semesterId, values });
    const result = await db.query(query, values);
    console.log('Query returned rows:', result.rows.length);
    const assignments = result.rows.map(row => ({
      id: row.id,
      teacherId: row.teacher_id,
      courseId: row.course_id,
      courseCode: row.course_code,
      courseName: row.course_name,
      schoolName: row.school_name,
      semesterId: row.semester_id,
      createdAt: row.created_at,
      course: {
        id: row.course_id,
        code: row.course_code,
        name: row.course_name,
        description: row.course_description,
        credits: row.course_credits,
        schoolId: row.course_school_id
      },
      semester: {
        id: row.semester_id,
        name: row.semester_name,
        startDate: row.semester_start_date,
        endDate: row.semester_end_date,
        status: row.semester_status
      }
    }));
    
    // Cache the result
    await redis.setex(cacheKey, UniversityService.CACHE_TTL, JSON.stringify(assignments));
    
    return assignments;
  }
}

export default UniversityService;
