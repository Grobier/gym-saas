import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add token to requests
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          await SecureStore.setItemAsync('authToken', data.accessToken);
          await SecureStore.setItemAsync('refreshToken', data.refreshToken);

          // Retry original request
          return client(error.config);
        } catch {
          // Clear tokens, force login
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email: string, password: string, name: string) =>
    client.post('/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),

  getCurrentUser: () => client.get('/auth/me'),
};

export const gymsAPI = {
  listMyGyms: () => client.get('/gyms'),

  getGym: (gymId: string) => client.get(`/gyms/${gymId}`),
};

export const classesAPI = {
  listByDateRange: (gymId: string, startDate: string, endDate: string) =>
    client.get(`/gyms/${gymId}/classes`, {
      params: { startDate, endDate },
    }),

  getClass: (gymId: string, classId: string) =>
    client.get(`/gyms/${gymId}/classes/${classId}`),
};

export const reservationsAPI = {
  create: (gymId: string, classId: string, membershipId: string) =>
    client.post(`/gyms/${gymId}/reservations`, {
      classId,
      membershipId,
    }),

  list: (gymId: string) => client.get(`/gyms/${gymId}/reservations`),

  cancel: (gymId: string, reservationId: string) =>
    client.delete(`/gyms/${gymId}/reservations/${reservationId}`),
};

export const membershipsAPI = {
  list: (gymId: string) => client.get(`/gyms/${gymId}/memberships`),

  get: (gymId: string, membershipId: string) =>
    client.get(`/gyms/${gymId}/memberships/${membershipId}`),

  listPlans: (gymId: string) => client.get(`/gyms/${gymId}/memberships/plans`),
};

export const attendanceAPI = {
  checkIn: (gymId: string, reservationId: string, qrCode: string) =>
    client.post(`/gyms/${gymId}/attendance/check-in`, {
      reservationId,
      qrCode,
    }),

  getHistory: (gymId: string, studentId: string) =>
    client.get(`/gyms/${gymId}/attendance/students/${studentId}`),

  generateQr: (gymId: string, classId: string) =>
    client.post(`/gyms/${gymId}/attendance/classes/${classId}/qr`),
};

export default client;
