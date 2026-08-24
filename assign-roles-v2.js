const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tzsyzwztlfbqbpvpncqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c3l6d3p0bGZicWJwdnBuY3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTEyMDEsImV4cCI6MjEwMjQ2NzIwMX0.2qxgrbIwWetinpOt2L8inTheHfpEZ6q8wUhydFsNl2A';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function assignRoles() {
  try {
    console.log('📊 Asignando roles...\n');

    // Buscar user en tabla users_table o profiles
    console.log('Buscando usuario en tabla...');

    const { data: users, error: userError } = await supabase
      .from('users_table')
      .select('id, email')
      .eq('email', 'grobier.2h@gmail.com')
      .maybeSingle();

    if (userError) {
      console.log('Intentando tabla "profiles"...');
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', 'grobier.2h@gmail.com')
        .maybeSingle();

      if (profileError || !profiles) {
        throw new Error('No se encontró usuario en ninguna tabla');
      }
    }

    // Si users está vacío, prueban otra tabla
    if (!users) {
      const { data: allTables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      console.log('Tablas disponibles:', allTables?.map(t => t.table_name).join(', '));
      throw new Error('Usuario no encontrado. Verifica tabla correcta en Supabase.');
    }

    const userId = users.id;
    console.log('✓ Usuario encontrado:', users.email);
    console.log('  ID:', userId, '\n');

    // Obtener primer gym
    const { data: gyms, error: gymError } = await supabase
      .from('gyms')
      .select('id, name')
      .limit(1);

    if (gymError || !gyms || gyms.length === 0) {
      throw new Error('No hay gimnasios: ' + gymError?.message);
    }

    const gymId = gyms[0].id;
    console.log('✓ Gimnasio:', gyms[0].name);
    console.log('  ID:', gymId, '\n');

    // Asignar roles
    const roles = ['admin', 'coach', 'student'];

    for (const role of roles) {
      const { data, error } = await supabase
        .from('gym_access')
        .insert([{
          user_id: userId,
          gym_id: gymId,
          role: role,
        }])
        .select();

      if (error) {
        if (error.code === '23505' || error.message.includes('duplicate')) {
          console.log(`⚠️  Rol '${role}' ya existe`);
        } else {
          console.log(`❌ Error en '${role}':`, error.message);
        }
      } else {
        console.log(`✓ Rol '${role}' asignado`);
      }
    }

    console.log('\n✅ Completado');
    console.log('grobier.2h@gmail.com ahora tiene: admin, coach, student');
    console.log('Recarga https://platform-amber-two.vercel.app');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignRoles();
