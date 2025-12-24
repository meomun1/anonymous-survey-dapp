#!/usr/bin/env bash
set -euo pipefail

# Cleanup Workflow Script
# Resets all tokens and clears double blind signature workflow data
# Usage: ./database/cleanup-workflow.sh [campaignId]
# Example: ./database/cleanup-workflow.sh eb423b62-fa28-4291-86ef-b47eec934a1b

DB_NAME=${DB_NAME:-anonymous_survey_university}
DB_USER=${DB_USER:-postgres}

CAMPAIGN_ID=${1:-}

if [ -z "$CAMPAIGN_ID" ]; then
  echo "⚠️  No campaign ID provided. Will reset ALL tokens and workflow data."
  echo ""
  read -p "Are you sure? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
  fi
  WHERE_CLAUSE=""
  DISPLAY_MSG="all campaigns"
else
  WHERE_CLAUSE="WHERE campaign_id = '$CAMPAIGN_ID'"
  DISPLAY_MSG="campaign $CAMPAIGN_ID"
fi

echo "🧹 Cleaning up workflow data for $DISPLAY_MSG..."
echo ""

# Check PostgreSQL container
until docker exec anonymous_survey_postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; do
  echo "PostgreSQL container is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""

# Show current stats
echo "📊 Current workflow status:"
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  COUNT(*) FILTER (WHERE ticket = true) as tickets_issued,
  COUNT(*) FILTER (WHERE used = true) as tokens_used,
  COUNT(*) FILTER (WHERE is_completed = true) as surveys_completed,
  COUNT(*) as total_tokens
FROM survey_tokens $WHERE_CLAUSE;
"

if [ -n "$CAMPAIGN_ID" ]; then
  docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  (SELECT COUNT(*) FROM used_submission_signatures WHERE campaign_id = '$CAMPAIGN_ID') as submission_signatures,
  (SELECT COUNT(*) FROM used_claim_signatures WHERE campaign_id = '$CAMPAIGN_ID') as claim_signatures;
"
else
  docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  (SELECT COUNT(*) FROM used_submission_signatures) as submission_signatures,
  (SELECT COUNT(*) FROM used_claim_signatures) as claim_signatures;
"
fi

echo ""
read -p "Proceed with cleanup? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "🔄 Resetting tokens..."
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
UPDATE survey_tokens
SET
  ticket = false,
  used = false,
  is_completed = false,
  used_at = NULL,
  completed_at = NULL
$WHERE_CLAUSE;
"

echo "✅ Tokens reset!"
echo ""

echo "🗑️  Clearing used signatures..."
if [ -n "$CAMPAIGN_ID" ]; then
  docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM used_submission_signatures WHERE campaign_id = '$CAMPAIGN_ID';
DELETE FROM used_claim_signatures WHERE campaign_id = '$CAMPAIGN_ID';
"
else
  docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM used_submission_signatures;
DELETE FROM used_claim_signatures;
"
fi

echo "✅ Signatures cleared!"
echo ""

echo "📊 Final status:"
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
  COUNT(*) FILTER (WHERE ticket = true) as tickets_issued,
  COUNT(*) FILTER (WHERE used = true) as tokens_used,
  COUNT(*) FILTER (WHERE is_completed = true) as surveys_completed,
  COUNT(*) as total_tokens
FROM survey_tokens $WHERE_CLAUSE;
"

echo ""
echo "✅ Workflow cleanup complete!"
echo ""
echo "You can now run fresh tests with:"
echo "  ts-node test-scripts/test-specific-token.ts [token]"
