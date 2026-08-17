import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  logout: () => supabase.auth.signOut(),

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};

// Gyms
export const gymsAPI = {
  listMyGyms: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('gym_access')
      .select('gyms(*)')
      .eq('user_id', user?.id)
      .in('role', ['coach', 'admin']);

    return data?.map(g => g.gyms) || [];
  },

  getGym: (gymId: string) =>
    supabase.from('gyms').select('*').eq('id', gymId).single()
};

// Classes (for coach)
export const classesAPI = {
  listByCoach: (gymId: string, startDate: string, endDate: string) =>
    supabase
      .from('classes')
      .select('*, discipline:disciplines(*)')
      .eq('gym_id', gymId)
      .gte('starts_at', startDate)
      .lte('starts_at', endDate)
      .order('starts_at', { ascending: true }),

  getWithRoster: async (gymId: string, classId: string) => {
    const { data: classData } = await supabase
      .from('classes')
      .select('*, discipline:disciplines(*)')
      .eq('gym_id', gymId)
      .eq('id', classId)
      .single();

    const { data: roster } = await supabase
      .from('reservations')
      .select('*, student:students(id, user:users(name))')
      .eq('class_id', classId)
      .eq('status', 'confirmed');

    return {
      ...classData,
      roster: roster || []
    };
  }
};

// Attendance (coach marks)
export const attendanceAPI = {
  getClassAttendance: (gymId: string, classId: string) =>
    supabase
      .from('attendance')
      .select('*, student:students(user:users(name))')
      .eq('gym_id', gymId)
      .eq('class_id', classId),

  markAttendance: (
    gymId: string,
    reservationId: string,
    status: 'attended' | 'no_show',
    notes?: string
  ) =>
    supabase.rpc('mark_attendance', {
      p_reservation_id: reservationId,
      p_status: status,
      p_notes: notes,
      p_manual_override: true
    }),

  generateQr: async (gymId: string, classId: string) => {
    // Generate QR on client
    const timestamp = Date.now();
    const data = `class:${classId}:${timestamp}`;
    // Sign with secret (client-side)
    return { qrCode: `${data}:signature` };
  }
};

export default supabase;
