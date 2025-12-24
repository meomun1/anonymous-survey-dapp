#!/usr/bin/env bash
set -euo pipefail

# Reset Token Script
# Usage: ./database/reset-token.sh [token]
# Example: ./database/reset-token.sh 77ea9bb62af9595ce4282abb807cd7f0cea5e50bf21e36879c55d432189ae8a2

DB_NAME=${DB_NAME:-anonymous_survey_university}
DB_USER=${DB_USER:-postgres}

TOKEN=$1

if [ -z "$TOKEN" ]; then
  echo "Usage: ./database/reset-token.sh [token]"
  echo "Example: ./database/reset-token.sh 77ea9bb62af9595ce4282abb807cd7f0cea5e50bf21e36879c55d432189ae8a2"
  exit 1
fi

echo "🔄 Resetting token: ${TOKEN:0:20}..."
echo ""

# Check PostgreSQL container
until docker exec anonymous_survey_postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; do
  echo "PostgreSQL container is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""

# Reset the token
echo "Resetting token flags..."
docker exec anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" -c "
UPDATE survey_tokens
SET
  ticket = false,
  used = false,
  is_completed = false,
  used_at = NULL,
  completed_at = NULL
WHERE token = '$TOKEN';

SELECT
  token,
  ticket,
  used,
  is_completed,
  used_at,
  completed_at
FROM survey_tokens
WHERE token = '$TOKEN';
"

echo ""
echo "✅ Token reset complete!"
echo ""
echo "Token status:"
echo "  ticket = false"
echo "  used = false"
echo "  is_completed = false"
echo "  used_at = NULL"
echo "  completed_at = NULL"
