-- Fix gym_access RLS recursion issue
-- This migration implements a secure way to query gym_access without RLS recursion

-- 1. Ensure gym_access table exists with correct schema
CREATE TABLE IF NOT EXISTS gym_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, gym_id)
);

-- 2. Create a secure function to get user's gyms (SECURITY DEFINER)
-- This function runs with the permissions of its owner, avoiding RLS recursion
CREATE OR REPLACE FUNCTION get_user_gyms(p_user_id UUID, p_role TEXT DEFAULT 'admin')
RETURNS TABLE (gym_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ga.gym_id, ga.role
  FROM gym_access ga
  WHERE ga.user_id = p_user_id
    AND (p_role IS NULL OR ga.role = p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Enable RLS on gym_access
ALTER TABLE gym_access ENABLE ROW LEVEL SECURITY;

-- 4. Remove existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own gym access" ON gym_access;
DROP POLICY IF EXISTS "Users can insert own gym access" ON gym_access;
DROP POLICY IF EXISTS "Users can update own gym access" ON gym_access;

-- 5. Create simple RLS policies WITHOUT recursion
-- Policy: Users can view their own gym_access entries
CREATE POLICY "Users can view own gym access"
ON gym_access
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Only service role can insert (for admin setup)
-- In production, use migrations or trigger-based workflows
CREATE POLICY "Admins can manage gym access"
ON gym_access
FOR ALL
USING (
  auth.role() = 'service_role'
  OR user_id = auth.uid()
)
WITH CHECK (auth.role() = 'service_role');

-- 6. Grant execute permission on function to authenticated users
GRANT EXECUTE ON FUNCTION get_user_gyms TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_gyms TO anon;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gym_access_user_id ON gym_access(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_access_gym_id ON gym_access(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_access_user_role ON gym_access(user_id, role);
