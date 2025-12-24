-- Migration: Fix duplicate surveys and add unique constraint
-- Created: 2025-10-24
-- Purpose: Prevent duplicate surveys for same campaign + course + teacher

-- ============================================================================
-- STEP 1: Delete duplicate surveys (keep the oldest one)
-- ============================================================================

-- Find and delete duplicate surveys
DELETE FROM surveys
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY campaign_id, course_id, teacher_id
                   ORDER BY created_at ASC
               ) as rn
        FROM surveys
    ) t
    WHERE t.rn > 1
);

-- ============================================================================
-- STEP 2: Add unique constraint to prevent future duplicates
-- ============================================================================

-- Add unique constraint on campaign_id + course_id + teacher_id
ALTER TABLE "surveys"
ADD CONSTRAINT "surveys_campaign_course_teacher_unique"
UNIQUE("campaign_id", "course_id", "teacher_id");

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================

-- Show any remaining potential duplicates (should be 0)
SELECT campaign_id, course_id, teacher_id, COUNT(*) as count
FROM surveys
GROUP BY campaign_id, course_id, teacher_id
HAVING COUNT(*) > 1;

-- Show survey count per campaign
SELECT campaign_id, COUNT(*) as survey_count
FROM surveys
GROUP BY campaign_id
ORDER BY campaign_id;

-- Success message
SELECT 'Migration 006 completed! Duplicate surveys removed and unique constraint added.' as status;


