-- ============================================================================
-- CREATE CUSTOM TEACHER ACCOUNT (Template)
-- ============================================================================
-- Use this template to create your own teacher accounts
--
-- INSTRUCTIONS:
-- 1. Replace the values below with your desired teacher information
-- 2. Make sure the school_id exists in your schools table
-- 3. Generate a unique ID or use UUID
-- 4. Run this script in pgAdmin
--
-- PASSWORD HASH:
-- The password hash below is for "teacher123" (bcrypt with 10 rounds)
-- To generate your own password hash, use one of these methods:
--
-- Method 1: Node.js
-- ```javascript
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('your-password', 10);
-- console.log(hash);
-- ```
--
-- Method 2: Online tool (use with caution in production!)
-- https://bcrypt-generator.com/ (use 10 rounds)
--
-- ============================================================================

-- STEP 1: Create the teacher record
INSERT INTO "teachers" ("id", "name", "email", "school_id")
VALUES (
    'teacher_CUSTOM_ID',              -- ⚠️ CHANGE THIS: Unique ID (e.g., 'teacher_006')
    'Your Teacher Name',               -- ⚠️ CHANGE THIS: Full name
    'your.email@university.edu',       -- ⚠️ CHANGE THIS: Email address
    'school_001'                       -- ⚠️ CHANGE THIS: School ID from schools table
)
ON CONFLICT ("email") DO UPDATE
SET "name" = EXCLUDED.name,
    "school_id" = EXCLUDED.school_id;

-- STEP 2: Create the teacher login (linked to teacher)
INSERT INTO "teacher_logins" ("id", "email", "password_hash", "teacher_id", "is_active")
VALUES (
    'tl_CUSTOM_ID',                    -- ⚠️ CHANGE THIS: Unique login ID (e.g., 'tl_006')
    'your.email@university.edu',       -- ⚠️ CHANGE THIS: Same email as above
    '$2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae',  -- Password: "teacher123"
    'teacher_CUSTOM_ID',               -- ⚠️ CHANGE THIS: Must match teacher ID above
    true                               -- Active status
)
ON CONFLICT ("email") DO UPDATE
SET "password_hash" = EXCLUDED.password_hash,
    "teacher_id" = EXCLUDED.teacher_id,
    "is_active" = EXCLUDED.is_active;

-- STEP 3: Verify the account was created correctly
SELECT
    tl.id as login_id,
    tl.email,
    tl.teacher_id,
    t.name as teacher_name,
    t.school_id,
    s.name as school_name,
    tl.is_active
FROM "teacher_logins" tl
LEFT JOIN "teachers" t ON tl.teacher_id = t.id
LEFT JOIN "schools" s ON t.school_id = s.id
WHERE tl.email = 'your.email@university.edu';  -- ⚠️ CHANGE THIS to match your email

-- ============================================================================
-- EXAMPLE: Creating a specific teacher
-- ============================================================================

-- Example: Create John Doe from Computer Science
/*
INSERT INTO "teachers" ("id", "name", "email", "school_id")
VALUES (
    'teacher_006',
    'Dr. John Doe',
    'john.doe@university.edu',
    'school_001'
)
ON CONFLICT ("email") DO UPDATE
SET "name" = EXCLUDED.name,
    "school_id" = EXCLUDED.school_id;

INSERT INTO "teacher_logins" ("id", "email", "password_hash", "teacher_id", "is_active")
VALUES (
    'tl_006',
    'john.doe@university.edu',
    '$2b$10$zU9FYtJoRo2iQ2thb/cmEuurcegU.S5R2k4ADNtLh4T/bSj01g4ae',
    'teacher_006',
    true
)
ON CONFLICT ("email") DO UPDATE
SET "password_hash" = EXCLUDED.password_hash,
    "teacher_id" = EXCLUDED.teacher_id,
    "is_active" = EXCLUDED.is_active;
*/
