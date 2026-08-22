import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client lazily only when needed (client-side only)
let supabaseInstance: any = null;

export const supabase = {
  auth: {
    signInWithPassword: async (credentials: any) => {
      if (!supabaseInstance) supabaseInstance = initSupabase();
      return supabaseInstance.auth.signInWithPassword(credentials);
    },
    getUser: async () => {
      if (!supabaseInstance) supabaseInstance = initSupabase();
      return supabaseInstance.auth.getUser();
    },
    signOut: async () => {
      if (!supabaseInstance) supabaseInstance = initSupabase();
      return supabaseInstance.auth.signOut();
    },
  },
  from: (table: string) => {
    if (!supabaseInstance) supabaseInstance = initSupabase();
    return supabaseInstance.from(table);
  },
  rpc: (functionName: string, params?: any) => {
    if (!supabaseInstance) supabaseInstance = initSupabase();
    return supabaseInstance.rpc(functionName, params);
  },
};

function initSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  return createClient(url, key);
}

// Interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'superadmin' | 'admin' | 'coach' | 'student';
}

export interface Gym {
  id: string;
  name: string;
  city: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  gym_id: string;
  plan_type: 'trial' | 'monthly' | 'annual';
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  trial_days_remaining?: number;
  price: number;
  currency: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  payment_date: string;
  created_at: string;
}

export interface Class {
  id: string;
  gym_id: string;
  name: string;
  discipline_id: string;
  scheduled_date: string;
  time_start: string;
  time_end: string;
  capacity: number;
  enrolled: number;
}

export interface Student {
  id: string;
  user: {
    name: string;
    email: string;
  };
  phone?: string;
  createdAt: string;
  activeReservations?: number;
  totalVisits?: number;
}

export interface UserAccess {
  gym_id: string;
  role: 'admin' | 'coach' | 'student';
}

export interface GymWithRoles extends Gym {
  userRoles?: string[];
}

export interface Attendance {
  id: string;
  class_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'excused';
  marked_by: string;
  notes?: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  class_id: string;
  student_id: string;
  status: 'active' | 'cancelled';
  created_at: string;
  student_name?: string;
  student_email?: string;
}

export interface AttendanceSummary {
  total_students: number;
  present_count: number;
  absent_count: number;
  excused_count: number;
  attendance_rate: number;
}

export interface ClassRoster {
  student_id: string;
  student_name: string;
  student_email: string;
  status: 'active' | 'cancelled';
}

// Auth APIs
export const authAPI = {
  async getCurrentUser() {
    return await supabase.auth.getUser();
  },

  async logout() {
    await supabase.auth.signOut();
  },
};

// User Access APIs (multiroll support)
export const userAccessAPI = {
  async getMyRoles() {
    const { data, error } = await supabase
      .from('gym_access')
      .select('gym_id, role')
      .order('gym_id');

    if (error) {
      console.error('Error getting user roles:', error);
      return { data: null, error };
    }

    return { data: data as UserAccess[], error: null };
  },

  async getRolesInGym(gymId: string) {
    const { data, error } = await supabase
      .from('gym_access')
      .select('role')
      .eq('gym_id', gymId);

    if (error) {
      console.error('Error getting roles in gym:', error);
      return { data: null, error };
    }

    // Extract unique roles
    const roles = [...new Set((data || []).map((d: any) => d.role))];
    return { data: roles as string[], error: null };
  },

  async assignRoleToUser(userId: string, gymId: string, role: 'admin' | 'coach' | 'student') {
    const { data, error } = await supabase
      .from('gym_access')
      .insert([{ user_id: userId, gym_id: gymId, role }])
      .select()
      .single();

    if (error) {
      console.error('Error assigning role:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  async removeRoleFromUser(userId: string, gymId: string, role: 'admin' | 'coach' | 'student') {
    const { data, error } = await supabase
      .from('gym_access')
      .delete()
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .eq('role', role);

    if (error) {
      console.error('Error removing role:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },
};

// Gyms APIs
export const gymsAPI = {
  async listAll() {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing gyms:', error);
      return { data: null, error };
    }

    return { data: data as Gym[], error: null };
  },

  async listMyGyms() {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing gyms:', error);
      return { data: null, error };
    }

    return { data: data as Gym[], error: null };
  },

  async getById(gymId: string) {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', gymId)
      .single();

    if (error) {
      console.error('Error getting gym:', error);
      return { data: null, error };
    }

    return { data: data as Gym, error: null };
  },
};

// Subscriptions APIs
export const subscriptionsAPI = {
  async getByGymId(gymId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting subscription:', error);
      return { data: null, error };
    }

    return { data: data as Subscription | null, error: null };
  },

  async list() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing subscriptions:', error);
      return { data: null, error };
    }

    return { data: data as Subscription[], error: null };
  },
};

// Payments APIs
export const paymentsAPI = {
  async listByGymId(gymId: string, options?: any) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('gym_id', gymId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error listing payments:', error);
      return { data: null, error };
    }

    return { data: data as Payment[], error: null };
  },

  async list(gymId: string, options?: any) {
    return this.listByGymId(gymId, options);
  },

  async validateTransfer(gymId: string, paymentId: string, approved: boolean) {
    const { data, error } = await supabase
      .from('payments')
      .update({ status: approved ? 'completed' : 'failed' })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error validating transfer:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },
};

// Classes APIs
export const classesAPI = {
  async list(gymId: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('gym_id', gymId)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error listing classes:', error);
      return { data: null, error };
    }

    return { data: data as Class[], error: null };
  },

  async listByCoach(gymId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('gym_id', gymId)
      .gte('scheduled_date', startDate.split('T')[0])
      .lte('scheduled_date', endDate.split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('time_start', { ascending: true });

    if (error) {
      console.error('Error listing classes:', error);
      return { data: null, error: error as any };
    }

    return { data: data as Class[], error: null };
  },

  async getWithRoster(classId: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('Error getting class:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },
};

// Attendance APIs (Coach takes attendance)
export const attendanceAPI = {
  async markAttendance(classId: string, studentId: string, status: 'present' | 'absent' | 'excused', notes?: string) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert([{ class_id: classId, student_id: studentId, status, notes, marked_by: (await authAPI.getCurrentUser()).data?.user?.id }])
      .select()
      .single();

    if (error) {
      console.error('Error marking attendance:', error);
      return { data: null, error };
    }

    return { data: data as Attendance, error: null };
  },

  async getClassAttendance(classId: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting attendance:', error);
      return { data: null, error };
    }

    return { data: data as Attendance[], error: null };
  },

  async getAttendanceSummary(classId: string) {
    const { data, error } = await supabase
      .rpc('get_attendance_summary', { p_class_id: classId });

    if (error) {
      console.error('Error getting attendance summary:', error);
      return { data: null, error };
    }

    return { data: data?.[0] as AttendanceSummary | null, error: null };
  },
};

// Reservations APIs (Student books, Coach views roster)
export const reservationsAPI = {
  async createReservation(classId: string, studentId: string) {
    const { data, error } = await supabase
      .from('reservations')
      .insert([{ class_id: classId, student_id: studentId, status: 'active' }])
      .select()
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      return { data: null, error };
    }

    return { data: data as Reservation, error: null };
  },

  async cancelReservation(classId: string, studentId: string) {
    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling reservation:', error);
      return { data: null, error };
    }

    return { data: data as Reservation, error: null };
  },

  async getClassRoster(classId: string) {
    const { data, error } = await supabase
      .rpc('get_class_roster', { p_class_id: classId });

    if (error) {
      console.error('Error getting class roster:', error);
      return { data: null, error };
    }

    return { data: data as ClassRoster[], error: null };
  },

  async getStudentReservations(studentId: string) {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting reservations:', error);
      return { data: null, error };
    }

    return { data: data as Reservation[], error: null };
  },
};

// Students APIs
export const studentsAPI = {
  async list(gymId: string, options?: any) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing students:', error);
      return { data: null, error };
    }

    return { data: data as Student[], error: null };
  },

  async create(gymId: string, formData: any) {
    const { data, error } = await supabase
      .from('students')
      .insert([{ gym_id: gymId, ...formData }])
      .select()
      .single();

    if (error) {
      console.error('Error creating student:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  async delete(gymId: string, studentId: string) {
    const { data, error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('gym_id', gymId);

    if (error) {
      console.error('Error deleting student:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },
};

// Helper function
export function convertSupabaseUser(user: any): User {
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email,
    role: user.user_metadata?.role || 'student',
  };
}
