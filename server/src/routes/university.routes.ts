import { Router } from 'express';
import { UniversityController } from '../controllers/university.controller';

const router = Router();
const universityController = new UniversityController();

// ============================================================================
// SCHOOL ROUTES
// ============================================================================

/**
 * @swagger
 * /university/schools:
 *   post:
 *     summary: Create school
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 example: "School of Computer Science and Engineering"
 *               code:
 *                 type: string
 *                 example: "CSE"
 *               description:
 *                 type: string
 *                 example: "Computer Science and Engineering programs"
 *     responses:
 *       201:
 *         description: School created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 code:
 *                   type: string
 *                 description:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/schools', universityController.createSchool);

/**
 * @swagger
 * /university/schools:
 *   get:
 *     summary: Get all schools
 *     tags: [University]
 *     responses:
 *       200:
 *         description: Schools
 */
router.get('/schools', universityController.getSchools);

/**
 * @swagger
 * /university/schools/{id}:
 *   get:
 *     summary: Get school by ID
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: School
 */
router.get('/schools/:id', universityController.getSchool);

/**
 * @swagger
 * /university/schools/{id}:
 *   put:
 *     summary: Update school
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/schools/:id', universityController.updateSchool);

/**
 * @swagger
 * /university/schools/{id}:
 *   delete:
 *     summary: Delete school
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/schools/:id', universityController.deleteSchool);

// ============================================================================
// TEACHER ROUTES
// ============================================================================

/**
 * @swagger
 * /university/teachers:
 *   post:
 *     summary: Create teacher
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - schoolId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Dr. John Smith"
 *               email:
 *                 type: string
 *                 example: "john.smith@university.edu"
 *               schoolId:
 *                 type: string
 *                 example: "school_001"
 *     responses:
 *       201:
 *         description: Teacher created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 schoolId:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/teachers', universityController.createTeacher);

/**
 * @swagger
 * /university/teachers/bulk-import:
 *   post:
 *     summary: Bulk import teachers
 *     tags: [University]
 *     responses:
 *       201:
 *         description: Imported
 */
router.post('/teachers/bulk-import', universityController.bulkImportTeachers);

/**
 * @swagger
 * /university/teachers:
 *   get:
 *     summary: Get all teachers
 *     tags: [University]
 *     responses:
 *       200:
 *         description: Teachers
 */
router.get('/teachers', universityController.getTeachers);

/**
 * @swagger
 * /university/teachers/{id}:
 *   get:
 *     summary: Get teacher by ID
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher
 */
router.get('/teachers/:id', universityController.getTeacher);

/**
 * @swagger
 * /university/teachers/{id}:
 *   put:
 *     summary: Update teacher
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/teachers/:id', universityController.updateTeacher);

/**
 * @swagger
 * /university/teachers/{id}:
 *   delete:
 *     summary: Delete teacher
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/teachers/:id', universityController.deleteTeacher);

// ============================================================================
// COURSE ROUTES
// ============================================================================

/**
 * @swagger
 * /university/courses:
 *   post:
 *     summary: Create course
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - schoolId
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CS101"
 *               name:
 *                 type: string
 *                 example: "Introduction to Computer Science"
 *               description:
 *                 type: string
 *                 example: "Basic programming concepts"
 *               credits:
 *                 type: integer
 *                 example: 3
 *               schoolId:
 *                 type: string
 *                 example: "school_001"
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 code:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 credits:
 *                   type: integer
 *                 schoolId:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/courses', universityController.createCourse);

/**
 * @swagger
 * /university/courses/bulk-import:
 *   post:
 *     summary: Bulk import courses
 *     tags: [University]
 *     responses:
 *       201:
 *         description: Imported
 */
router.post('/courses/bulk-import', universityController.bulkImportCourses);

/**
 * @swagger
 * /university/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [University]
 *     responses:
 *       200:
 *         description: Courses
 */
router.get('/courses', universityController.getCourses);

/**
 * @swagger
 * /university/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course
 */
router.get('/courses/:id', universityController.getCourse);

/**
 * @swagger
 * /university/courses/{id}:
 *   put:
 *     summary: Update course
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/courses/:id', universityController.updateCourse);

/**
 * @swagger
 * /university/courses/{id}:
 *   delete:
 *     summary: Delete course
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/courses/:id', universityController.deleteCourse);

// ============================================================================
// STUDENT ROUTES
// ============================================================================

/**
 * @swagger
 * /university/students:
 *   post:
 *     summary: Create student
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - studentId
 *               - schoolId
 *             properties:
 *               email:
 *                 type: string
 *                 example: "alice@student.university.edu"
 *               name:
 *                 type: string
 *                 example: "Alice Johnson"
 *               studentId:
 *                 type: string
 *                 example: "STU001"
 *               schoolId:
 *                 type: string
 *                 example: "school_001"
 *     responses:
 *       201:
 *         description: Student created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *                 studentId:
 *                   type: string
 *                 schoolId:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/students', universityController.createStudent);

/**
 * @swagger
 * /university/students:
 *   get:
 *     summary: Get all students
 *     tags: [University]
 *     responses:
 *       200:
 *         description: Students
 */
router.get('/students', universityController.getStudents);

/**
 * @swagger
 * /university/students/{id}:
 *   get:
 *     summary: Get student by ID
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student
 */
router.get('/students/:id', universityController.getStudent);

/**
 * @swagger
 * /university/students/{id}:
 *   put:
 *     summary: Update student
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/students/:id', universityController.updateStudent);

/**
 * @swagger
 * /university/students/{id}:
 *   delete:
 *     summary: Delete student
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/students/:id', universityController.deleteStudent);

/**
 * @swagger
 * /university/students/bulk-import:
 *   post:
 *     summary: Bulk import students
 *     tags: [University]
 *     responses:
 *       201:
 *         description: Imported
 */
router.post('/students/bulk-import', universityController.bulkImportStudents);

// ============================================================================
// SEMESTER ROUTES
// ============================================================================

/**
 * @swagger
 * /university/semesters:
 *   post:
 *     summary: Create semester
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Fall 2024"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-09-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-15"
 *               status:
 *                 type: string
 *                 enum: [planning, active, surveying, closed]
 *                 example: "active"
 *     responses:
 *       201:
 *         description: Semester created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 startDate:
 *                   type: string
 *                   format: date
 *                 endDate:
 *                   type: string
 *                   format: date
 *                 status:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/semesters', universityController.createSemester);

/**
 * @swagger
 * /university/semesters:
 *   get:
 *     summary: Get semesters
 *     tags: [University]
 *     responses:
 *       200:
 *         description: Semesters
 */
router.get('/semesters', universityController.getSemesters);

/**
 * @swagger
 * /university/semesters/{id}:
 *   get:
 *     summary: Get semester by ID
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Semester
 */
router.get('/semesters/:id', universityController.getSemester);

/**
 * @swagger
 * /university/semesters/{id}:
 *   put:
 *     summary: Update semester
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/semesters/:id', universityController.updateSemester);

/**
 * @swagger
 * /university/semesters/{id}:
 *   delete:
 *     summary: Delete semester
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/semesters/:id', universityController.deleteSemester);

// ============================================================================
// COURSE ASSIGNMENTS ROUTES
// ============================================================================

/**
 * @swagger
 * /university/course-assignments:
 *   post:
 *     summary: Create course assignment
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teacherId
 *               - courseId
 *               - semesterId
 *             properties:
 *               teacherId:
 *                 type: string
 *                 example: "teacher_001"
 *               courseId:
 *                 type: string
 *                 example: "course_001"
 *               semesterId:
 *                 type: string
 *                 example: "sem_001"
 *     responses:
 *       201:
 *         description: Course assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 teacherId:
 *                   type: string
 *                 courseId:
 *                   type: string
 *                 semesterId:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/course-assignments', universityController.createCourseAssignment);

/**
 * @swagger
 * /university/course-assignments:
 *   get:
 *     summary: Get course assignments
 *     tags: [University]
 *     responses:
 *       200:
 *         description: Assignments
 */
router.get('/course-assignments', universityController.getCourseAssignments);

/**
 * @swagger
 * /university/course-assignments/{id}:
 *   put:
 *     summary: Update course assignment
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/course-assignments/:id', universityController.updateCourseAssignment);

/**
 * @swagger
 * /university/course-assignments/{id}:
 *   delete:
 *     summary: Delete course assignment
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/course-assignments/:id', universityController.deleteCourseAssignment);

// ============================================================================
// ENROLLMENTS ROUTES
// ============================================================================

/**
 * @swagger
 * /university/enrollments:
 *   post:
 *     summary: Create enrollment
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - courseId
 *               - semesterId
 *             properties:
 *               studentId:
 *                 type: string
 *                 example: "student_001"
 *               courseId:
 *                 type: string
 *                 example: "course_001"
 *               semesterId:
 *                 type: string
 *                 example: "sem_001"
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 studentId:
 *                   type: string
 *                 courseId:
 *                   type: string
 *                 semesterId:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.post('/enrollments', universityController.createEnrollment);

/**
 * @swagger
 * /university/enrollments:
 *   get:
 *     summary: Get enrollments
 *     tags: [University]
 *     responses:
 *       200:
 *         description: Enrollments
 */
router.get('/enrollments', universityController.getEnrollments);

/**
 * @swagger
 * /university/enrollments/{id}:
 *   put:
 *     summary: Update enrollment
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/enrollments/:id', universityController.updateEnrollment);

/**
 * @swagger
 * /university/enrollments/{id}:
 *   delete:
 *     summary: Delete enrollment
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/enrollments/:id', universityController.deleteEnrollment);

/**
 * @swagger
 * /university/enrollments/bulk-import:
 *   post:
 *     summary: Bulk import enrollments
 *     tags: [University]
 *     responses:
 *       201:
 *         description: Imported
 */
router.post('/enrollments/bulk-import', universityController.bulkImportEnrollments);

// ============================================================================
// TEACHER ASSIGNMENTS ROUTES
// ============================================================================

/**
 * @swagger
 * /university/teachers/{id}/assignments:
 *   get:
 *     summary: Get teacher assignments for a specific teacher
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: string
 *         description: Optional semester ID to filter assignments
 *     responses:
 *       200:
 *         description: Teacher assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   teacherId:
 *                     type: string
 *                   courseId:
 *                     type: string
 *                   semesterId:
 *                     type: string
 *                   course:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       schoolId:
 *                         type: string
 *                   semester:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *       404:
 *         description: Teacher not found
 */
router.get('/teachers/:id/assignments', universityController.getTeacherAssignments);

export default router;
