-- Migration 009: Add Merkle roots support for new blockchain architecture
-- This migration adds support for TWO Merkle trees:
--   Tree #1: Response commitments (responses_merkle_root)
--   Tree #2: Claimed receipts (claimed_receipts_root)

-- ============================================================================
-- 0. Enable required extensions
-- ============================================================================

-- Enable pgcrypto for digest() function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Add new columns to survey_campaigns table
-- ============================================================================

-- Responses Merkle root (Tree #1)
ALTER TABLE survey_campaigns
  ADD COLUMN IF NOT EXISTS responses_merkle_root VARCHAR(64),
  ADD COLUMN IF NOT EXISTS responses_published_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0;

-- Claimed receipts Merkle root (Tree #2)
ALTER TABLE survey_campaigns
  ADD COLUMN IF NOT EXISTS claimed_receipts_root VARCHAR(64),
  ADD COLUMN IF NOT EXISTS total_claimed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claims_updated_at TIMESTAMP;

-- Blockchain metadata
ALTER TABLE survey_campaigns
  ADD COLUMN IF NOT EXISTS blockchain_signature VARCHAR(255),
  ADD COLUMN IF NOT EXISTS blockchain_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blockchain_closed_at TIMESTAMP;

-- Add comments
COMMENT ON COLUMN survey_campaigns.responses_merkle_root IS 'Merkle root of all response commitments (Tree #1)';
COMMENT ON COLUMN survey_campaigns.claimed_receipts_root IS 'Merkle root of all claimed receipts (Tree #2)';
COMMENT ON COLUMN survey_campaigns.blockchain_signature IS 'Blockchain transaction signature from initializeCampaign()';
COMMENT ON COLUMN survey_campaigns.blockchain_closed IS 'Whether campaign is closed on blockchain (prevents further updates)';

-- ============================================================================
-- 2. Add receipt_hash to existing used_claim_signatures table
-- ============================================================================

-- Add receipt_hash column (used for Merkle Tree #2)
ALTER TABLE used_claim_signatures
  ADD COLUMN IF NOT EXISTS receipt_hash VARCHAR(64);

-- Add comment
COMMENT ON COLUMN used_claim_signatures.receipt_hash IS 'SHA-256 hash of (prepared_receipt + receipt_signature) - used in Merkle Tree #2';

-- NOTE: We reuse the existing used_claim_signatures table instead of creating
-- a new claimed_receipts table. The receipt_hash is calculated from
-- the prepared_receipt and receipt_signature for inclusion in the Merkle tree.

-- ============================================================================
-- 3. Create indexes for performance
-- ============================================================================

-- Index for receipt_hash (used in Merkle tree queries)
CREATE INDEX IF NOT EXISTS idx_used_claim_signatures_receipt_hash
  ON used_claim_signatures(receipt_hash) WHERE receipt_hash IS NOT NULL;

-- Indexes for survey_campaigns (Merkle roots)
CREATE INDEX IF NOT EXISTS idx_campaigns_responses_root
  ON survey_campaigns(responses_merkle_root) WHERE responses_merkle_root IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_claimed_root
  ON survey_campaigns(claimed_receipts_root) WHERE claimed_receipts_root IS NOT NULL;

-- ============================================================================
-- 4. Migrate existing data (if any)
-- ============================================================================

-- If old merkle_root column exists, copy to responses_merkle_root
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'survey_campaigns' AND column_name = 'merkle_root'
  ) THEN
    UPDATE survey_campaigns
    SET responses_merkle_root = merkle_root
    WHERE merkle_root IS NOT NULL AND responses_merkle_root IS NULL;

    -- Optionally drop old column (commented out for safety)
    -- ALTER TABLE survey_campaigns DROP COLUMN IF EXISTS merkle_root;
  END IF;
END $$;

-- ============================================================================
-- 5. Add trigger to auto-calculate receipt_hash
-- ============================================================================

-- Trigger function to calculate receipt_hash from prepared_receipt + receipt_signature
CREATE OR REPLACE FUNCTION calculate_receipt_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate SHA-256 hash of (prepared_receipt || receipt_signature)
  -- This ensures each unique receipt has a unique hash for the Merkle tree
  NEW.receipt_hash = encode(
    digest(NEW.prepared_receipt || NEW.receipt_signature, 'sha256'),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to used_claim_signatures
DROP TRIGGER IF EXISTS calculate_used_claim_signatures_receipt_hash ON used_claim_signatures;
CREATE TRIGGER calculate_used_claim_signatures_receipt_hash
  BEFORE INSERT OR UPDATE ON used_claim_signatures
  FOR EACH ROW
  EXECUTE FUNCTION calculate_receipt_hash();

-- ============================================================================
-- 6. Print migration success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 009 completed successfully';
  RAISE NOTICE '   - Added Merkle root columns to survey_campaigns';
  RAISE NOTICE '   - Added receipt_hash column to used_claim_signatures';
  RAISE NOTICE '   - Created trigger to auto-calculate receipt_hash';
  RAISE NOTICE '   - Created indexes for performance';
  RAISE NOTICE '   - Migrated existing data (if any)';
  RAISE NOTICE '';
  RAISE NOTICE 'Blockchain Architecture:';
  RAISE NOTICE '   Tree #1: responses_merkle_root (from survey_responses.commitment)';
  RAISE NOTICE '   Tree #2: claimed_receipts_root (from used_claim_signatures.receipt_hash)';
END $$;
