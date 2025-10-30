-- Delete authentication data
DELETE FROM "teacher_logins";
-- DELETE FROM "admins"; -- Uncomment if you want to delete admin accounts

SELECT 'Authentication data deleted successfully!' as status;
