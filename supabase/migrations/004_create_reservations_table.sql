-- Create reservations table for class bookings
-- Migration: 004_create_reservations_table.sql

-- 1. Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add constraints
ALTER TABLE reservations
ADD CONSTRAINT reservations_unique_per_class
UNIQUE(class_id, student_id);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_reservations_class_id ON reservations(class_id);
CREATE INDEX IF NOT EXISTS idx_reservations_student_id ON reservations(student_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_class_student ON reservations(class_id, student_id);

-- 4. Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies

-- Students can view their own reservations
CREATE POLICY "Students can view own reservations"
ON reservations FOR SELECT
USING (student_id = auth.uid());

-- Admins/Coaches can view reservations for their gym's classes
CREATE POLICY "Admins can view gym reservations"
ON reservations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = reservations.class_id
  )
);

-- Only service_role can insert/update/delete
CREATE POLICY "Service role can manage reservations"
ON reservations FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 6. Create function to get class roster (students registered)
CREATE OR REPLACE FUNCTION get_class_roster(p_class_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  status TEXT,
  reservation_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    u.raw_user_meta_data->>'name' as student_name,
    u.email,
    r.status,
    r.created_at
  FROM reservations r
  JOIN students s ON r.student_id = s.id
  JOIN auth.users u ON s.id = u.id
  WHERE r.class_id = p_class_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION get_class_roster TO authenticated;

-- 8. Add comment
COMMENT ON TABLE reservations IS 'Tracks class reservations by students. Coaches use this to know who registered';
