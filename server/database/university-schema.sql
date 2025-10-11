-- University Scaling Database Schema - Complete New Schema
-- Phase 1: Database Schema Enhancement for Anonymous Survey System
-- This is a completely new schema, not extending existing tables

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AUTHENTICATION AND USER MANAGEMENT
-- ============================================================================

-- Admin users table
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin' CHECK ("role" IN ('admin', 'super_admin')),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Teacher login table
CREATE TABLE "teacher_logins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- UNIVERSITY STRUCTURE TABLES
-- ============================================================================

-- Schools table (e.g., "School of Computer Science and Engineering")
CREATE TABLE "schools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE, -- e.g., "CSE", "ENG", "BUS"
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "student_id" TEXT NOT NULL UNIQUE, -- University student ID
    "school_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Teachers table
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL PRIMARY KEY, -- Teacher ID (admin-defined format)
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "school_id" TEXT NOT NULL,
    "login_id" TEXT NOT NULL UNIQUE, -- Links to teacher_logins
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "teachers_login_id_fkey" FOREIGN KEY ("login_id") REFERENCES "teacher_logins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Courses table
CREATE TABLE "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE, -- Course code (admin-defined format, e.g., "CS101")
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 3,
    "school_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Semesters table
CREATE TABLE "semesters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL, -- e.g., "Fall 2024", "Spring 2025"
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning' CHECK ("status" IN ('planning', 'active', 'surveying', 'closed')),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SURVEY CAMPAIGN MANAGEMENT TABLES
-- ============================================================================

-- Survey Campaigns table (main entity with cryptographic settings)
CREATE TABLE "survey_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL, -- e.g., "Fall 2024 Quality Survey Check"
    "type" TEXT NOT NULL CHECK ("type" IN ('course', 'event')), -- Explicit survey type
    "semester_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'teachers_input', 'open', 'closed')),
    "created_by" TEXT NOT NULL, -- Admin user ID
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    -- Cryptographic settings (inherited by all surveys in campaign)
    "blind_signature_public_key" TEXT NOT NULL,
    "encryption_public_key" TEXT NOT NULL,
    "blind_signature_private_key" TEXT NOT NULL,
    "encryption_private_key" TEXT NOT NULL,
    -- Campaign-level statistics
    "merkle_root" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "blockchain_address" TEXT,
    "is_public_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_campaigns_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "survey_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Course Assignments table (created when teacher chooses course and confirms student list)
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacher_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "students_input_completed" BOOLEAN NOT NULL DEFAULT false,
    "students_input_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "course_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_unique" UNIQUE ("teacher_id", "course_id", "semester_id", "campaign_id")
);

-- Enrollments table (created when teacher adds students to their course)
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "course_assignment_id" TEXT NOT NULL, -- Links to course_assignments
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enrollments_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enrollments_course_assignment_id_fkey" FOREIGN KEY ("course_assignment_id") REFERENCES "course_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enrollments_unique" UNIQUE ("student_id", "course_id", "semester_id")
);

-- ============================================================================
-- SURVEY MANAGEMENT TABLES
-- ============================================================================

-- Surveys table (lightweight units, inherit crypto settings from campaign)
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "short_id" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "template_id" TEXT NOT NULL DEFAULT 'teaching_quality_25q',
    "total_questions" INTEGER NOT NULL DEFAULT 25,
    "campaign_id" TEXT NOT NULL,
    "course_id" TEXT, -- NULL for event surveys
    "teacher_id" TEXT, -- NULL for event surveys
    "semester_id" TEXT NOT NULL,
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "surveys_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "surveys_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "surveys_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "surveys_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- Ensure course/teacher only required for course surveys
    CONSTRAINT "surveys_course_survey_check" CHECK (
        (campaign_id IN (SELECT id FROM survey_campaigns WHERE type = 'course') AND course_id IS NOT NULL AND teacher_id IS NOT NULL) OR
        (campaign_id IN (SELECT id FROM survey_campaigns WHERE type = 'event') AND course_id IS NULL AND teacher_id IS NULL)
    )
);

-- Survey tokens table (one per student per campaign)
CREATE TABLE "survey_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "student_email" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_tokens_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "survey_tokens_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Individual survey completion tracking (for detailed participation analytics)
CREATE TABLE "survey_completions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "survey_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "student_email" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_completions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "survey_completions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "survey_completions_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "survey_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE ("survey_id", "student_email")
);

-- Survey responses table (encrypted responses from blockchain)
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "encrypted_data" TEXT NOT NULL, -- Encrypted response from blockchain
    "commitment" TEXT NOT NULL UNIQUE, -- Hash for verification
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockchain_tx_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Decrypted responses table (after decryption process)
CREATE TABLE "decrypted_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "survey_response_id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL, -- Extracted from answer_string
    "campaign_id" TEXT NOT NULL,
    "answer_string" TEXT NOT NULL, -- "surveyId|courseCode|teacherId|123451...123"
    "decrypted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "decrypted_responses_survey_response_id_fkey" FOREIGN KEY ("survey_response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "decrypted_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "decrypted_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- ANALYTICS AND PERFORMANCE TRACKING TABLES
-- ============================================================================

-- Parsed responses for analytics (parsed from decrypted answer_string)
CREATE TABLE "parsed_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decrypted_response_id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "course_code" TEXT NOT NULL, -- Extracted from answer_string
    "teacher_id" TEXT NOT NULL, -- Extracted from answer_string
    "answers" INTEGER[] NOT NULL, -- [1,2,3,4,5,1...] (25 numbers)
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "parsed_responses_decrypted_response_id_fkey" FOREIGN KEY ("decrypted_response_id") REFERENCES "decrypted_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parsed_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parsed_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parsed_responses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Survey analytics (aggregated statistics)
CREATE TABLE "survey_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "survey_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "score_distribution" JSONB NOT NULL DEFAULT '{}', -- {1: 0, 2: 1, 3: 5, 4: 5, 5: 14}
    "question_statistics" JSONB NOT NULL DEFAULT '{}', -- Question-level statistics
    "category_statistics" JSONB NOT NULL DEFAULT '{}', -- Category-level statistics
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_analytics_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "survey_analytics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Teacher performance analytics
CREATE TABLE "teacher_performance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacher_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "total_surveys" INTEGER NOT NULL DEFAULT 0,
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "response_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- Percentage of expected responses
    "category_averages" JSONB NOT NULL DEFAULT '{}', -- Category-level averages
    "input_completion_status" TEXT NOT NULL DEFAULT 'incomplete' CHECK ("input_completion_status" IN ('complete', 'incomplete', 'partial')),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "teacher_performance_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_performance_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_performance_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_performance_unique" UNIQUE ("teacher_id", "campaign_id", "semester_id")
);

-- Student completion tracking
CREATE TABLE "student_completion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "total_enrolled_courses" INTEGER NOT NULL DEFAULT 0,
    "completed_surveys" INTEGER NOT NULL DEFAULT 0,
    "completion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "token_used" BOOLEAN NOT NULL DEFAULT false,
    "token_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "student_completion_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_completion_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_completion_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "student_completion_unique" UNIQUE ("student_id", "campaign_id", "semester_id")
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Authentication indexes
CREATE INDEX "idx_admins_email" ON "admins"("email");
CREATE INDEX "idx_teacher_logins_email" ON "teacher_logins"("email");

-- Schools indexes
CREATE INDEX "idx_schools_code" ON "schools"("code");

-- Students indexes
CREATE INDEX "idx_students_email" ON "students"("email");
CREATE INDEX "idx_students_student_id" ON "students"("student_id");
CREATE INDEX "idx_students_school_id" ON "students"("school_id");

-- Teachers indexes
CREATE INDEX "idx_teachers_email" ON "teachers"("email");
CREATE INDEX "idx_teachers_school_id" ON "teachers"("school_id");
CREATE INDEX "idx_teachers_login_id" ON "teachers"("login_id");

-- Courses indexes
CREATE INDEX "idx_courses_code" ON "courses"("code");
CREATE INDEX "idx_courses_school_id" ON "courses"("school_id");

-- Semesters indexes
CREATE INDEX "idx_semesters_status" ON "semesters"("status");
CREATE INDEX "idx_semesters_dates" ON "semesters"("start_date", "end_date");

-- Survey campaigns indexes
CREATE INDEX "idx_survey_campaigns_semester_id" ON "survey_campaigns"("semester_id");
CREATE INDEX "idx_survey_campaigns_status" ON "survey_campaigns"("status");
CREATE INDEX "idx_survey_campaigns_created_by" ON "survey_campaigns"("created_by");
CREATE INDEX "idx_survey_campaigns_is_published" ON "survey_campaigns"("is_published");

-- Enrollments indexes
CREATE INDEX "idx_enrollments_student_id" ON "enrollments"("student_id");
CREATE INDEX "idx_enrollments_course_id" ON "enrollments"("course_id");
CREATE INDEX "idx_enrollments_semester_id" ON "enrollments"("semester_id");
CREATE INDEX "idx_enrollments_course_assignment_id" ON "enrollments"("course_assignment_id");

-- Course assignments indexes
CREATE INDEX "idx_course_assignments_teacher_id" ON "course_assignments"("teacher_id");
CREATE INDEX "idx_course_assignments_course_id" ON "course_assignments"("course_id");
CREATE INDEX "idx_course_assignments_campaign_id" ON "course_assignments"("campaign_id");
CREATE INDEX "idx_course_assignments_completion" ON "course_assignments"("students_input_completed");

-- Surveys indexes
CREATE INDEX "idx_surveys_short_id" ON "surveys"("short_id");
CREATE INDEX "idx_surveys_campaign_id" ON "surveys"("campaign_id");
CREATE INDEX "idx_surveys_course_id" ON "surveys"("course_id");
CREATE INDEX "idx_surveys_teacher_id" ON "surveys"("teacher_id");
CREATE INDEX "idx_surveys_semester_id" ON "surveys"("semester_id");
CREATE INDEX "idx_surveys_is_published" ON "surveys"("is_published");

-- Survey tokens indexes
CREATE INDEX "idx_survey_tokens_token" ON "survey_tokens"("token");
CREATE INDEX "idx_survey_tokens_student_email" ON "survey_tokens"("student_email");
CREATE INDEX "idx_survey_tokens_campaign_id" ON "survey_tokens"("campaign_id");
CREATE INDEX "idx_survey_tokens_completed" ON "survey_tokens"("completed");

-- Survey completions indexes
CREATE INDEX "idx_survey_completions_survey_id" ON "survey_completions"("survey_id");
CREATE INDEX "idx_survey_completions_campaign_id" ON "survey_completions"("campaign_id");
CREATE INDEX "idx_survey_completions_student_email" ON "survey_completions"("student_email");
CREATE INDEX "idx_survey_completions_token_id" ON "survey_completions"("token_id");
CREATE INDEX "idx_survey_completions_completed" ON "survey_completions"("completed");

-- Survey responses indexes
CREATE INDEX "idx_survey_responses_campaign_id" ON "survey_responses"("campaign_id");
CREATE INDEX "idx_survey_responses_commitment" ON "survey_responses"("commitment");

-- Decrypted responses indexes
CREATE INDEX "idx_decrypted_responses_survey_response_id" ON "decrypted_responses"("survey_response_id");
CREATE INDEX "idx_decrypted_responses_survey_id" ON "decrypted_responses"("survey_id");
CREATE INDEX "idx_decrypted_responses_campaign_id" ON "decrypted_responses"("campaign_id");

-- Parsed responses indexes
CREATE INDEX "idx_parsed_responses_decrypted_response_id" ON "parsed_responses"("decrypted_response_id");
CREATE INDEX "idx_parsed_responses_survey_id" ON "parsed_responses"("survey_id");
CREATE INDEX "idx_parsed_responses_campaign_id" ON "parsed_responses"("campaign_id");
CREATE INDEX "idx_parsed_responses_teacher_id" ON "parsed_responses"("teacher_id");
CREATE INDEX "idx_parsed_responses_course_code" ON "parsed_responses"("course_code");

-- Analytics indexes
CREATE INDEX "idx_survey_analytics_survey_id" ON "survey_analytics"("survey_id");
CREATE INDEX "idx_survey_analytics_campaign_id" ON "survey_analytics"("campaign_id");

-- Teacher performance indexes
CREATE INDEX "idx_teacher_performance_teacher_id" ON "teacher_performance"("teacher_id");
CREATE INDEX "idx_teacher_performance_campaign_id" ON "teacher_performance"("campaign_id");
CREATE INDEX "idx_teacher_performance_semester_id" ON "teacher_performance"("semester_id");

-- Student completion indexes
CREATE INDEX "idx_student_completion_student_id" ON "student_completion"("student_id");
CREATE INDEX "idx_student_completion_campaign_id" ON "student_completion"("campaign_id");
CREATE INDEX "idx_student_completion_semester_id" ON "student_completion"("semester_id");

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON "admins"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_logins_updated_at BEFORE UPDATE ON "teacher_logins"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON "schools"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON "students"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON "teachers"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON "courses"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON "semesters"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_campaigns_updated_at BEFORE UPDATE ON "survey_campaigns"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_assignments_updated_at BEFORE UPDATE ON "course_assignments"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON "enrollments"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_campaigns_updated_at BEFORE UPDATE ON "survey_campaigns"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON "surveys"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_tokens_updated_at BEFORE UPDATE ON "survey_tokens"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_completions_updated_at BEFORE UPDATE ON "survey_completions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_responses_updated_at BEFORE UPDATE ON "survey_responses"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_analytics_updated_at BEFORE UPDATE ON "survey_analytics"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_performance_updated_at BEFORE UPDATE ON "teacher_performance"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_completion_updated_at BEFORE UPDATE ON "student_completion"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETION TRACKING QUERIES
-- ============================================================================

-- Students not completed in campaign (campaign-level completion)
CREATE OR REPLACE VIEW "campaign_completion_status" AS
SELECT 
    sc.id as campaign_id,
    sc.name as campaign_name,
    s.email as student_email,
    s.name as student_name,
    st.completed as token_completed,
    st.completed_at
FROM survey_campaigns sc
CROSS JOIN students s
LEFT JOIN survey_tokens st ON s.email = st.student_email AND st.campaign_id = sc.id
WHERE sc.status = 'closed';

-- Student participation rate (individual survey completion tracking)
CREATE OR REPLACE VIEW "student_participation_rate" AS
SELECT 
    s.email as student_email,
    s.name as student_name,
    sc.id as campaign_id,
    sc.name as campaign_name,
    COUNT(scp.survey_id) as total_required_surveys,
    COUNT(CASE WHEN scp.completed = true THEN 1 END) as completed_surveys,
    ROUND(
        COUNT(CASE WHEN scp.completed = true THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(scp.survey_id), 0) * 100, 2
    ) as participation_rate_percentage
FROM students s
JOIN survey_tokens st ON s.email = st.student_email
JOIN survey_campaigns sc ON st.campaign_id = sc.id
LEFT JOIN survey_completions scp ON s.email = scp.student_email AND scp.campaign_id = sc.id
WHERE sc.status = 'closed'
GROUP BY s.email, s.name, sc.id, sc.name;

-- Student enrollment completion tracking (specific enrollments not completed)
CREATE OR REPLACE VIEW "enrollment_completion_status" AS
SELECT 
    e.student_id,
    s.email as student_email,
    s.name as student_name,
    c.code as course_code,
    c.name as course_name,
    ca.campaign_id,
    sc.name as campaign_name,
    st.completed as token_completed,
    scp.completed as survey_completed
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id
JOIN course_assignments ca ON e.course_assignment_id = ca.id
JOIN survey_campaigns sc ON ca.campaign_id = sc.id
LEFT JOIN survey_tokens st ON s.email = st.student_email AND st.campaign_id = sc.id
LEFT JOIN survey_completions scp ON s.email = scp.student_email AND scp.survey_id IN (
    SELECT id FROM surveys WHERE course_id = c.id AND campaign_id = sc.id
)
WHERE sc.status = 'closed';

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample admin
INSERT INTO "admins" ("id", "email", "name", "password_hash", "role") VALUES
    ('admin-001', 'admin@university.edu', 'System Administrator', 'hashed_password', 'super_admin')
ON CONFLICT ("id") DO NOTHING;

-- Insert sample schools
INSERT INTO "schools" ("id", "name", "code") VALUES
    ('school-cse', 'School of Computer Science and Engineering', 'CSE'),
    ('school-eng', 'School of Engineering', 'ENG'),
    ('school-bus', 'School of Business', 'BUS')
ON CONFLICT ("id") DO NOTHING;

-- Insert sample semester
INSERT INTO "semesters" ("id", "name", "start_date", "end_date", "status") VALUES
    ('semester-fall-2024', 'Fall 2024', '2024-08-15', '2024-12-15', 'planning')
ON CONFLICT ("id") DO NOTHING;

-- Success message
SELECT 'University scaling database schema created successfully!' as status;
