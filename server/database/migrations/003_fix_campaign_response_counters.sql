-- Fix campaign response counters for existing campaigns
-- This updates the total_responses counter based on actual survey_responses data

UPDATE survey_campaigns sc
SET total_responses = (
    SELECT COUNT(*)
    FROM survey_responses sr
    WHERE sr.campaign_id = sc.id
),
updated_at = CURRENT_TIMESTAMP
WHERE total_responses = 0  -- Only update campaigns that show 0 responses
  AND EXISTS (
    SELECT 1 FROM survey_responses sr WHERE sr.campaign_id = sc.id
  );

-- Show the results
SELECT
    id,
    name,
    status,
    total_responses,
    (SELECT COUNT(*) FROM survey_responses WHERE campaign_id = survey_campaigns.id) as actual_responses
FROM survey_campaigns
WHERE status IN ('launched', 'closed', 'published')
ORDER BY created_at DESC;
