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
      .eq('role', 'admin');

    return data?.map(g => g.gyms) || [];
  },

  getGym: (gymId: string) =>
    supabase.from('gyms').select('*').eq('id', gymId).single()
};

// Students
export const studentsAPI = {
  list: (gymId: string) =>
    supabase
      .from('students')
      .select('*, user:users(name, email), reservations(count)')
      .eq('gym_id', gymId),

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

// Classes
export const classesAPI = {
  list: (gymId: string) =>
    supabase
      .from('classes')
      .select('*, discipline:disciplines(*)')
      .eq('gym_id', gymId),

  create: (gymId: string, data: any) =>
    supabase.from('class_series').insert({
      gym_id: gymId,
      ...data
    }).select().single(),

  cancel: (gymId: string, classId: string) =>
    supabase.from('classes').update({ status: 'cancelled', cancelled_at: new Date() })
      .eq('id', classId)
      .eq('gym_id', gymId)
};

// Memberships
export const membershipsAPI = {
  list: (gymId: string) =>
    supabase
      .from('memberships')
      .select('*, plan:plans(*), student:students(user:users(name))')
      .eq('gym_id', gymId),

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

// Payments
export const paymentsAPI = {
  list: (gymId: string) =>
    supabase
      .from('payments')
      .select('*, student:students(user:users(name))')
      .eq('gym_id', gymId),

  validateTransfer: (gymId: string, paymentId: string, approved: boolean) =>
    supabase.rpc('validate_transfer', {
      p_payment_id: paymentId,
      p_approved: approved
    })
};

// Reports
export const reportsAPI = {
  attendanceStats: (gymId: string, startDate: string, endDate: string) =>
    supabase
      .from('attendance')
      .select('*')
      .eq('gym_id', gymId)
      .gte('created_at', startDate)
      .lte('created_at', endDate),

  revenueStats: (gymId: string, startDate: string, endDate: string) =>
    supabase
      .from('payments')
      .select('*')
      .eq('gym_id', gymId)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
};

export default supabase;
