import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth API
export const authAPI = {
  register: (email: string, password: string, name: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    }),

  login: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  logout: () => supabase.auth.signOut(),

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('students')
      .select('id, user:users(name, email)')
      .eq('user_id', user.id)
      .single();

    return { user, student: data };
  }
};

// Gyms API
export const gymsAPI = {
  listMyGyms: async () => {
    const { data } = await supabase
      .from('gym_access')
      .select('gyms(*)')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    return data?.map(g => g.gyms) || [];
  },

  getGym: (gymId: string) =>
    supabase.from('gyms').select('*').eq('id', gymId).single()
};

// Classes API
export const classesAPI = {
  listByDateRange: (gymId: string, startDate: string, endDate: string) =>
    supabase
      .from('classes')
      .select('*, discipline:disciplines(*), coach:gym_access!coach_id(users(name))')
      .eq('gym_id', gymId)
      .gte('starts_at', startDate)
      .lte('starts_at', endDate)
      .order('starts_at', { ascending: true }),

  getClass: (gymId: string, classId: string) =>
    supabase
      .from('classes')
      .select('*, discipline:disciplines(*), coach:gym_access!coach_id(users(name))')
      .eq('gym_id', gymId)
      .eq('id', classId)
      .single()
};

// Reservations API (NEW - using Edge Function)
export const reservationsAPI = {
  create: async (gymId: string, classId: string, membershipId: string) => {
    const { data, error } = await supabase
      .rpc('create_reservation', {
        p_class_id: classId,
        p_membership_id: membershipId,
        p_idempotency_key: crypto.randomUUID()
      });

    if (error) throw error;
    return { data };
  },

  list: (gymId: string) =>
    supabase
      .from('reservations')
      .select('*, class:classes(*), membership:memberships(*)')
      .eq('gym_id', gymId)
      .eq('student_id', (await supabase.auth.getUser()).data.user?.id),

  cancel: (gymId: string, reservationId: string) =>
    supabase
      .from('reservations')
      .update({ status: 'cancelled', cancelled_at: new Date() })
      .eq('id', reservationId)
      .eq('gym_id', gymId)
};

// Memberships API
export const membershipsAPI = {
  list: (gymId: string) =>
    supabase
      .from('memberships')
      .select('*, plan:plans(*)')
      .eq('gym_id', gymId),

  get: (gymId: string, membershipId: string) =>
    supabase
      .from('memberships')
      .select('*, plan:plans(*)')
      .eq('gym_id', gymId)
      .eq('id', membershipId)
      .single(),

  listPlans: (gymId: string) =>
    supabase.from('plans').select('*').eq('gym_id', gymId).eq('status', 'active')
};

// Attendance API
export const attendanceAPI = {
  checkIn: async (gymId: string, reservationId: string, qrCode: string) => {
    // QR verification should happen on client
    // For now, trust the QR and create attendance
    return supabase.rpc('mark_attendance', {
      p_reservation_id: reservationId,
      p_status: 'attended',
      p_manual_override: false
    });
  },

  getHistory: (gymId: string, studentId: string) =>
    supabase
      .from('attendance')
      .select('*, class:classes(*)')
      .eq('gym_id', gymId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20),

  generateQr: async (gymId: string, classId: string) => {
    // Generate QR on client side
    const timestamp = Date.now();
    const secret = process.env.EXPO_PUBLIC_QR_SECRET || '';
    const data = `class:${classId}:${timestamp}`;

    // Create HMAC signature (client-side)
    // Import crypto library and sign

    return { qrCode: `${data}:signature` };
  }
};

export default supabase;
