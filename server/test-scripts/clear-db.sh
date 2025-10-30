#!/bin/bash

# ============================================================================
# Clear University Database Script
# ============================================================================
# This script provides options to clear university data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}University Database Clear Script${NC}"
echo "=================================="

# Check if PostgreSQL container is running
if ! docker ps | grep -q "anonymous_survey_postgres"; then
    echo -e "${RED}Error: PostgreSQL container is not running!${NC}"
    echo "Please run: docker-compose up -d"
    exit 1
fi

# Function to execute SQL file
execute_sql() {
    local sql_file=$1
    local description=$2
    
    echo -e "${YELLOW}Executing: $description${NC}"
    echo "File: $sql_file"
    echo "----------------------------------------"
    
    if [ ! -f "$sql_file" ]; then
        echo -e "${RED}Error: SQL file not found: $sql_file${NC}"
        exit 1
    fi
    
    # Execute SQL file
    docker exec -i anonymous_survey_postgres psql -U postgres -d anonymous_survey_university < "$sql_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully executed: $description${NC}"
    else
        echo -e "${RED}✗ Failed to execute: $description${NC}"
        exit 1
    fi
    echo ""
}

# Function to show current data counts
show_counts() {
    echo -e "${YELLOW}Current Database Counts:${NC}"
    echo "----------------------------------------"
    docker exec anonymous_survey_postgres psql -U postgres -d anonymous_survey_university -c "
    SELECT 'admins' as table_name, COUNT(*) as count FROM \"admins\"
    UNION ALL
    SELECT 'schools', COUNT(*) FROM \"schools\"
    UNION ALL
    SELECT 'students', COUNT(*) FROM \"students\"
    UNION ALL
    SELECT 'teachers', COUNT(*) FROM \"teachers\"
    UNION ALL
    SELECT 'courses', COUNT(*) FROM \"courses\"
    UNION ALL
    SELECT 'semesters', COUNT(*) FROM \"semesters\"
    UNION ALL
    SELECT 'course_assignments', COUNT(*) FROM \"course_assignments\"
    UNION ALL
    SELECT 'enrollments', COUNT(*) FROM \"enrollments\"
    UNION ALL
    SELECT 'survey_campaigns', COUNT(*) FROM \"survey_campaigns\"
    UNION ALL
    SELECT 'surveys', COUNT(*) FROM \"surveys\"
    UNION ALL
    SELECT 'survey_tokens', COUNT(*) FROM \"survey_tokens\"
    UNION ALL
    SELECT 'survey_responses', COUNT(*) FROM \"survey_responses\"
    UNION ALL
    SELECT 'decrypted_responses', COUNT(*) FROM \"decrypted_responses\"
    UNION ALL
    SELECT 'parsed_responses', COUNT(*) FROM \"parsed_responses\"
    UNION ALL
    SELECT 'survey_analytics', COUNT(*) FROM \"survey_analytics\"
    UNION ALL
    SELECT 'teacher_performance', COUNT(*) FROM \"teacher_performance\"
    UNION ALL
    SELECT 'student_completion', COUNT(*) FROM \"student_completion\"
    UNION ALL
    SELECT 'survey_completions', COUNT(*) FROM \"survey_completions\"
    UNION ALL
    SELECT 'teacher_logins', COUNT(*) FROM \"teacher_logins\"
    ORDER BY table_name;
    "
    echo ""
}

# Main menu
echo "Choose an option:"
echo "1. Show current data counts"
echo "2. Reset data (preserve admin and basic structure)"
echo "3. Clear ALL data (including admin - DANGEROUS)"
echo "4. Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        show_counts
        ;;
    2)
        echo -e "${YELLOW}This will reset all university data while preserving admin account and basic structure.${NC}"
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            execute_sql "test-scripts/reset-university-data.sql" "Reset University Data"
            show_counts
        else
            echo "Operation cancelled."
        fi
        ;;
    3)
        echo -e "${RED}WARNING: This will delete ALL data including admin accounts!${NC}"
        echo -e "${RED}You will need to recreate admin accounts to access the system.${NC}"
        read -p "Are you absolutely sure? Type 'DELETE ALL' to confirm: " confirm
        if [[ $confirm == "DELETE ALL" ]]; then
            execute_sql "test-scripts/clear-university-data.sql" "Clear ALL University Data"
            show_counts
        else
            echo "Operation cancelled."
        fi
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Script completed successfully!${NC}"
