const https = require('https');

const supabaseUrl = 'tzsyzwztlfbqbpvpncqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c3l6d3p0bGZicWJwdnBuY3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTEyMDEsImV4cCI6MjEwMjQ2NzIwMX0.2qxgrbIwWetinpOt2L8inTheHfpEZ6q8wUhydFsNl2A';

// Las políticas RLS deben ejecutarse en Supabase SQL Editor
// porque requieren acceso como super_admin

const policies = [
  `ALTER TABLE students ENABLE ROW LEVEL SECURITY;`,

  `CREATE POLICY "admin_can_create_students" ON students
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gym_access
      WHERE gym_access.user_id = auth.uid()
        AND gym_access.gym_id = students.gym_id
        AND gym_access.role = 'admin'
    )
  );`,

  `CREATE POLICY "admin_coach_can_view_students" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gym_access
      WHERE gym_access.user_id = auth.uid()
        AND gym_access.gym_id = students.gym_id
        AND gym_access.role IN ('admin', 'coach')
    )
  );`,

  `CREATE POLICY "student_can_view_self" ON students
  FOR SELECT
  USING (user_id = auth.uid());`,

  `CREATE POLICY "admin_can_update_students" ON students
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gym_access
      WHERE gym_access.user_id = auth.uid()
        AND gym_access.gym_id = students.gym_id
        AND gym_access.role = 'admin'
    )
  );`,
];

console.log('🔐 Políticas RLS para aplicar en Supabase SQL Editor:\n');

policies.forEach((policy, idx) => {
  console.log(`--- Política ${idx + 1} ---`);
  console.log(policy);
  console.log('');
});

console.log('\n⚠️  IMPORTANTE: Estas políticas deben ejecutarse en Supabase SQL Editor');
console.log('Las credenciales anon_key no tienen permiso para crearlas.');
console.log('\n1. Ve a: https://supabase.com/');
console.log('2. Login');
console.log('3. Tu proyecto → SQL Editor');
console.log('4. Copia/pega cada política arriba');
console.log('5. Click "RUN"');
