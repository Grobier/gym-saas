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

// ============= TYPES =============

interface ListOptions {
  [key: string]: string | number | boolean | undefined;
}

// Convert Supabase User to App User type
export const convertSupabaseUser = (user: any) => ({
  id: user.id,
  email: user.email || '',
  name: user.user_metadata?.name || user.email || 'User',
});

// ============= AUTH API =============

export const authAPI = {
  login: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  logout: () => {
    destroyCookie(null, 'authToken', { path: '/' });
    supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return { data: { user } };
  }
};

// ============= GYMS API =============

export const gymsAPI = {
  listMyGyms: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: accessData } = await supabase
      .from('gym_access')
      .select('gym_id')
      .eq('user_id', user?.id)
      .eq('role', 'admin');

    const gymIds = accessData?.map(a => a.gym_id) || [];
    if (gymIds.length === 0) {
      return { data: [] };
    }

    const { data: gyms } = await supabase
      .from('gyms')
      .select('*')
      .in('id', gymIds);

    return { data: gyms || [] };
  },

  getGym: (gymId: string) =>
    supabase.from('gyms').select('*').eq('id', gymId).single()
};

// ============= STUDENTS API =============

export const studentsAPI = {
  list: (gymId: string, filters?: ListOptions) => {
    let query = supabase
      .from('students')
      .select('*, user:users(name, email), reservations(count)')
      .eq('gym_id', gymId);

    if (filters?.search) {
      query = query.or(`user.name.ilike.%${filters.search}%,user.email.ilike.%${filters.search}%`);
    }

    return query;
  },

  get: (gymId: string, studentId: string) =>
    supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .eq('gym_id', gymId)
      .single(),

  create: (gymId: string, data: any) =>
    supabase.from('students').insert({
      gym_id: gymId,
      ...data
    }).select().single(),

  delete: (gymId: string, studentId: string) =>
    supabase.from('students').update({ archived_at: new Date() })
      .eq('id', studentId)
      .eq('gym_id', gymId)
};

// ============= CLASSES API =============

export const classesAPI = {
  list: (gymId: string, filters?: ListOptions) => {
    let query = supabase
      .from('classes')
      .select('*, discipline:disciplines(*)')
      .eq('gym_id', gymId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    return query;
  },

  get: (gymId: string, classId: string) =>
    supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('gym_id', gymId)
      .single(),

  create: (gymId: string, data: any) =>
    supabase.from('class_series').insert({
      gym_id: gymId,
      ...data
    }).select().single(),

  update: (gymId: string, classId: string, data: any) =>
    supabase.from('classes').update(data)
      .eq('id', classId)
      .eq('gym_id', gymId),

  cancel: (gymId: string, classId: string) =>
    supabase.from('classes').update({ status: 'cancelled', cancelled_at: new Date() })
      .eq('id', classId)
      .eq('gym_id', gymId)
};

// ============= MEMBERSHIPS API =============

export const membershipsAPI = {
  list: (gymId: string, filters?: ListOptions) => {
    let query = supabase
      .from('memberships')
      .select('*, plan:plans(*), student:students(user:users(name))')
      .eq('gym_id', gymId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    return query;
  },

  listPlans: (gymId: string) =>
    supabase.from('plans').select('*').eq('gym_id', gymId),

  createPlan: (gymId: string, data: any) =>
    supabase.from('plans').insert({
      gym_id: gymId,
      ...data
    }).select().single(),

  freeze: (gymId: string, membershipId: string) =>
    supabase.from('memberships')
      .update({ status: 'frozen', frozen_at: new Date() })
      .eq('id', membershipId)
      .eq('gym_id', gymId),

  extend: (gymId: string, membershipId: string, days: number) =>
    supabase.rpc('extend_membership', {
      p_membership_id: membershipId,
      p_days: days
    }),

  giftClasses: (
    gymId: string,
    membershipId: string,
    quantity: number,
    reason: string
  ) =>
    supabase.from('class_consumption_ledger').insert({
      gym_id: gymId,
      membership_id: membershipId,
      transaction_type: 'gift',
      quantity,
      description: reason
    })
};

// ============= PAYMENTS API =============

export const paymentsAPI = {
  list: (gymId: string, filters?: ListOptions) => {
    let query = supabase
      .from('payments')
      .select('*, student:students(user:users(name))')
      .eq('gym_id', gymId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    return query;
  },

  get: (gymId: string, paymentId: string) =>
    supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('gym_id', gymId)
      .single(),

  validateTransfer: (gymId: string, paymentId: string, approved: boolean) =>
    supabase.rpc('validate_transfer', {
      p_payment_id: paymentId,
      p_approved: approved
    })
};

// ============= REPORTS API =============

export const reportsAPI = {
  attendance: (gymId: string, startDate: string, endDate: string) =>
    supabase
      .from('attendance')
      .select('*')
      .eq('gym_id', gymId)
      .gte('created_at', startDate)
      .lte('created_at', endDate),

  revenue: (gymId: string, startDate: string, endDate: string) =>
    supabase
      .from('payments')
      .select('*')
      .eq('gym_id', gymId)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate),

  members: (gymId: string) =>
    supabase
      .from('students')
      .select('*')
      .eq('gym_id', gymId)
};

export default supabase;
