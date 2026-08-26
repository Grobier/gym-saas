-- Superadmin archive and safe delete controls for gyms

ALTER TABLE gym_management_states
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS archived_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gym_management_states_archived
ON gym_management_states(is_archived);

CREATE OR REPLACE FUNCTION get_my_active_gym_roles()
RETURNS TABLE (
  gym_id UUID,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ga.gym_id, ga.role
  FROM gym_access ga
  LEFT JOIN gym_management_states gms ON gms.gym_id = ga.gym_id
  WHERE ga.user_id = auth.uid()
    AND COALESCE(gms.is_active, TRUE) = TRUE
    AND COALESCE(gms.is_archived, FALSE) = FALSE
  ORDER BY ga.gym_id, ga.role;
END;
$$;

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
    archived_reason,
    archived_at,
    archived_by,
    updated_at
  )
  VALUES (
    p_gym_id,
    CASE WHEN p_is_archived THEN FALSE ELSE TRUE END,
    p_is_archived,
    CASE WHEN p_is_archived THEN NULLIF(TRIM(COALESCE(p_reason, '')), '') ELSE NULL END,
    CASE WHEN p_is_archived THEN now() ELSE NULL END,
    CASE WHEN p_is_archived THEN auth.uid() ELSE NULL END,
    now()
  )
  ON CONFLICT (gym_id) DO UPDATE
  SET
    is_active = CASE WHEN p_is_archived THEN FALSE ELSE COALESCE(gym_management_states.is_active, TRUE) END,
    is_archived = p_is_archived,
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

CREATE OR REPLACE FUNCTION delete_gym_permanently(p_gym_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  related_students INT := 0;
  related_classes INT := 0;
  related_access INT := 0;
  related_payments INT := 0;
  related_subscriptions INT := 0;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF to_regclass('public.students') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM students WHERE gym_id = $1'
    INTO related_students
    USING p_gym_id;
  END IF;

  IF to_regclass('public.classes') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM classes WHERE gym_id = $1'
    INTO related_classes
    USING p_gym_id;
  END IF;

  IF to_regclass('public.gym_access') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM gym_access WHERE gym_id = $1'
    INTO related_access
    USING p_gym_id;
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM payments WHERE gym_id = $1'
    INTO related_payments
    USING p_gym_id;
  END IF;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM subscriptions WHERE gym_id = $1'
    INTO related_subscriptions
    USING p_gym_id;
  END IF;

  IF related_students > 0
    OR related_classes > 0
    OR related_access > 0
    OR related_payments > 0
    OR related_subscriptions > 0 THEN
    RAISE EXCEPTION 'Cannot delete gym with related data. Archive it instead.';
  END IF;

  DELETE FROM gym_management_states WHERE gym_id = p_gym_id;
  DELETE FROM gyms WHERE id = p_gym_id;
END;
$$;

DROP FUNCTION IF EXISTS get_superadmin_gym_members(UUID);
CREATE OR REPLACE FUNCTION get_superadmin_gym_members(p_gym_id UUID)
RETURNS TABLE (
  member_type TEXT,
  role TEXT,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH staff_members AS (
    SELECT
      'staff'::TEXT AS member_type,
      ga.role,
      ga.user_id,
      au.email::TEXT AS email,
      COALESCE(NULLIF(au.raw_user_meta_data ->> 'name', ''), au.email)::TEXT AS display_name,
      CASE
        WHEN COALESCE(gms.is_archived, FALSE) THEN 'archived'
        WHEN COALESCE(gms.is_active, TRUE) THEN 'active'
        ELSE 'blocked'
      END::TEXT AS status,
      ga.created_at
    FROM gym_access ga
    LEFT JOIN auth.users au ON au.id = ga.user_id
    LEFT JOIN gym_management_states gms ON gms.gym_id = ga.gym_id
    WHERE ga.gym_id = p_gym_id
      AND ga.role IN ('admin', 'coach')
  ),
  student_members AS (
    SELECT
      'student'::TEXT AS member_type,
      'student'::TEXT AS role,
      s.user_id,
      s.email::TEXT AS email,
      s.name::TEXT AS display_name,
      CASE
        WHEN COALESCE(gms.is_archived, FALSE) THEN 'archived'
        WHEN NOT COALESCE(gms.is_active, TRUE) THEN 'blocked'
        WHEN s.user_id IS NULL THEN 'without-account'
        ELSE 'active'
      END::TEXT AS status,
      s.created_at
    FROM students s
    LEFT JOIN gym_management_states gms ON gms.gym_id = s.gym_id
    WHERE s.gym_id = p_gym_id
  )
  SELECT *
  FROM (
    SELECT * FROM staff_members
    UNION ALL
    SELECT * FROM student_members
  ) members
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'coach' THEN 2
      ELSE 3
    END,
    created_at DESC NULLS LAST,
    display_name ASC;
END;
$$;

DROP FUNCTION IF EXISTS get_superadmin_gym_overview();
CREATE OR REPLACE FUNCTION get_superadmin_gym_overview()
RETURNS TABLE (
  gym_id UUID,
  gym_name TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  student_count INT,
  class_count INT,
  monthly_revenue NUMERIC,
  subscription_status TEXT,
  subscription_plan TEXT,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  admin_count INT,
  coach_count INT,
  is_active BOOLEAN,
  blocked_reason TEXT,
  is_archived BOOLEAN,
  archived_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  has_payments BOOLEAN := to_regclass('public.payments') IS NOT NULL;
  has_subscriptions BOOLEAN := to_regclass('public.subscriptions') IS NOT NULL;
  has_gym_city BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gyms'
      AND column_name = 'city'
  );
  has_payment_date BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'payment_date'
  );
  has_payment_created_at BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'created_at'
  );
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF has_gym_city THEN
    FOR g IN
      SELECT gyms.id, gyms.name, gyms.city, gyms.created_at AS gym_created_at
      FROM gyms
      ORDER BY gyms.created_at DESC
    LOOP
      gym_id := g.id;
      gym_name := g.name;
      city := g.city;
      created_at := g.gym_created_at;

      SELECT COUNT(*)::INT INTO student_count FROM students s WHERE s.gym_id = g.id;
      SELECT COUNT(*)::INT INTO class_count FROM classes c WHERE c.gym_id = g.id;
      SELECT COUNT(*)::INT INTO admin_count FROM gym_access ga WHERE ga.gym_id = g.id AND ga.role = 'admin';
      SELECT COUNT(*)::INT INTO coach_count FROM gym_access ga WHERE ga.gym_id = g.id AND ga.role = 'coach';

      SELECT
        COALESCE(gms.is_active, TRUE),
        gms.blocked_reason,
        COALESCE(gms.is_archived, FALSE),
        gms.archived_reason
      INTO is_active, blocked_reason, is_archived, archived_reason
      FROM gym_management_states gms
      WHERE gms.gym_id = g.id;

      is_active := COALESCE(is_active, TRUE);
      is_archived := COALESCE(is_archived, FALSE);

      monthly_revenue := 0;
      subscription_status := NULL;
      subscription_plan := NULL;
      subscription_end_date := NULL;

      IF has_payments THEN
        IF has_payment_date THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = $1 AND status = ''completed'' AND payment_date >= date_trunc(''month'', now())'
          INTO monthly_revenue USING g.id;
        ELSIF has_payment_created_at THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = $1 AND status = ''completed'' AND created_at >= date_trunc(''month'', now())'
          INTO monthly_revenue USING g.id;
        ELSE
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = $1 AND status = ''completed'''
          INTO monthly_revenue USING g.id;
        END IF;
      END IF;

      IF has_subscriptions THEN
        EXECUTE
          'SELECT status, plan_type, end_date FROM subscriptions WHERE gym_id = $1 ORDER BY subscriptions.created_at DESC LIMIT 1'
        INTO subscription_status, subscription_plan, subscription_end_date
        USING g.id;
      END IF;

      RETURN NEXT;
    END LOOP;
  ELSE
    FOR g IN
      SELECT gyms.id, gyms.name, NULL::TEXT AS city, gyms.created_at AS gym_created_at
      FROM gyms
      ORDER BY gyms.created_at DESC
    LOOP
      gym_id := g.id;
      gym_name := g.name;
      city := g.city;
      created_at := g.gym_created_at;

      SELECT COUNT(*)::INT INTO student_count FROM students s WHERE s.gym_id = g.id;
      SELECT COUNT(*)::INT INTO class_count FROM classes c WHERE c.gym_id = g.id;
      SELECT COUNT(*)::INT INTO admin_count FROM gym_access ga WHERE ga.gym_id = g.id AND ga.role = 'admin';
      SELECT COUNT(*)::INT INTO coach_count FROM gym_access ga WHERE ga.gym_id = g.id AND ga.role = 'coach';

      SELECT
        COALESCE(gms.is_active, TRUE),
        gms.blocked_reason,
        COALESCE(gms.is_archived, FALSE),
        gms.archived_reason
      INTO is_active, blocked_reason, is_archived, archived_reason
      FROM gym_management_states gms
      WHERE gms.gym_id = g.id;

      is_active := COALESCE(is_active, TRUE);
      is_archived := COALESCE(is_archived, FALSE);

      monthly_revenue := 0;
      subscription_status := NULL;
      subscription_plan := NULL;
      subscription_end_date := NULL;

      IF has_payments THEN
        IF has_payment_date THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = $1 AND status = ''completed'' AND payment_date >= date_trunc(''month'', now())'
          INTO monthly_revenue USING g.id;
        ELSIF has_payment_created_at THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = $1 AND status = ''completed'' AND created_at >= date_trunc(''month'', now())'
          INTO monthly_revenue USING g.id;
        ELSE
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = $1 AND status = ''completed'''
          INTO monthly_revenue USING g.id;
        END IF;
      END IF;

      IF has_subscriptions THEN
        EXECUTE
          'SELECT status, plan_type, end_date FROM subscriptions WHERE gym_id = $1 ORDER BY subscriptions.created_at DESC LIMIT 1'
        INTO subscription_status, subscription_plan, subscription_end_date
        USING g.id;
      END IF;

      RETURN NEXT;
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_active_gym_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION set_gym_archive_state(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_gym_permanently(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_superadmin_gym_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_superadmin_gym_overview() TO authenticated;
