-- Superadmin operational controls
-- Adds gym lifecycle management and member visibility for platform operations

CREATE TABLE IF NOT EXISTS gym_management_states (
  gym_id UUID PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  blocked_reason TEXT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NULL,
  blocked_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE gym_management_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage gym management states" ON gym_management_states;
CREATE POLICY "Service role can manage gym management states"
ON gym_management_states
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_gym_management_states_active
ON gym_management_states(is_active);

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
  ORDER BY ga.gym_id, ga.role;
END;
$$;

CREATE OR REPLACE FUNCTION set_gym_active_state(
  p_gym_id UUID,
  p_is_active BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  gym_id UUID,
  is_active BOOLEAN,
  blocked_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE
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
    blocked_reason,
    blocked_at,
    blocked_by,
    updated_at
  )
  VALUES (
    p_gym_id,
    p_is_active,
    CASE WHEN p_is_active THEN NULL ELSE NULLIF(TRIM(COALESCE(p_reason, '')), '') END,
    CASE WHEN p_is_active THEN NULL ELSE now() END,
    CASE WHEN p_is_active THEN NULL ELSE auth.uid() END,
    now()
  )
  ON CONFLICT (gym_id) DO UPDATE
  SET
    is_active = EXCLUDED.is_active,
    blocked_reason = EXCLUDED.blocked_reason,
    blocked_at = EXCLUDED.blocked_at,
    blocked_by = EXCLUDED.blocked_by,
    updated_at = now();

  RETURN QUERY
  SELECT
    gms.gym_id,
    gms.is_active,
    gms.blocked_reason,
    gms.blocked_at
  FROM gym_management_states gms
  WHERE gms.gym_id = p_gym_id;
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
  blocked_reason TEXT
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
      SELECT
        gyms.id,
        gyms.name,
        gyms.city,
        gyms.created_at AS gym_created_at
      FROM gyms
      ORDER BY gyms.created_at DESC
    LOOP
      gym_id := g.id;
      gym_name := g.name;
      city := g.city;
      created_at := g.gym_created_at;

      SELECT COUNT(*)::INT
      INTO student_count
      FROM students s
      WHERE s.gym_id = g.id;

      SELECT COUNT(*)::INT
      INTO class_count
      FROM classes c
      WHERE c.gym_id = g.id;

      SELECT COUNT(*)::INT
      INTO admin_count
      FROM gym_access ga
      WHERE ga.gym_id = g.id
        AND ga.role = 'admin';

      SELECT COUNT(*)::INT
      INTO coach_count
      FROM gym_access ga
      WHERE ga.gym_id = g.id
        AND ga.role = 'coach';

      SELECT
        COALESCE(gms.is_active, TRUE),
        gms.blocked_reason
      INTO is_active, blocked_reason
      FROM gym_management_states gms
      WHERE gms.gym_id = g.id;

      is_active := COALESCE(is_active, TRUE);

      monthly_revenue := 0;
      subscription_status := NULL;
      subscription_plan := NULL;
      subscription_end_date := NULL;

      IF has_payments THEN
        IF has_payment_date THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE gym_id = $1
               AND status = ''completed''
               AND payment_date >= date_trunc(''month'', now())'
          INTO monthly_revenue
          USING g.id;
        ELSIF has_payment_created_at THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE gym_id = $1
               AND status = ''completed''
               AND created_at >= date_trunc(''month'', now())'
          INTO monthly_revenue
          USING g.id;
        ELSE
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE gym_id = $1
               AND status = ''completed'''
          INTO monthly_revenue
          USING g.id;
        END IF;
      END IF;

      IF has_subscriptions THEN
        EXECUTE
          'SELECT status, plan_type, end_date
           FROM subscriptions
           WHERE gym_id = $1
           ORDER BY subscriptions.created_at DESC
           LIMIT 1'
        INTO subscription_status, subscription_plan, subscription_end_date
        USING g.id;
      END IF;

      RETURN NEXT;
    END LOOP;
  ELSE
    FOR g IN
      SELECT
        gyms.id,
        gyms.name,
        NULL::TEXT AS city,
        gyms.created_at AS gym_created_at
      FROM gyms
      ORDER BY gyms.created_at DESC
    LOOP
      gym_id := g.id;
      gym_name := g.name;
      city := g.city;
      created_at := g.gym_created_at;

      SELECT COUNT(*)::INT
      INTO student_count
      FROM students s
      WHERE s.gym_id = g.id;

      SELECT COUNT(*)::INT
      INTO class_count
      FROM classes c
      WHERE c.gym_id = g.id;

      SELECT COUNT(*)::INT
      INTO admin_count
      FROM gym_access ga
      WHERE ga.gym_id = g.id
        AND ga.role = 'admin';

      SELECT COUNT(*)::INT
      INTO coach_count
      FROM gym_access ga
      WHERE ga.gym_id = g.id
        AND ga.role = 'coach';

      SELECT
        COALESCE(gms.is_active, TRUE),
        gms.blocked_reason
      INTO is_active, blocked_reason
      FROM gym_management_states gms
      WHERE gms.gym_id = g.id;

      is_active := COALESCE(is_active, TRUE);

      monthly_revenue := 0;
      subscription_status := NULL;
      subscription_plan := NULL;
      subscription_end_date := NULL;

      IF has_payments THEN
        IF has_payment_date THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE gym_id = $1
               AND status = ''completed''
               AND payment_date >= date_trunc(''month'', now())'
          INTO monthly_revenue
          USING g.id;
        ELSIF has_payment_created_at THEN
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE gym_id = $1
               AND status = ''completed''
               AND created_at >= date_trunc(''month'', now())'
          INTO monthly_revenue
          USING g.id;
        ELSE
          EXECUTE
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE gym_id = $1
               AND status = ''completed'''
          INTO monthly_revenue
          USING g.id;
        END IF;
      END IF;

      IF has_subscriptions THEN
        EXECUTE
          'SELECT status, plan_type, end_date
           FROM subscriptions
           WHERE gym_id = $1
           ORDER BY subscriptions.created_at DESC
           LIMIT 1'
        INTO subscription_status, subscription_plan, subscription_end_date
        USING g.id;
      END IF;

      RETURN NEXT;
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_active_gym_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION set_gym_active_state(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_superadmin_gym_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_superadmin_gym_overview() TO authenticated;
