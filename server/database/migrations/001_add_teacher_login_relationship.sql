-- Migration: Add relationship between teacher_logins and teachers tables
-- Created: 2025-10-20
-- Purpose: Link teacher authentication to teacher records

-- Step 1: Add teacher_id column to teacher_logins table
ALTER TABLE "teacher_logins"
ADD COLUMN "teacher_id" TEXT;

-- Step 2: Add foreign key constraint
ALTER TABLE "teacher_logins"
ADD CONSTRAINT "teacher_logins_teacher_id_fkey"
FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: Create unique index to ensure one login per teacher
CREATE UNIQUE INDEX "idx_teacher_logins_teacher_id" ON "teacher_logins"("teacher_id");

-- Step 4: Add index for faster lookups
CREATE INDEX "idx_teacher_logins_email_active" ON "teacher_logins"("email") WHERE "is_active" = true;

-- Success message
SELECT 'Teacher login relationship migration completed successfully!' as status;
