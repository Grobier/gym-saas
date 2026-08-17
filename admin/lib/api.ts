import axios from 'axios';
import { parseCookies, setCookie, destroyCookie } from 'nookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add token to requests
client.interceptors.request.use((config) => {
  const cookies = parseCookies();
  const token = cookies.authToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cookies = parseCookies();

    if (error.response?.status === 401) {
      const refreshToken = cookies.refreshToken;

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          setCookie(null, 'authToken', data.accessToken, {
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
          });
          setCookie(null, 'refreshToken', data.refreshToken, {
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
          });

          return client(error.config);
        } catch {
          destroyCookie(null, 'authToken', { path: '/' });
          destroyCookie(null, 'refreshToken', { path: '/' });
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),

  getCurrentUser: () => client.get('/auth/me'),

  logout: () => {
    destroyCookie(null, 'authToken', { path: '/' });
    destroyCookie(null, 'refreshToken', { path: '/' });
  },
};

export const gymsAPI = {
  listMyGyms: () => client.get('/gyms'),
  getGym: (gymId: string) => client.get(`/gyms/${gymId}`),
  update: (gymId: string, data: any) => client.put(`/gyms/${gymId}`, data),
};

export const studentsAPI = {
  list: (gymId: string, params?: any) =>
    client.get(`/gyms/${gymId}/students`, { params }),

  get: (gymId: string, studentId: string) =>
    client.get(`/gyms/${gymId}/students/${studentId}`),

  create: (gymId: string, data: any) =>
    client.post(`/gyms/${gymId}/students`, data),

  delete: (gymId: string, studentId: string) =>
    client.delete(`/gyms/${gymId}/students/${studentId}`),
};

export const classesAPI = {
  list: (gymId: string, params?: any) =>
    client.get(`/gyms/${gymId}/classes`, { params }),

  get: (gymId: string, classId: string) =>
    client.get(`/gyms/${gymId}/classes/${classId}`),

  create: (gymId: string, data: any) =>
    client.post(`/gyms/${gymId}/classes/series`, data),

  update: (gymId: string, classId: string, data: any) =>
    client.put(`/gyms/${gymId}/classes/${classId}`, data),

  cancel: (gymId: string, classId: string) =>
    client.delete(`/gyms/${gymId}/classes/${classId}`),
};

export const membershipsAPI = {
  list: (gymId: string, params?: any) =>
    client.get(`/gyms/${gymId}/memberships`, { params }),

  listPlans: (gymId: string) =>
    client.get(`/gyms/${gymId}/memberships/plans`),

  createPlan: (gymId: string, data: any) =>
    client.post(`/gyms/${gymId}/memberships/plans`, data),

  freeze: (gymId: string, membershipId: string) =>
    client.put(`/gyms/${gymId}/memberships/${membershipId}/freeze`),

  extend: (gymId: string, membershipId: string, days: number) =>
    client.put(`/gyms/${gymId}/memberships/${membershipId}/extend`, {
      extensionDays: days,
    }),

  giftClasses: (gymId: string, membershipId: string, quantity: number, reason: string) =>
    client.post(`/gyms/${gymId}/memberships/${membershipId}/gift-classes`, {
      quantity,
      reason,
    }),
};

export const paymentsAPI = {
  list: (gymId: string, params?: any) =>
    client.get(`/gyms/${gymId}/payments`, { params }),

  get: (gymId: string, paymentId: string) =>
    client.get(`/gyms/${gymId}/payments/${paymentId}`),

  validateTransfer: (gymId: string, paymentId: string, approved: boolean) =>
    client.put(`/gyms/${gymId}/payments/${paymentId}/transfer-validation`, {
      approved,
    }),
};

export const reportsAPI = {
  attendance: (gymId: string, startDate: string, endDate: string) =>
    client.get(`/gyms/${gymId}/reports/attendance`, {
      params: { startDate, endDate },
    }),

  revenue: (gymId: string, startDate: string, endDate: string) =>
    client.get(`/gyms/${gymId}/reports/revenue`, {
      params: { startDate, endDate },
    }),

  members: (gymId: string) =>
    client.get(`/gyms/${gymId}/reports/members`),
};

export default client;
