-- Migration: Add must_change_password flag for first login
-- Created: 2025-10-23
-- Purpose: Force teachers to change password on first login

-- Step 1: Add must_change_password column
ALTER TABLE "teacher_logins"
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Set flag to true for all existing teacher logins
-- (they should change their password on next login)
UPDATE "teacher_logins"
SET "must_change_password" = true
WHERE "must_change_password" = false;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN "teacher_logins"."must_change_password" IS
'Set to true when account is created or password is reset. Cleared after successful password change.';

-- Success message
SELECT 'Must change password flag added successfully!' as status,
       COUNT(*) as teachers_affected
FROM "teacher_logins";
