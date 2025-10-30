-- Delete university structure data
DELETE FROM "enrollments";
DELETE FROM "course_assignments";
DELETE FROM "courses";
DELETE FROM "teachers";
DELETE FROM "students";
DELETE FROM "semesters";
DELETE FROM "schools";

SELECT 'University data deleted successfully!' as status;
