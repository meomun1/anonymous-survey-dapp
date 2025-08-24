#!/bin/bash

# Database Viewer Script for Anonymous Survey System
# Usage: ./view-db.sh [table_name]

echo "🗄️  Anonymous Survey Database Viewer"
echo "======================================"

# Check if table name is provided
if [ -n "$1" ]; then
    TABLE_NAME=$1
    echo "📋 Showing contents of table: $TABLE_NAME"
    echo ""
    
    # Show table structure and sample data
    docker exec -i anonymous_survey_postgres psql -U postgres -d anonymous_survey << EOF
        \d $TABLE_NAME
        SELECT '--- Sample Data ---' as info;
        SELECT * FROM $TABLE_NAME LIMIT 5;
EOF
else
    echo "📊 Database Overview:"
    echo ""
    
    # Show all tables and their row counts
    docker exec -i anonymous_survey_postgres psql -U postgres -d anonymous_survey << EOF
        SELECT 
            schemaname,
            tablename,
            n_tup_ins as rows_inserted,
            n_tup_upd as rows_updated,
            n_tup_del as rows_deleted
        FROM pg_stat_user_tables 
        ORDER BY tablename;
        
        SELECT '--- Table List ---' as info;
        \dt
        
        SELECT '--- Recent Surveys ---' as info;
        SELECT id, short_id, title, is_published, created_at 
        FROM surveys 
        ORDER BY created_at DESC 
        LIMIT 3;
        
        SELECT '--- Token Counts ---' as info;
        SELECT 
            s.title,
            COUNT(t.id) as total_tokens,
            COUNT(CASE WHEN t.used THEN 1 END) as used_tokens,
            COUNT(CASE WHEN t.is_completed THEN 1 END) as completed_tokens
        FROM surveys s
        LEFT JOIN tokens t ON s.id = t.survey_id
        GROUP BY s.id, s.title;
EOF
fi

echo ""
echo "💡 Tips:"
echo "  - Use: ./view-db.sh surveys    (to view specific table)"
echo "  - Use: ./view-db.sh            (for overview)"
echo "  - Access pgAdmin at: http://localhost:8080"
