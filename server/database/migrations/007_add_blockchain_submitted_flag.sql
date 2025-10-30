-- Migration: Add blockchain_submitted flag to survey_tokens
-- Created: 2025-10-26
-- Purpose: Track if student responses have been submitted to blockchain to prevent duplicates
-- Note: We only store a boolean flag to prevent information leakage
--       (no tx hash or timestamp that could identify individual students)

-- ============================================================================
-- STEP 1: Add blockchain_submitted column
-- ============================================================================

-- Add flag to track if responses have been submitted to blockchain
-- This prevents duplicate submissions but doesn't leak timing/transaction info
ALTER TABLE "survey_tokens"
ADD COLUMN "blockchain_submitted" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- STEP 2: Add index for performance
-- ============================================================================

-- Index for querying tokens by blockchain submission status
CREATE INDEX "survey_tokens_blockchain_submitted_idx"
ON "survey_tokens"("blockchain_submitted");

-- ============================================================================
-- STEP 3: Update existing data (if needed)
-- ============================================================================

-- Mark tokens as blockchain_submitted if they're already marked as is_completed
-- (Assumption: completed tokens have likely been submitted to blockchain)
UPDATE "survey_tokens"
SET blockchain_submitted = true
WHERE is_completed = true AND completed_at IS NOT NULL;

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

-- Show token statistics
SELECT
  COUNT(*) as total_tokens,
  SUM(CASE WHEN blockchain_submitted THEN 1 ELSE 0 END) as blockchain_submitted_count,
  SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_count
FROM survey_tokens;

-- Success message
SELECT 'Migration 007 completed! Added blockchain_submitted tracking to survey_tokens.' as status;
