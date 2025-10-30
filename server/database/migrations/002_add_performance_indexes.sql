-- Performance optimization indexes for Merkle root calculation and analytics
-- Migration: 002_add_performance_indexes.sql

-- Index for faster campaign response fetching (used in Merkle root calculation)
-- Speeds up: SELECT sr.commitment FROM survey_responses sr JOIN surveys s
--           WHERE s.campaign_id = ? AND sr.commitment IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_surveys_campaign_id
ON surveys(campaign_id);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id_commitment
ON survey_responses(survey_id)
WHERE commitment IS NOT NULL;

-- Index for faster response ordering by creation time
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at
ON survey_responses(created_at);

-- Composite index for optimal campaign analytics queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_commitment
ON survey_responses(survey_id, commitment, created_at)
WHERE commitment IS NOT NULL;

-- Index for campaign status queries (used in publish workflow)
CREATE INDEX IF NOT EXISTS idx_survey_campaigns_status
ON survey_campaigns(status);

-- Index for token completion tracking
CREATE INDEX IF NOT EXISTS idx_survey_tokens_campaign_completion
ON survey_tokens(campaign_id, is_completed);

-- Performance note: These indexes optimize:
-- 1. Merkle root calculation (fetching 15k+ commitments)
-- 2. Analytics generation (aggregating responses by campaign)
-- 3. Student completion tracking
-- Expected improvement: 50-80% faster queries on large datasets
