const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tzsyzwztlfbqbpvpncqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c3l6d3p0bGZicWJwdnBuY3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTEyMDEsImV4cCI6MjEwMjQ2NzIwMX0.2qxgrbIwWetinpOt2L8inTheHfpEZ6q8wUhydFsNl2A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  try {
    // Obtener todos los datos de gym_access para ver estructura
    const { data: gymAccess, error: error1 } = await supabase
      .from('gym_access')
      .select('*')
      .limit(1);

    console.log('Tabla gym_access:');
    console.log('Estructura:', gymAccess?.[0] ? Object.keys(gymAccess[0]) : 'vacía');
    if (gymAccess?.[0]) {
      console.log('Ejemplo:', JSON.stringify(gymAccess[0], null, 2));
    }

    // Obtener gyms
    const { data: gyms } = await supabase
      .from('gyms')
      .select('id, name')
      .limit(1);

    console.log('\nTabla gyms:');
    console.log('Primera:', gyms?.[0]);

    // Intentar ver todos los datos de gym_access
    const { data: allAccess, error: err2 } = await supabase
      .from('gym_access')
      .select('*');

    console.log('\nTodos gym_access:');
    console.log(JSON.stringify(allAccess, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();
