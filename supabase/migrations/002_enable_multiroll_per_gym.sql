-- Enable multi-role support per gym
-- Allows same user to have admin + coach role in same gym
-- Migration: 002_enable_multiroll_per_gym.sql

-- 1. Drop existing UNIQUE constraint on gym_access
-- Old constraint: UNIQUE(user_id, gym_id)
-- New constraint: UNIQUE(user_id, gym_id, role)
ALTER TABLE gym_access DROP CONSTRAINT IF EXISTS gym_access_user_id_gym_id_key;

-- 2. Add new UNIQUE constraint that allows multiroll
ALTER TABLE gym_access
ADD CONSTRAINT gym_access_user_id_gym_id_role_key
UNIQUE(user_id, gym_id, role);

-- 3. Add function to get all roles for a user across all gyms
CREATE OR REPLACE FUNCTION get_user_roles_by_gym(p_user_id UUID)
RETURNS TABLE (gym_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ga.gym_id, ga.role
  FROM gym_access ga
  WHERE ga.user_id = p_user_id
  ORDER BY ga.gym_id, ga.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Add function to get all unique roles for a user in a specific gym
CREATE OR REPLACE FUNCTION get_user_roles_in_gym(p_user_id UUID, p_gym_id UUID)
RETURNS TABLE (role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ga.role
  FROM gym_access ga
  WHERE ga.user_id = p_user_id AND ga.gym_id = p_gym_id
  ORDER BY ga.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_roles_by_gym TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles_in_gym TO authenticated;

-- 6. Update indexes for better performance with multiroll
DROP INDEX IF EXISTS idx_gym_access_user_role;
CREATE INDEX IF NOT EXISTS idx_gym_access_user_gym_role
ON gym_access(user_id, gym_id, role);

-- 7. Update RLS policies to support multiroll

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own gym access" ON gym_access;
DROP POLICY IF EXISTS "Admins can manage gym access" ON gym_access;

-- Allow authenticated users to see their own gym_access entries
CREATE POLICY "Users can view own gym access"
ON gym_access FOR SELECT
USING (user_id = auth.uid());

-- Only service_role can insert (for admin/system operations)
CREATE POLICY "Service role can insert gym access"
ON gym_access FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Only service_role can update gym_access
CREATE POLICY "Service role can update gym access"
ON gym_access FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Only service_role can delete gym_access
CREATE POLICY "Service role can delete gym access"
ON gym_access FOR DELETE
USING (auth.role() = 'service_role');

-- 8. Add comment explaining multiroll support
COMMENT ON TABLE gym_access IS 'User access levels per gym. Supports multiple roles per user per gym via UNIQUE(user_id, gym_id, role)';
COMMENT ON COLUMN gym_access.role IS 'Role of user in this gym: admin, coach, student';
