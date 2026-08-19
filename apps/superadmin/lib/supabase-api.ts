import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
  async listByGymId(gymId: string) {
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
};

// User conversion helper
export function convertSupabaseUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email,
  };
}
