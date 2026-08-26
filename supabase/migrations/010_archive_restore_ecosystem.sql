-- Ensure gym archive behaves as a full ecosystem pause and restore.

CREATE OR REPLACE FUNCTION set_gym_archive_state(
  p_gym_id UUID,
  p_is_archived BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  gym_id UUID,
  is_archived BOOLEAN,
  archived_reason TEXT,
  archived_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO gym_management_states (
    gym_id,
    is_active,
    is_archived,
    blocked_reason,
    blocked_at,
    blocked_by,
    archived_reason,
    archived_at,
    archived_by,
    updated_at
  )
  VALUES (
    p_gym_id,
    CASE WHEN p_is_archived THEN FALSE ELSE TRUE END,
    p_is_archived,
    NULL,
    NULL,
    NULL,
    CASE WHEN p_is_archived THEN NULLIF(TRIM(COALESCE(p_reason, '')), '') ELSE NULL END,
    CASE WHEN p_is_archived THEN now() ELSE NULL END,
    CASE WHEN p_is_archived THEN auth.uid() ELSE NULL END,
    now()
  )
  ON CONFLICT (gym_id) DO UPDATE
  SET
    is_active = CASE WHEN p_is_archived THEN FALSE ELSE TRUE END,
    is_archived = p_is_archived,
    blocked_reason = NULL,
    blocked_at = NULL,
    blocked_by = NULL,
    archived_reason = CASE WHEN p_is_archived THEN NULLIF(TRIM(COALESCE(p_reason, '')), '') ELSE NULL END,
    archived_at = CASE WHEN p_is_archived THEN now() ELSE NULL END,
    archived_by = CASE WHEN p_is_archived THEN auth.uid() ELSE NULL END,
    updated_at = now();

  RETURN QUERY
  SELECT
    gms.gym_id,
    gms.is_archived,
    gms.archived_reason,
    gms.archived_at
  FROM gym_management_states gms
  WHERE gms.gym_id = p_gym_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_gym_archive_state(UUID, BOOLEAN, TEXT) TO authenticated;
