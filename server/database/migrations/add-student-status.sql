-- Migration: Add status column to students table
-- This migration adds student lifecycle management

-- Add status column to students table
ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Add index for status-based queries
CREATE INDEX idx_students_status ON students(status);

-- Add composite index for active students
CREATE INDEX idx_students_active_school ON students(school_id, status) WHERE status = 'active';

-- Update existing students to have 'active' status (they should already be active)
UPDATE students SET status = 'active' WHERE status IS NULL;

-- Add check constraint for valid status values
ALTER TABLE students ADD CONSTRAINT students_status_check 
CHECK (status IN ('active', 'graduated', 'transferred', 'suspended', 'withdrawn'));

-- Success message
SELECT 'Student status column added successfully!' as status;
