import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Gym {
  id: string;
  name: string;
  city: string;
  address: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface GymsStore {
  selectedGymId: string | null;
  gyms: Gym[];

  setSelectedGym: (gymId: string) => void;
  setGyms: (gyms: Gym[]) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

export const useGymsStore = create<GymsStore>((set) => ({
  selectedGymId: null,
  gyms: [],

  setSelectedGym: (gymId) => set({ selectedGymId: gymId }),
  setGyms: (gyms) => set({ gyms }),
}));
