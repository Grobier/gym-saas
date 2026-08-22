import { create } from 'zustand';

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
}

export interface UserAccess {
  gym_id: string;
  role: 'admin' | 'coach' | 'student';
}

interface AuthStore {
  user: User | null;
  availableRoles: UserAccess[];
  activeGymId: string | null;
  activeRole: string | null;
  setUser: (user: User | null) => void;
  setAvailableRoles: (roles: UserAccess[]) => void;
  setActiveGym: (gymId: string) => void;
  setActiveRole: (role: string) => void;
  clearAuth: () => void;
}

interface GymsStore {
  gyms: Gym[];
  selectedGymId: string | null;
  setGyms: (gyms: Gym[]) => void;
  setSelectedGym: (gymId: string) => void;
}

// Auth store - persisted via localStorage manually if needed
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  availableRoles: [],
  activeGymId: null,
  activeRole: null,
  setUser: (user) => set({ user }),
  setAvailableRoles: (roles) => set({ availableRoles: roles }),
  setActiveGym: (gymId) => {
    set({ activeGymId: gymId });
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeGymId', gymId);
    }
  },
  setActiveRole: (role) => {
    set({ activeRole: role });
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeRole', role);
    }
  },
  clearAuth: () => {
    set({
      user: null,
      availableRoles: [],
      activeGymId: null,
      activeRole: null,
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeGymId');
      localStorage.removeItem('activeRole');
    }
  },
}));

// Hydrate auth store from localStorage on client
if (typeof window !== 'undefined') {
  const activeGymId = localStorage.getItem('activeGymId');
  const activeRole = localStorage.getItem('activeRole');
  if (activeGymId) {
    useAuthStore.setState({ activeGymId });
  }
  if (activeRole) {
    useAuthStore.setState({ activeRole });
  }
}

// Gyms store (non-persistent, reloads each session)
export const useGymsStore = create<GymsStore>((set) => ({
  gyms: [],
  selectedGymId: null,
  setGyms: (gyms) => set({ gyms }),
  setSelectedGym: (gymId) => set({ selectedGymId: gymId }),
}));

// Helper to get available roles for current gym
export const getAvailableRolesInGym = (
  availableRoles: UserAccess[],
  gymId: string | null
): string[] => {
  if (!gymId) return [];
  return [
    ...new Set(
      availableRoles
        .filter((ar) => ar.gym_id === gymId)
        .map((ar) => ar.role)
    ),
  ];
};

// Helper to check if user has specific role in gym
export const hasRoleInGym = (
  availableRoles: UserAccess[],
  gymId: string,
  role: string
): boolean => {
  return availableRoles.some((ar) => ar.gym_id === gymId && ar.role === role);
};
