const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tzsyzwztlfbqbpvpncqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c3l6d3p0bGZicWJwdnBuY3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTEyMDEsImV4cCI6MjEwMjQ2NzIwMX0.2qxgrbIwWetinpOt2L8inTheHfpEZ6q8wUhydFsNl2A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignRoles() {
  try {
    console.log('📊 Asignando roles...\n');

    // Obtener user_id de grobier.2h@gmail.com
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'grobier.2h@gmail.com')
      .single();

    if (userError || !users) {
      console.log('❌ Usuario no encontrado');
      console.log('Intentando buscar en auth.users...');

      // Intentar obtener de otra forma
      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        throw new Error('No se pudo encontrar usuario: ' + authError.message);
      }

      const foundUser = authUser?.users.find(u => u.email === 'grobier.2h@gmail.com');
      if (!foundUser) {
        throw new Error('Usuario grobier.2h@gmail.com no existe');
      }

      console.log('✓ Usuario encontrado:', foundUser.id);
      console.log('  Email:', foundUser.email, '\n');
    }

    const userId = users?.id;

    // Obtener primer gym
    const { data: gyms, error: gymError } = await supabase
      .from('gyms')
      .select('id, name')
      .limit(1);

    if (gymError || !gyms || gyms.length === 0) {
      throw new Error('No hay gimnasios disponibles: ' + gymError?.message);
    }

    const gymId = gyms[0].id;
    console.log('✓ Gimnasio encontrado:', gyms[0].name);
    console.log('  ID:', gymId, '\n');

    // Asignar roles
    const roles = ['admin', 'coach', 'student'];

    for (const role of roles) {
      const { error } = await supabase
        .from('gym_access')
        .insert({
          user_id: userId,
          gym_id: gymId,
          role: role,
        });

      if (error) {
        if (error.code === '23505') {
          console.log(`⚠️  Rol '${role}' ya existe`);
        } else {
          console.log(`❌ Error asignando '${role}':`, error.message);
        }
      } else {
        console.log(`✓ Rol '${role}' asignado`);
      }
    }

    console.log('\n✅ Completado. Ahora grobier.2h@gmail.com tiene: admin, coach, student');
    console.log('Recarga la app para ver los cambios.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

assignRoles();
