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

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

interface GymsStore {
  gyms: Gym[];
  selectedGymId: string | null;
  setGyms: (gyms: Gym[]) => void;
  setSelectedGym: (gymId: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export const useGymsStore = create<GymsStore>((set) => ({
  gyms: [],
  selectedGymId: null,
  setGyms: (gyms) => set({ gyms }),
  setSelectedGym: (gymId) => set({ selectedGymId: gymId }),
}));
