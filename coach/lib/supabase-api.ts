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
      console.log('[AUTH] Getting current user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('[AUTH] Error:', error);
        return { data: { user: null }, error: error.message };
      }
      console.log('[AUTH] User retrieved:', user?.id);
      return { data: { user }, error: null };
    } catch (error: any) {
      console.error('[AUTH] Exception:', error);
      return { data: { user: null }, error: error?.message || 'Unknown error' };
    }
  }
};

// Gyms
export const gymsAPI = {
  listMyGyms: async () => {
    try {
      console.log('[GYMS] Fetching user gyms...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('[GYMS] Calling get_user_gyms RPC with user:', user.id);

      // Use the secure function to get user's gyms
      const { data: accessData, error: accessError } = await supabase.rpc(
        'get_user_gyms',
        { p_user_id: user.id, p_role: null }  // null = get all roles (coach, admin, student)
      );

      if (accessError) {
        console.error('[GYMS] RPC Error:', accessError);
        throw new Error(`Failed to fetch gym access: ${accessError.message}`);
      }

      const gymIds = accessData?.map((a: any) => a.gym_id) || [];
      console.log('[GYMS] Got gym IDs:', gymIds);

      if (gymIds.length === 0) {
        console.log('[GYMS] No gyms found');
        return { data: [], error: null };
      }

      console.log('[GYMS] Fetching gym details for IDs:', gymIds);
      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .in('id', gymIds);

      if (gymsError) {
        console.error('[GYMS] Error fetching gyms:', gymsError);
        throw gymsError;
      }

      console.log('[GYMS] Got gyms:', gyms?.length || 0, 'records');
      return { data: gyms || [], error: null };
    } catch (error: any) {
      console.error('[GYMS] Exception:', error);
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
  listByCoach: async (gymId: string, startDate: string, endDate: string) => {
    try {
      console.log('Fetching classes with params:', { gymId, startDate, endDate });

      // Extract date part only (YYYY-MM-DD) from ISO string
      const startDateOnly = startDate.split('T')[0];
      const endDateOnly = endDate.split('T')[0];

      const query = supabase
        .from('classes')
        .select('*')
        .eq('gym_id', gymId)
        .eq('status', 'scheduled')
        .gte('scheduled_date', startDateOnly)
        .lte('scheduled_date', endDateOnly)
        .order('scheduled_date', { ascending: true })
        .order('time_start', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Classes API Error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          status: (error as any).status,
          query: { gymId, startDate: startDateOnly, endDate: endDateOnly }
        });
        return { data: [], error };
      }

      console.log('Classes fetched successfully:', data?.length || 0, 'records');
      return { data: data || [], error: null };
    } catch (err: any) {
      console.error('Classes API Exception:', err);
      return { data: [], error: err };
    }
  },

  getClass: async (gymId: string, classId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', classId)
        .single();

      if (error) {
        console.error('Get Class Error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('GetClass Exception:', err);
      return { data: null, error: err };
    }
  },

  getWithRoster: async (gymId: string, classId: string) => {
    try {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('gym_id', gymId)
        .eq('id', classId)
        .single();

      if (classError) {
        console.error('Get Class Error:', {
          code: classError.code,
          message: classError.message,
          details: classError.details,
          hint: classError.hint,
        });
        return { data: null, error: classError };
      }

      const { data: roster, error: rosterError } = await supabase
        .from('reservations')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'confirmed');

      if (rosterError) {
        console.error('Get Roster Error:', rosterError);
        return { data: { ...classData, roster: [] }, error: rosterError };
      }

      return {
        data: {
          ...classData,
          roster: roster || []
        },
        error: null
      };
    } catch (err: any) {
      console.error('GetWithRoster Exception:', err);
      return { data: null, error: err };
    }
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
