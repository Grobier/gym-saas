-- Fix get_my_active_gym_roles to handle superadmin users and include gym_name
-- Superadmin users should see all active gyms

CREATE OR REPLACE FUNCTION get_my_active_gym_roles()
RETURNS TABLE (
  gym_id UUID,
  gym_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_superadmin BOOLEAN;
BEGIN
  -- Check if current user is superadmin
  SELECT (raw_app_meta_data->>'role' = 'superadmin')
  INTO v_is_superadmin
  FROM auth.users
  WHERE id = auth.uid();

  -- If superadmin, return all active gyms
  IF v_is_superadmin THEN
    RETURN QUERY
    SELECT
      g.id AS gym_id,
      g.name AS gym_name,
      'superadmin'::TEXT AS role
    FROM gyms g
    LEFT JOIN gym_management_states gms ON gms.gym_id = g.id
    WHERE COALESCE(gms.is_active, TRUE) = TRUE
    ORDER BY g.name;
  ELSE
    -- Regular users: return assigned roles with gym info
    RETURN QUERY
    SELECT
      ga.gym_id,
      g.name AS gym_name,
      ga.role
    FROM gym_access ga
    LEFT JOIN gyms g ON g.id = ga.gym_id
    LEFT JOIN gym_management_states gms ON gms.gym_id = ga.gym_id
    WHERE ga.user_id = auth.uid()
      AND COALESCE(gms.is_active, TRUE) = TRUE
    ORDER BY g.name, ga.role;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_active_gym_roles() TO authenticated;
