-- Superadmin reporting helpers
-- Provides secure consolidated metrics from Supabase for platform-level dashboards

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'superadmin';
$$;

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
  subscription_end_date TIMESTAMP WITH TIME ZONE
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

GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_superadmin_gym_overview() TO authenticated;
