-- Migration: Add campaign_id to course_assignments and enrollments
-- Created: 2025-10-24
-- Purpose: Make course assignments and enrollments campaign-specific instead of semester-specific
-- Reason: Multiple campaigns can exist in the same semester, causing data to be shared incorrectly

-- ============================================================================
-- STEP 1: Add campaign_id columns
-- ============================================================================

-- Add campaign_id to course_assignments
ALTER TABLE "course_assignments"
ADD COLUMN "campaign_id" TEXT;

-- Add campaign_id to enrollments
ALTER TABLE "enrollments"
ADD COLUMN "campaign_id" TEXT;

-- ============================================================================
-- STEP 2: Populate campaign_id from semester_id
-- ============================================================================
-- For existing data, we'll try to match assignments/enrollments to campaigns
-- based on semester_id. If multiple campaigns exist for a semester, we'll
-- assign to the first campaign (you may need to manually fix this)

-- Update course_assignments with campaign_id
UPDATE course_assignments ca
SET campaign_id = (
    SELECT sc.id
    FROM survey_campaigns sc
    WHERE sc.semester_id = ca.semester_id
    ORDER BY sc.created_at ASC
    LIMIT 1
)
WHERE campaign_id IS NULL;

-- Update enrollments with campaign_id
UPDATE enrollments e
SET campaign_id = (
    SELECT sc.id
    FROM survey_campaigns sc
    WHERE sc.semester_id = e.semester_id
    ORDER BY sc.created_at ASC
    LIMIT 1
)
WHERE campaign_id IS NULL;

-- ============================================================================
-- STEP 3: Make campaign_id NOT NULL and add foreign keys
-- ============================================================================

-- Make campaign_id NOT NULL in course_assignments
ALTER TABLE "course_assignments"
ALTER COLUMN "campaign_id" SET NOT NULL;

-- Make campaign_id NOT NULL in enrollments
ALTER TABLE "enrollments"
ALTER COLUMN "campaign_id" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "course_assignments"
ADD CONSTRAINT "course_assignments_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "survey_campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- STEP 4: Update unique constraints
-- ============================================================================

-- Drop old unique constraint on course_assignments
ALTER TABLE "course_assignments"
DROP CONSTRAINT IF EXISTS "course_assignments_teacher_id_course_id_semester_id_key";

-- Add new unique constraint with campaign_id
ALTER TABLE "course_assignments"
ADD CONSTRAINT "course_assignments_teacher_id_course_id_campaign_id_key"
UNIQUE("teacher_id", "course_id", "campaign_id");

-- Drop old unique constraint on enrollments
ALTER TABLE "enrollments"
DROP CONSTRAINT IF EXISTS "enrollments_student_id_course_id_semester_id_key";

-- Add new unique constraint with campaign_id
ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_student_id_course_id_campaign_id_key"
UNIQUE("student_id", "course_id", "campaign_id");

-- ============================================================================
-- STEP 5: Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_course_assignments_campaign_id"
ON "course_assignments"("campaign_id");

CREATE INDEX IF NOT EXISTS "idx_enrollments_campaign_id"
ON "enrollments"("campaign_id");

-- ============================================================================
-- STEP 6: Verify migration
-- ============================================================================

-- Show statistics
SELECT
    'course_assignments' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT campaign_id) as unique_campaigns,
    COUNT(DISTINCT semester_id) as unique_semesters
FROM course_assignments
UNION ALL
SELECT
    'enrollments' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT campaign_id) as unique_campaigns,
    COUNT(DISTINCT semester_id) as unique_semesters
FROM enrollments;

-- Success message
SELECT 'Migration 005 completed successfully! Course assignments and enrollments are now campaign-specific.' as status;
