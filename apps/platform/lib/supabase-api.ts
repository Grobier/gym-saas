import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client lazily only when needed (client-side only)
let supabaseInstance: any = null;

function isMissingRpcError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  return (
    code === '404' ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('could not find the function') ||
    details.includes('could not find the function') ||
    hint.includes('could not find the function')
  );
}

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
  functions: {
    invoke: (functionName: string, options?: any) => {
      if (!supabaseInstance) supabaseInstance = initSupabase();
      return supabaseInstance.functions.invoke(functionName, options);
    },
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

export interface SuperAdminGymOverview {
  gym_id: string;
  gym_name: string;
  city: string;
  created_at: string;
  student_count: number;
  class_count: number;
  monthly_revenue: number;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  admin_count: number;
  coach_count: number;
  is_active: boolean;
  blocked_reason: string | null;
  is_archived: boolean;
  archived_reason: string | null;
}

export interface SuperAdminGymMember {
  member_type: 'staff' | 'student';
  role: 'admin' | 'coach' | 'student';
  user_id: string | null;
  email: string | null;
  display_name: string;
  status: string;
  created_at: string | null;
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
  name: string;
  email: string;
  phone?: string;
  user_id?: string;
  gym_id?: string;
  created_at?: string;
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
    try {
      const { data, error } = await supabase.rpc('get_my_active_gym_roles');

      if (!error) {
        return { data: (data || []) as UserAccess[], error: null };
      }

      // Fallback for environments without the latest migration yet applied.
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) {
        return { data: null, error: 'No user logged in' };
      }

      const fallback = await supabase
        .from('gym_access')
        .select('gym_id, role')
        .eq('user_id', authUser.user.id)
        .order('gym_id');

      if (fallback.error) {
        console.error('Error getting user roles:', fallback.error);
        return { data: null, error: fallback.error };
      }

      const fallbackRoles = (fallback.data || []) as UserAccess[];
      if (fallbackRoles.length === 0) {
        return { data: [], error: null };
      }

      const uniqueGymIds = [...new Set(fallbackRoles.map((role) => role.gym_id))];
      const states = await supabase
        .from('gym_management_states')
        .select('gym_id, is_active, is_archived')
        .in('gym_id', uniqueGymIds);

      if (states.error) {
        console.warn('Error filtering gym states in role fallback:', states.error);
        return { data: fallbackRoles, error: null };
      }

      const stateMap = new Map<
        string,
        {
          is_active: boolean | null;
          is_archived: boolean | null;
        }
      >(
        (states.data || []).map((state: any) => [
          state.gym_id,
          {
            is_active: state.is_active ?? null,
            is_archived: state.is_archived ?? null,
          },
        ])
      );

      const filteredRoles = fallbackRoles.filter((role) => {
        const state = stateMap.get(role.gym_id);
        if (!state) {
          return true;
        }

        return state.is_active !== false && state.is_archived !== true;
      });

      return { data: filteredRoles, error: null };
    } catch (error: any) {
      console.error('Error in getMyRoles:', error);
      return { data: null, error: error.message };
    }
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
    const { data: myRoles, error: rolesError } = await userAccessAPI.getMyRoles();

    if (rolesError) {
      console.error('Error loading accessible gym roles:', rolesError);
      return { data: null, error: rolesError };
    }

    const gymIds = [...new Set((myRoles || []).map((role) => role.gym_id))];
    if (gymIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .in('id', gymIds)
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

export const superadminAPI = {
  async getGymOverview() {
    const { data, error } = await supabase.rpc('get_superadmin_gym_overview');

    if (error) {
      console.error('Error loading superadmin gym overview:', error);
      return { data: null, error };
    }

    return { data: (data || []) as SuperAdminGymOverview[], error: null };
  },

  async getGymMembers(gymId: string) {
    const { data, error } = await supabase.rpc('get_superadmin_gym_members', {
      p_gym_id: gymId,
    });

    if (error) {
      console.error('Error loading superadmin gym members:', error);
      return { data: null, error };
    }

    return { data: (data || []) as SuperAdminGymMember[], error: null };
  },

  async toggleGymStatus(gymId: string, isActive: boolean, reason?: string) {
    const { data, error } = await supabase.rpc('set_gym_active_state', {
      p_gym_id: gymId,
      p_is_active: isActive,
      p_reason: reason || null,
    });

    if (error) {
      console.error('Error updating gym status:', error);
      return { data: null, error };
    }

    return {
      data: (Array.isArray(data) ? data[0] : data) as {
        gym_id: string;
        is_active: boolean;
        blocked_reason: string | null;
        blocked_at: string | null;
      },
      error: null,
    };
  },

  async toggleGymArchive(gymId: string, isArchived: boolean, reason?: string) {
    const { data, error } = await supabase.rpc('set_gym_archive_state', {
      p_gym_id: gymId,
      p_is_archived: isArchived,
      p_reason: reason || null,
    });

    if (error) {
      console.error('Error updating gym archive state:', error);
      return { data: null, error };
    }

    return {
      data: (Array.isArray(data) ? data[0] : data) as {
        gym_id: string;
        is_archived: boolean;
        archived_reason: string | null;
        archived_at: string | null;
      },
      error: null,
    };
  },

  async deleteGym(gymId: string) {
    const { data, error } = await supabase.rpc('delete_gym_permanently', {
      p_gym_id: gymId,
    });

    if (error) {
      console.error('Error deleting gym permanently:', error);

      if (isMissingRpcError(error)) {
        return {
          data: null,
          error:
            'Falta aplicar en Supabase la migración 009_superadmin_archive_delete.sql. La función delete_gym_permanently todavía no existe en producción.',
        };
      }

      return { data: null, error };
    }

    return { data, error: null };
  },

  async createGymWithAdmin(payload: {
    gym_name: string;
    city?: string;
    admin_name: string;
    admin_email: string;
    admin_password?: string;
  }) {
    const { data, error } = await supabase.functions.invoke('manage-gym', {
      body: {
        action: 'create_gym',
        ...payload,
      },
    });

    if (error) {
      console.error('Error creating gym with admin:', error);
      return { data: null, error };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data, error: null };
  },

  async updateGym(payload: { gym_id: string; gym_name: string; city?: string }) {
    const { data, error } = await supabase.functions.invoke('manage-gym', {
      body: {
        action: 'update_gym',
        ...payload,
      },
    });

    if (error) {
      console.error('Error updating gym:', error);
      return { data: null, error };
    }

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data, error: null };
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

  async create(gymId: string, classData: {
    name: string;
    discipline_id: string;
    scheduled_date: string;
    time_start: string;
    time_end: string;
    capacity: number;
  }) {
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        gym_id: gymId,
        ...classData,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating class:', error);
      return { data: null, error };
    }

    return { data: data as Class, error: null };
  },

  async update(classId: string, updates: Partial<Class>) {
    const { data, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      console.error('Error updating class:', error);
      return { data: null, error };
    }

    return { data: data as Class, error: null };
  },

  async delete(classId: string) {
    const { data, error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('Error deleting class:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },
};

// Attendance APIs (Coach takes attendance)
export const attendanceAPI = {
  async markAttendance(classId: string, studentId: string, status: 'present' | 'absent' | 'excused', markedBy: string, notes?: string) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert([{ class_id: classId, student_id: studentId, status, notes, marked_by: markedBy }])
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
    try {
      // Try to use Postgres function (create_student_with_auth)
      const { data, error } = await supabase
        .rpc('create_student_with_auth', {
          p_gym_id: gymId,
          p_name: formData.name,
          p_email: formData.email,
          p_phone: formData.phone || null
        });

      if (!error && data && data.length > 0) {
        const result = data[0];
        if (!result.error && result.student_id) {
          // Send invitation email
          const { temp_password, student_id } = result;
          const { data: gymData } = await gymsAPI.getById(gymId);
          const gymName = gymData?.name || 'Tu Gimnasio';

          // Fetch complete student record
          const { data: completeStudent } = await supabase
            .from('students')
            .select('*')
            .eq('id', student_id)
            .single();

          // Call send-invitation function (non-blocking)
          supabase.functions.invoke('send-invitation', {
            body: {
              email: formData.email,
              name: formData.name,
              gym_name: gymName,
              temp_password: temp_password || 'password_generada',
            },
          }).catch((err: any) => {
            console.warn('Email invitation failed, but student created:', err);
          });

          return { data: completeStudent || result, error: null };
        }
      }

      // Fallback: create student without Auth (temporary)
      console.warn('Function failed, using fallback: student created without auth');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('students')
        .insert([{
          gym_id: gymId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          user_id: null
        }])
        .select()
        .single();

      if (fallbackError) {
        console.error('Error creating student:', fallbackError);
        return { data: null, error: fallbackError };
      }

      return { data: fallbackData, error: null };
    } catch (error: any) {
      console.error('Error in create:', error);
      return { data: null, error: error.message };
    }
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
