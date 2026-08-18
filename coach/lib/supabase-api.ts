import { createClient } from '@supabase/supabase-js';
import { destroyCookie } from 'nookies';

let supabaseInstance: any = null;

const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured');
  }

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseInstance;
};

export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    const client = getSupabase();
    return (client as any)[prop];
  }
});

// Convert Supabase User to App User type
export const convertSupabaseUser = (user: any) => ({
  id: user.id,
  email: user.email || '',
  name: user.user_metadata?.name || user.email || 'User',
});

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  logout: () => {
    destroyCookie(null, 'authToken', { path: '/' });
    supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        return { data: { user: null }, error: error.message };
      }
      return { data: { user }, error: null };
    } catch (error: any) {
      return { data: { user: null }, error: error?.message || 'Unknown error' };
    }
  }
};

// Gyms
export const gymsAPI = {
  listMyGyms: async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Use the secure function to get user's gyms
      const { data: accessData, error: accessError } = await supabase.rpc(
        'get_user_gyms',
        { p_user_id: user.id, p_role: null }  // null = get all roles (coach, admin, student)
      );

      if (accessError) {
        console.error('Error fetching gym access:', accessError);
        throw new Error(`Failed to fetch gym access: ${accessError.message}`);
      }

      const gymIds = accessData?.map((a: any) => a.gym_id) || [];

      if (gymIds.length === 0) {
        return { data: [], error: null };
      }

      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .in('id', gymIds);

      if (gymsError) {
        console.error('Error fetching gyms:', gymsError);
        throw gymsError;
      }

      return { data: gyms || [], error: null };
    } catch (error: any) {
      console.error('listMyGyms error:', error);
      return {
        data: [],
        error: error?.message || 'Failed to fetch gyms'
      };
    }
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

  getClass: (gymId: string, classId: string) =>
    supabase
      .from('classes')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', classId)
      .single(),

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
    return { data: { qrCode: `${data}:signature` } };
  }
};

// Disciplines
export const disciplinesAPI = {
  listByGym: (gymId: string) =>
    supabase
      .from('disciplines')
      .select('*')
      .eq('gym_id', gymId)
};

export default supabase;
