-- Make student user_id nullable to support students without auth accounts
-- This allows admins to create students via fallback method

ALTER TABLE students
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN students.user_id IS 'Foreign key to auth.users. NULL if student created without auth account (temporary)';
