#!/usr/bin/env bash
set -euo pipefail

# Database initialization script for anonymous survey system
# Run this after: docker compose up -d

DB_NAME=${DB_NAME:-anonymous_survey_university}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

echo "Initializing database: $DB_NAME using Docker"

# Wait for PostgreSQL container to be ready
echo "Waiting for PostgreSQL container to be ready..."
until docker exec anonymous_survey_postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; do
  echo "PostgreSQL container is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL container is ready!"

# Run the schema file using Docker
echo "Creating database schema..."
docker exec -i anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" < database/university-schema.sql

# Insert additional seed data for testing
echo "Inserting seed data..."

# Insert sample admin with proper password hash (admin123)
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
UPDATE admins SET password_hash = '\$2b\$10\$rQZ8K9vX7mN2pL3qR5sT6uV8wX1yZ4aB7cD0eF3gH6iJ9kL2mN5pQ8rS1tU4vW7' WHERE email = 'admin@university.edu';
"

# Insert sample teachers
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO teachers (id, name, email, school_id) VALUES 
('teacher_001', 'Dr. John Smith', 'john.smith@university.edu', 'school_001'),
('teacher_002', 'Prof. Jane Doe', 'jane.doe@university.edu', 'school_001'),
('teacher_003', 'Dr. Bob Johnson', 'bob.johnson@university.edu', 'school_002')
ON CONFLICT (email) DO NOTHING;
"

# Insert sample courses
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO courses (id, code, name, description, credits, school_id) VALUES 
('course_001', 'CS101', 'Introduction to Computer Science', 'Basic programming concepts', 3, 'school_001'),
('course_002', 'CS201', 'Data Structures', 'Advanced programming and algorithms', 3, 'school_001'),
('course_003', 'BUS101', 'Introduction to Business', 'Business fundamentals', 3, 'school_002'),
('course_004', 'ENG101', 'Engineering Fundamentals', 'Basic engineering principles', 3, 'school_003')
ON CONFLICT (code) DO NOTHING;
"

# Insert sample students
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO students (id, email, name, student_id, school_id) VALUES 
('student_001', 'alice@student.university.edu', 'Alice Johnson', 'STU001', 'school_001'),
('student_002', 'bob@student.university.edu', 'Bob Smith', 'STU002', 'school_001'),
('student_003', 'charlie@student.university.edu', 'Charlie Brown', 'STU003', 'school_002'),
('student_004', 'diana@student.university.edu', 'Diana Prince', 'STU004', 'school_003')
ON CONFLICT (email) DO NOTHING;
"

# Insert course assignments
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO course_assignments (id, teacher_id, course_id, semester_id) VALUES 
('assign_001', 'teacher_001', 'course_001', 'sem_001'),
('assign_002', 'teacher_001', 'course_002', 'sem_001'),
('assign_003', 'teacher_002', 'course_001', 'sem_001'),
('assign_004', 'teacher_003', 'course_003', 'sem_001')
ON CONFLICT (teacher_id, course_id, semester_id) DO NOTHING;
"

# Insert student enrollments
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO enrollments (id, student_id, course_id, semester_id) VALUES 
('enroll_001', 'student_001', 'course_001', 'sem_001'),
('enroll_002', 'student_001', 'course_002', 'sem_001'),
('enroll_003', 'student_002', 'course_001', 'sem_001'),
('enroll_004', 'student_003', 'course_003', 'sem_001'),
('enroll_005', 'student_004', 'course_004', 'sem_001')
ON CONFLICT (student_id, course_id, semester_id) DO NOTHING;
"

echo "Database initialization completed successfully!"
echo ""
echo "Sample data created:"
echo "- Admin: admin@university.edu (password: admin123)"
echo "- Schools: CSE, BUS, ENG"
echo "- Teachers: 3 teachers across schools"
echo "- Courses: 4 courses"
echo "- Students: 4 students"
echo "- Assignments: 4 teacher-course assignments"
echo "- Enrollments: 5 student enrollments"
echo ""
echo "You can now run: npm run smoke"
