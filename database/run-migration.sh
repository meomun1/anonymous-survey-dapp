#!/usr/bin/env bash
set -euo pipefail

# Migration runner for anonymous survey system
# Usage: ./database/run-migration.sh [migration_number]
# Example: ./database/run-migration.sh 008

DB_NAME=${DB_NAME:-anonymous_survey_university}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

MIGRATION_NUM=$1

if [ -z "$MIGRATION_NUM" ]; then
  echo "Usage: ./database/run-migration.sh [migration_number]"
  echo "Example: ./database/run-migration.sh 008"
  exit 1
fi

MIGRATION_FILE="database/migrations/${MIGRATION_NUM}_*.sql"

# Find the migration file
MIGRATION_PATH=$(ls $MIGRATION_FILE 2>/dev/null | head -n 1)

if [ -z "$MIGRATION_PATH" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  echo ""
  echo "Available migrations:"
  ls -1 database/migrations/
  exit 1
fi

echo "🔄 Running migration: $MIGRATION_PATH"
echo "Database: $DB_NAME"
echo ""

# Wait for PostgreSQL container to be ready
echo "Checking PostgreSQL container..."
until docker exec anonymous_survey_postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; do
  echo "PostgreSQL container is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""

# Run the migration
echo "Applying migration..."
docker exec -i anonymous_survey_postgres psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_PATH"

echo ""
echo "✅ Migration completed successfully!"
