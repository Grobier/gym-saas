import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
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
  logout: () => void;
}

interface GymsStore {
  selectedGymId: string | null;
  gyms: Gym[];

  setSelectedGym: (gymId: string) => void;
  setGyms: (gyms: Gym[]) => void;
}

interface ReservationsStore {
  reservations: any[];
  loading: boolean;

  setReservations: (reservations: any[]) => void;
  setLoading: (loading: boolean) => void;
  addReservation: (reservation: any) => void;
  removeReservation: (id: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  logout: async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null });
  },
}));

export const useGymsStore = create<GymsStore>((set) => ({
  selectedGymId: null,
  gyms: [],

  setSelectedGym: (gymId) => set({ selectedGymId: gymId }),
  setGyms: (gyms) => set({ gyms }),
}));

export const useReservationsStore = create<ReservationsStore>((set) => ({
  reservations: [],
  loading: false,

  setReservations: (reservations) => set({ reservations }),
  setLoading: (loading) => set({ loading }),

  addReservation: (reservation) =>
    set((state) => ({
      reservations: [reservation, ...state.reservations],
    })),

  removeReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
    })),
}));
