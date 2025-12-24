-- Migration 008: Add Double Blind Signature Workflow Support
-- Created: 2025-12-02
-- Description: Adds ticket tracking and signature tables for double blind signature workflow

BEGIN;

-- Add ticket column to survey_tokens table
ALTER TABLE survey_tokens
ADD COLUMN IF NOT EXISTS ticket BOOLEAN NOT NULL DEFAULT false;

-- Create index on ticket column for faster queries
CREATE INDEX IF NOT EXISTS idx_survey_tokens_ticket
ON survey_tokens(ticket);

-- Create table for tracking used submission signatures (Phase 3)
CREATE TABLE IF NOT EXISTS used_submission_signatures (
  id TEXT NOT NULL PRIMARY KEY,
  prepared_token TEXT NOT NULL,
  token_signature TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  used_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(prepared_token, token_signature),
  CONSTRAINT fk_submission_campaign FOREIGN KEY (campaign_id)
    REFERENCES survey_campaigns(id) ON DELETE CASCADE
);

-- Create indexes for used_submission_signatures
CREATE INDEX IF NOT EXISTS idx_used_submission_signatures_campaign
ON used_submission_signatures(campaign_id);

CREATE INDEX IF NOT EXISTS idx_used_submission_signatures_used_at
ON used_submission_signatures(used_at);

-- Create table for tracking used claim signatures (Phase 4)
CREATE TABLE IF NOT EXISTS used_claim_signatures (
  id TEXT NOT NULL PRIMARY KEY,
  prepared_receipt TEXT NOT NULL,
  receipt_signature TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  student_email TEXT NOT NULL,
  claimed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(prepared_receipt, receipt_signature),
  CONSTRAINT fk_claim_campaign FOREIGN KEY (campaign_id)
    REFERENCES survey_campaigns(id) ON DELETE CASCADE
);

-- Create indexes for used_claim_signatures
CREATE INDEX IF NOT EXISTS idx_used_claim_signatures_campaign
ON used_claim_signatures(campaign_id);

CREATE INDEX IF NOT EXISTS idx_used_claim_signatures_student
ON used_claim_signatures(student_email);

CREATE INDEX IF NOT EXISTS idx_used_claim_signatures_claimed_at
ON used_claim_signatures(claimed_at);

-- Add comment to document the workflow
COMMENT ON COLUMN survey_tokens.ticket IS
'Phase 1: Ticket commitment issued (prevents multiple ticket requests)';

COMMENT ON TABLE used_submission_signatures IS
'Phase 3: Tracks used authorization signatures to prevent double-use';

COMMENT ON TABLE used_claim_signatures IS
'Phase 4: Tracks used receipt signatures to prevent double-claiming';

COMMIT;

-- Verification queries
DO $$
BEGIN
  RAISE NOTICE 'Migration 008 completed successfully';
  RAISE NOTICE 'Added ticket column to survey_tokens: %',
    (SELECT column_name FROM information_schema.columns
     WHERE table_name = 'survey_tokens' AND column_name = 'ticket');
  RAISE NOTICE 'Created used_submission_signatures table: %',
    (SELECT table_name FROM information_schema.tables
     WHERE table_name = 'used_submission_signatures');
  RAISE NOTICE 'Created used_claim_signatures table: %',
    (SELECT table_name FROM information_schema.tables
     WHERE table_name = 'used_claim_signatures');
END $$;
