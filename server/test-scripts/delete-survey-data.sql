-- Delete all survey and response data
DELETE FROM "parsed_responses";
DELETE FROM "decrypted_responses";
DELETE FROM "survey_responses";
DELETE FROM "survey_completions";
DELETE FROM "student_completion";
DELETE FROM "teacher_performance";
DELETE FROM "survey_analytics";
DELETE FROM "survey_tokens";
DELETE FROM "surveys";
DELETE FROM "survey_campaigns";

SELECT 'Survey data deleted successfully!' as status;
