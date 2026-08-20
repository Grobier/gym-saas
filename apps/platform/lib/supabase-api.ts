import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

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

// Auth APIs
export const authAPI = {
  async getCurrentUser() {
    return await supabase.auth.getUser();
  },

  async logout() {
    await supabase.auth.signOut();
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
