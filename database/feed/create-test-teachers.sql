-- ============================================================================
-- CREATE TEST TEACHER ACCOUNTS
-- ============================================================================
-- This script creates sample teacher accounts for testing
-- Password for all test teachers: "teacher123"
-- Password hash generated with bcrypt (10 rounds)

-- ============================================================================
-- STEP 1: Create Teacher Records
-- ============================================================================

-- Teacher 1: Computer Science
INSERT INTO "teachers" ("id", "name", "email", "school_id")
VALUES (
    'teacher_001',
    'Dr. Sarah Johnson',
    'sarah.johnson@university.edu',
    'school_001'  -- School of Computer Science (must exist in your DB)
)
ON CONFLICT ("id") DO NOTHING;

-- Teacher 2: Computer Science
INSERT INTO "teachers" ("id", "name", "email", "school_id")
VALUES (
    'teacher_002',
    'Prof. Michael Chen',
    'michael.chen@university.edu',
    'school_001'  -- School of Computer Science
)
ON CONFLICT ("id") DO NOTHING;

-- Teacher 3: Business School
INSERT INTO "teachers" ("id", "name", "email", "school_id")
VALUES (
    'teacher_003',
    'Dr. Emily Rodriguez',
    'emily.rodriguez@university.edu',
    'school_002'  -- School of Business (must exist in your DB)
)
ON CONFLICT ("id") DO NOTHING;

-- Teacher 4: Engineering
INSERT INTO "teachers" ("id", "name", "email", "school_id")
VALUES (
    'teacher_004',
    'Prof. David Williams',
    'david.williams@university.edu',
    'school_003'  -- School of Engineering (must exist in your DB)
)
ON CONFLICT ("id") DO NOTHING;

-- Teacher 5: Computer Science
INSERT INTO "teachers" ("id", "name", "email", "school_id")
VALUES (
    'teacher_005',
    'Dr. Lisa Anderson',
    'lisa.anderson@university.edu',
    'school_001'  -- School of Computer Science
)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- STEP 2: Create Teacher Login Credentials (LINKED TO TEACHERS)
-- ============================================================================

-- Password: "teacher123"
-- Bcrypt hash (10 rounds): $2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae

-- Login for Teacher 1
INSERT INTO "teacher_logins" ("id", "email", "password_hash", "teacher_id", "is_active")
VALUES (
    'tl_001',
    'sarah.johnson@university.edu',
    '$2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae',
    'teacher_001',  -- Links to Dr. Sarah Johnson
    true
)
ON CONFLICT ("email") DO UPDATE
SET "password_hash" = EXCLUDED.password_hash,
    "teacher_id" = EXCLUDED.teacher_id,
    "is_active" = EXCLUDED.is_active;

-- Login for Teacher 2
INSERT INTO "teacher_logins" ("id", "email", "password_hash", "teacher_id", "is_active")
VALUES (
    'tl_002',
    'michael.chen@university.edu',
    '$2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae',
    'teacher_002',  -- Links to Prof. Michael Chen
    true
)
ON CONFLICT ("email") DO UPDATE
SET "password_hash" = EXCLUDED.password_hash,
    "teacher_id" = EXCLUDED.teacher_id,
    "is_active" = EXCLUDED.is_active;

-- Login for Teacher 3
INSERT INTO "teacher_logins" ("id", "email", "password_hash", "teacher_id", "is_active")
VALUES (
    'tl_003',
    'emily.rodriguez@university.edu',
    '$2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae',
    'teacher_003',  -- Links to Dr. Emily Rodriguez
    true
)
ON CONFLICT ("email") DO UPDATE
SET "password_hash" = EXCLUDED.password_hash,
    "teacher_id" = EXCLUDED.teacher_id,
    "is_active" = EXCLUDED.is_active;

-- Login for Teacher 4
INSERT INTO "teacher_logins" ("id", "email", "password_hash", "teacher_id", "is_active")
VALUES (
    'tl_004',
    'david.williams@university.edu',
    '$2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae',
    'teacher_004',  -- Links to Prof. David Williams
    true
)
ON CONFLICT ("email") DO UPDATE
SET "password_hash" = EXCLUDED.password_hash,
    "teacher_id" = EXCLUDED.teacher_id,
    "is_active" = EXCLUDED.is_active;

-- Login for Teacher 5
INSERT INTO "teacher_logins" ("id", "email", "password_hash", "teacher_id", "is_active")
VALUES (
    'tl_005',
    'lisa.anderson@university.edu',
    '$2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae',
    'teacher_005',  -- Links to Dr. Lisa Anderson
    true
)
ON CONFLICT ("email") DO UPDATE
SET "password_hash" = EXCLUDED.password_hash,
    "teacher_id" = EXCLUDED.teacher_id,
    "is_active" = EXCLUDED.is_active;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all teachers were created
SELECT 'Teachers Created:' as status;
SELECT id, name, email, school_id FROM "teachers" ORDER BY id;

-- Check that all teacher logins were created and linked
SELECT 'Teacher Logins Created (with linkage):' as status;
SELECT
    tl.id as login_id,
    tl.email,
    tl.teacher_id,
    t.name as teacher_name,
    t.school_id,
    tl.is_active
FROM "teacher_logins" tl
LEFT JOIN "teachers" t ON tl.teacher_id = t.id
ORDER BY tl.id;

-- Success message
SELECT '✅ Test teacher accounts created successfully!' as status;
SELECT '📧 Email: [any teacher email above]' as login_instructions;
SELECT '🔑 Password: teacher123' as password;
