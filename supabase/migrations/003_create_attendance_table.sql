-- Create attendance table for tracking class attendance
-- Migration: 003_create_attendance_table.sql

-- 1. Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  marked_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add constraints
ALTER TABLE attendance
ADD CONSTRAINT attendance_unique_per_class
UNIQUE(class_id, student_id);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_attendance_class_student ON attendance(class_id, student_id);

-- 4. Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies

-- Coaches can view attendance for their classes
CREATE POLICY "Coaches can view class attendance"
ON attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = attendance.class_id
  )
);

-- Only service_role can insert (coaches via trusted API)
CREATE POLICY "Service role can manage attendance"
ON attendance FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 6. Create function to get class attendance summary
CREATE OR REPLACE FUNCTION get_attendance_summary(p_class_id UUID)
RETURNS TABLE (
  total_students INT,
  present_count INT,
  absent_count INT,
  excused_count INT,
  attendance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id)::INT as total_students,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END)::INT as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END)::INT as absent_count,
    COUNT(CASE WHEN a.status = 'excused' THEN 1 END)::INT as excused_count,
    CASE
      WHEN COUNT(DISTINCT s.id) = 0 THEN 0
      ELSE ROUND(
        COUNT(CASE WHEN a.status IN ('present', 'excused') THEN 1 END)::NUMERIC /
        COUNT(DISTINCT s.id)::NUMERIC * 100, 2
      )
    END as attendance_rate
  FROM classes c
  LEFT JOIN reservations r ON c.id = r.class_id AND r.status = 'active'
  LEFT JOIN students s ON r.student_id = s.id
  LEFT JOIN attendance a ON c.id = a.class_id AND s.id = a.student_id
  WHERE c.id = p_class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION get_attendance_summary TO authenticated;

-- 8. Add comment
COMMENT ON TABLE attendance IS 'Tracks attendance for each class. Coaches mark students as present/absent/excused after class';
