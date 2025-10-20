-- ============================================================================
-- DELETE SPECIFIC TABLE DATA
-- ============================================================================
-- Simple DELETE statements for specific tables
-- Run these individually as needed

-- Delete survey and response data
DELETE FROM "parsed_responses";
DELETE FROM "decrypted_responses";
DELETE FROM "survey_responses";
DELETE FROM "survey_completions";
DELETE FROM "student_completion";
DELETE FROM "teacher_performance";
DELETE FROM "survey_analytics";
DELETE FROM "survey_tokens";
DELETE FROM "surveys";
DELETE FROM "survey_campaigns";

-- Delete university structure data
DELETE FROM "enrollments";
DELETE FROM "course_assignments";
DELETE FROM "courses";
DELETE FROM "teachers";
DELETE FROM "students";
DELETE FROM "semesters";
DELETE FROM "schools";

-- Delete authentication data (optional)
DELETE FROM "teacher_logins";
-- DELETE FROM "admins"; -- Uncomment if you want to delete admin accounts

-- Check remaining counts
SELECT 'admins' as table_name, COUNT(*) as remaining_count FROM "admins"
UNION ALL
SELECT 'schools', COUNT(*) FROM "schools"
UNION ALL
SELECT 'students', COUNT(*) FROM "students"
UNION ALL
SELECT 'teachers', COUNT(*) FROM "teachers"
UNION ALL
SELECT 'courses', COUNT(*) FROM "courses"
UNION ALL
SELECT 'semesters', COUNT(*) FROM "semesters"
UNION ALL
SELECT 'course_assignments', COUNT(*) FROM "course_assignments"
UNION ALL
SELECT 'enrollments', COUNT(*) FROM "enrollments"
UNION ALL
SELECT 'survey_campaigns', COUNT(*) FROM "survey_campaigns"
UNION ALL
SELECT 'surveys', COUNT(*) FROM "surveys"
UNION ALL
SELECT 'survey_tokens', COUNT(*) FROM "survey_tokens"
UNION ALL
SELECT 'survey_responses', COUNT(*) FROM "survey_responses"
UNION ALL
SELECT 'decrypted_responses', COUNT(*) FROM "decrypted_responses"
UNION ALL
SELECT 'parsed_responses', COUNT(*) FROM "parsed_responses"
UNION ALL
SELECT 'survey_analytics', COUNT(*) FROM "survey_analytics"
UNION ALL
SELECT 'teacher_performance', COUNT(*) FROM "teacher_performance"
UNION ALL
SELECT 'student_completion', COUNT(*) FROM "student_completion"
UNION ALL
SELECT 'survey_completions', COUNT(*) FROM "survey_completions"
UNION ALL
SELECT 'teacher_logins', COUNT(*) FROM "teacher_logins";
