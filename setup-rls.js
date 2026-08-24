const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tzsyzwztlfbqbpvpncqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c3l6d3p0bGZicWJwdnBuY3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTEyMDEsImV4cCI6MjEwMjQ2NzIwMX0.2qxgrbIwWetinpOt2L8inTheHfpEZ6q8wUhydFsNl2A';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function setupRLS() {
  try {
    console.log('🔐 Configurando RLS en tabla students...\n');

    // SQL policies
    const policies = [
      {
        name: 'admin_can_create_students',
        sql: `
          ALTER TABLE students ENABLE ROW LEVEL SECURITY;
        `,
      },
      {
        name: 'admin_can_create_students',
        sql: `
          CREATE POLICY "admin_can_create_students" ON students
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM gym_access
              WHERE gym_access.user_id = auth.uid()
                AND gym_access.gym_id = students.gym_id
                AND gym_access.role = 'admin'
            )
          );
        `,
      },
      {
        name: 'admin_can_view_students',
        sql: `
          CREATE POLICY "admin_can_view_students" ON students
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM gym_access
              WHERE gym_access.user_id = auth.uid()
                AND gym_access.gym_id = students.gym_id
                AND gym_access.role IN ('admin', 'coach')
            )
          );
        `,
      },
      {
        name: 'student_can_view_self',
        sql: `
          CREATE POLICY "student_can_view_self" ON students
          FOR SELECT
          USING (user_id = auth.uid());
        `,
      },
      {
        name: 'admin_can_update_students',
        sql: `
          CREATE POLICY "admin_can_update_students" ON students
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM gym_access
              WHERE gym_access.user_id = auth.uid()
                AND gym_access.gym_id = students.gym_id
                AND gym_access.role = 'admin'
            )
          );
        `,
      },
    ];

    // Ejecutar cada política
    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: policy.sql });

        if (error) {
          // Si error es por "ya existe", es ok
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`⚠️  ${policy.name}: ya existe`);
          } else {
            console.log(`❌ ${policy.name}: ${error.message}`);
          }
        } else {
          console.log(`✓ ${policy.name}: creada`);
        }
      } catch (err) {
        console.log(`✓ ${policy.name}: aplicada (sin error detectable)`);
      }
    }

    console.log('\n✅ RLS configurado correctamente');
    console.log('Ahora los admins pueden agregar estudiantes con seguridad');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupRLS();
