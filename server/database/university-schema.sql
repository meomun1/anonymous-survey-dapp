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
    "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'graduated', 'transferred', 'suspended', 'withdrawn')),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Teachers table
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "school_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Courses table
CREATE TABLE "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE, -- e.g., "CS101", "MATH201"
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
    "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'teachers_input', 'open', 'closed', 'published')),
    "created_by" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    
    -- Cryptographic keys (moved from individual surveys to campaigns)
    "blind_signature_public_key" TEXT NOT NULL, -- Base64 encoded RSA public key for blind signatures
    "encryption_public_key" TEXT NOT NULL,      -- Base64 encoded RSA public key for encryption
    "blind_signature_private_key" TEXT NOT NULL, -- Base64 encoded RSA private key for blind signatures (encrypted)
    "encryption_private_key" TEXT NOT NULL,      -- Base64 encoded RSA private key for encryption (encrypted)
    
    -- Blockchain integration
    "blockchain_address" TEXT, -- Address of the campaign on the blockchain
    "merkle_root" TEXT,        -- Merkle root for verification (calculated off-chain)
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "is_public_enabled" BOOLEAN NOT NULL DEFAULT false,
    
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_campaigns_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "survey_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Course Assignments table (teacher-course assignments)
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacher_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "course_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("teacher_id", "course_id", "semester_id")
);

-- Student Enrollments table (student-course enrollments)
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "semester_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enrollments_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("student_id", "course_id", "semester_id")
);

-- ============================================================================
-- SURVEY MANAGEMENT TABLES (Lightweight - inherit crypto from campaigns)
-- ============================================================================

-- Surveys table (lightweight units within campaigns)
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "template_id" TEXT NOT NULL, -- Template identifier (e.g., 'teaching_quality_25q')
    "total_questions" INTEGER,   -- Number of questions from template
    
    -- Course/Teacher associations (nullable for event surveys)
    "course_id" TEXT,            -- NULL for event surveys
    "teacher_id" TEXT,           -- NULL for event surveys
    
    "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'active', 'closed', 'published')),
    "total_responses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "surveys_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "surveys_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "surveys_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Survey Tokens table (campaign-level token management)
CREATE TABLE "survey_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "campaign_id" TEXT NOT NULL,
    "student_email" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    
    CONSTRAINT "survey_tokens_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Survey Completions table (tracks individual survey completion)
CREATE TABLE "survey_completions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_email" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_completions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("student_email", "survey_id")
);

-- ============================================================================
-- RESPONSE STORAGE TABLES (Campaign-level storage)
-- ============================================================================

-- Survey Responses table (stores encrypted data from blockchain - campaign level only)
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL, -- Only campaign-level info (NO survey_id)
    "encrypted_data" TEXT NOT NULL, -- From blockchain
    "commitment" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_responses_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Decrypted Responses table (stores decrypted answer_string and extracts survey_id)
CREATE TABLE "decrypted_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "response_id" TEXT NOT NULL,
    "answer_string" TEXT NOT NULL, -- "surveyId|courseCode|teacherId|123451...123"
    "survey_id" TEXT NOT NULL, -- Extracted from answer_string
    "course_code" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "decrypted_responses_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Parsed Responses table (stores parsed answers for analytics)
CREATE TABLE "parsed_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decrypted_response_id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL, -- From decrypted_responses
    "course_code" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "answers" INTEGER[] NOT NULL, -- [1,2,3,4,5,1...] (25 numbers)
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "parsed_responses_decrypted_response_id_fkey" FOREIGN KEY ("decrypted_response_id") REFERENCES "decrypted_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- ANALYTICS TABLES
-- ============================================================================

-- Survey Analytics table (campaign-level analytics)
CREATE TABLE "survey_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "question_statistics" JSONB, -- Per-question answer distributions
    "overall_statistics" JSONB,  -- Overall score distribution and averages
    "category_statistics" JSONB, -- Category-based analysis
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "survey_analytics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("campaign_id")
);

-- Teacher Performance table (aggregated teacher performance across campaigns)
CREATE TABLE "teacher_performance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacher_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "average_score" DECIMAL(5,2) NOT NULL,
    "total_responses" INTEGER NOT NULL,
    "score_distribution" JSONB NOT NULL, -- Distribution of scores across questions
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "teacher_performance_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teacher_performance_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("teacher_id", "campaign_id")
);

-- Student Completion table (student participation tracking)
CREATE TABLE "student_completion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_email" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "total_surveys" INTEGER NOT NULL,
    "completed_surveys" INTEGER NOT NULL,
    "completion_rate" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "student_completion_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("student_email", "campaign_id")
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Campaign indexes
CREATE INDEX "idx_survey_campaigns_semester_id" ON "survey_campaigns"("semester_id");
CREATE INDEX "idx_survey_campaigns_status" ON "survey_campaigns"("status");
CREATE INDEX "idx_survey_campaigns_type" ON "survey_campaigns"("type");
CREATE INDEX "idx_survey_campaigns_created_by" ON "survey_campaigns"("created_by");

-- Survey indexes
CREATE INDEX "idx_surveys_campaign_id" ON "surveys"("campaign_id");
CREATE INDEX "idx_surveys_course_id" ON "surveys"("course_id");
CREATE INDEX "idx_surveys_teacher_id" ON "surveys"("teacher_id");
CREATE INDEX "idx_surveys_status" ON "surveys"("status");

-- Token indexes
CREATE INDEX "idx_survey_tokens_campaign_id" ON "survey_tokens"("campaign_id");
CREATE INDEX "idx_survey_tokens_student_email" ON "survey_tokens"("student_email");
CREATE INDEX "idx_survey_tokens_used" ON "survey_tokens"("used");
CREATE INDEX "idx_survey_tokens_is_completed" ON "survey_tokens"("is_completed");

-- Response indexes
CREATE INDEX "idx_survey_responses_campaign_id" ON "survey_responses"("campaign_id");
CREATE INDEX "idx_survey_responses_commitment" ON "survey_responses"("commitment");
CREATE INDEX "idx_decrypted_responses_survey_id" ON "decrypted_responses"("survey_id");
CREATE INDEX "idx_decrypted_responses_course_code" ON "decrypted_responses"("course_code");
CREATE INDEX "idx_decrypted_responses_teacher_id" ON "decrypted_responses"("teacher_id");
CREATE INDEX "idx_parsed_responses_survey_id" ON "parsed_responses"("survey_id");
CREATE INDEX "idx_parsed_responses_course_code" ON "parsed_responses"("course_code");
CREATE INDEX "idx_parsed_responses_teacher_id" ON "parsed_responses"("teacher_id");

-- Analytics indexes
CREATE INDEX "idx_survey_analytics_campaign_id" ON "survey_analytics"("campaign_id");
CREATE INDEX "idx_teacher_performance_teacher_id" ON "teacher_performance"("teacher_id");
CREATE INDEX "idx_teacher_performance_campaign_id" ON "teacher_performance"("campaign_id");
CREATE INDEX "idx_student_completion_student_email" ON "student_completion"("student_email");
CREATE INDEX "idx_student_completion_campaign_id" ON "student_completion"("campaign_id");

-- University structure indexes
CREATE INDEX "idx_students_school_id" ON "students"("school_id");
CREATE INDEX "idx_students_email" ON "students"("email");
CREATE INDEX "idx_students_status" ON "students"("status");
CREATE INDEX "idx_students_active_school" ON "students"("school_id", "status") WHERE "status" = 'active';
CREATE INDEX "idx_teachers_school_id" ON "teachers"("school_id");
CREATE INDEX "idx_teachers_email" ON "teachers"("email");
CREATE INDEX "idx_courses_school_id" ON "courses"("school_id");
CREATE INDEX "idx_courses_code" ON "courses"("code");

-- Assignment and enrollment indexes
CREATE INDEX "idx_course_assignments_teacher_id" ON "course_assignments"("teacher_id");
CREATE INDEX "idx_course_assignments_course_id" ON "course_assignments"("course_id");
CREATE INDEX "idx_course_assignments_semester_id" ON "course_assignments"("semester_id");
CREATE INDEX "idx_enrollments_student_id" ON "enrollments"("student_id");
CREATE INDEX "idx_enrollments_course_id" ON "enrollments"("course_id");
CREATE INDEX "idx_enrollments_semester_id" ON "enrollments"("semester_id");

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATED_AT
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at column
CREATE TRIGGER "update_admins_updated_at" BEFORE UPDATE ON "admins" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_teacher_logins_updated_at" BEFORE UPDATE ON "teacher_logins" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_schools_updated_at" BEFORE UPDATE ON "schools" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_students_updated_at" BEFORE UPDATE ON "students" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_teachers_updated_at" BEFORE UPDATE ON "teachers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "courses" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_semesters_updated_at" BEFORE UPDATE ON "semesters" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_survey_campaigns_updated_at" BEFORE UPDATE ON "survey_campaigns" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_course_assignments_updated_at" BEFORE UPDATE ON "course_assignments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_enrollments_updated_at" BEFORE UPDATE ON "enrollments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_surveys_updated_at" BEFORE UPDATE ON "surveys" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_survey_responses_updated_at" BEFORE UPDATE ON "survey_responses" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_decrypted_responses_updated_at" BEFORE UPDATE ON "decrypted_responses" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_parsed_responses_updated_at" BEFORE UPDATE ON "parsed_responses" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_survey_analytics_updated_at" BEFORE UPDATE ON "survey_analytics" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_teacher_performance_updated_at" BEFORE UPDATE ON "teacher_performance" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "update_student_completion_updated_at" BEFORE UPDATE ON "student_completion" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMPLETION TRACKING
-- ============================================================================

-- Campaign completion status view
CREATE VIEW "campaign_completion_status" AS
SELECT 
    sc.id as campaign_id,
    sc.name as campaign_name,
    sc.status as campaign_status,
    COUNT(DISTINCT st.student_email) as total_students,
    COUNT(DISTINCT CASE WHEN st.is_completed = true THEN st.student_email END) as completed_students,
    CASE 
        WHEN COUNT(DISTINCT st.student_email) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN st.is_completed = true THEN st.student_email END)::DECIMAL / COUNT(DISTINCT st.student_email)) * 100, 2)
        ELSE 0 
    END as completion_percentage
FROM survey_campaigns sc
LEFT JOIN survey_tokens st ON sc.id = st.campaign_id
GROUP BY sc.id, sc.name, sc.status;

-- Student participation rate view
CREATE VIEW "student_participation_rate" AS
SELECT 
    st.student_email,
    sc.name as campaign_name,
    COUNT(DISTINCT s.id) as total_surveys,
    COUNT(DISTINCT scp.survey_id) as completed_surveys,
    CASE 
        WHEN COUNT(DISTINCT s.id) > 0 
        THEN ROUND((COUNT(DISTINCT scp.survey_id)::DECIMAL / COUNT(DISTINCT s.id)) * 100, 2)
        ELSE 0 
    END as participation_rate
FROM survey_tokens st
JOIN survey_campaigns sc ON st.campaign_id = sc.id
JOIN surveys s ON sc.id = s.campaign_id
LEFT JOIN survey_completions scp ON st.student_email = scp.student_email AND s.id = scp.survey_id
GROUP BY st.student_email, sc.name;

-- Enrollment completion status view
CREATE VIEW "enrollment_completion_status" AS
SELECT 
    e.student_id,
    e.course_id,
    c.name as course_name,
    t.name as teacher_name,
    sc.name as campaign_name,
    s.id as survey_id,
    CASE WHEN scp.id IS NOT NULL THEN true ELSE false END as is_completed
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN course_assignments ca ON e.course_id = ca.course_id AND e.semester_id = ca.semester_id
JOIN teachers t ON ca.teacher_id = t.id
JOIN survey_campaigns sc ON e.semester_id = sc.semester_id
LEFT JOIN surveys s ON sc.id = s.campaign_id AND c.id = s.course_id AND t.id = s.teacher_id
LEFT JOIN survey_completions scp ON s.id = scp.survey_id AND e.student_id = scp.student_email;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample admin
INSERT INTO "admins" ("id", "email", "name", "password_hash", "role") VALUES 
('admin_001', 'admin@university.edu', 'University Admin', '$2b$10$example_hash', 'super_admin');

-- Insert sample schools
INSERT INTO "schools" ("id", "name", "code", "description") VALUES 
('school_001', 'School of Computer Science and Engineering', 'CSE', 'Computer Science and Engineering programs'),
('school_002', 'School of Business', 'BUS', 'Business and Management programs'),
('school_003', 'School of Engineering', 'ENG', 'General Engineering programs');

-- Insert sample semester
INSERT INTO "semesters" ("id", "name", "start_date", "end_date", "status") VALUES 
('sem_001', 'Fall 2024', '2024-09-01', '2024-12-15', 'active');

-- Success message
SELECT 'University scaling database schema created successfully!' as status;
