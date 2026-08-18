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

          // Retry original request
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
};

export const classesAPI = {
  listByCoach: (gymId: string, startDate: string, endDate: string) =>
    client.get(`/gyms/${gymId}/classes`, {
      params: { startDate, endDate, coachId: 'me' },
    }),

  getClass: (gymId: string, classId: string) =>
    client.get(`/gyms/${gymId}/classes/${classId}`),

  getWithRoster: (gymId: string, classId: string) =>
    client.get(`/gyms/${gymId}/classes/${classId}?include=roster`),
};

export const attendanceAPI = {
  getClassAttendance: (gymId: string, classId: string) =>
    client.get(`/gyms/${gymId}/attendance/classes/${classId}`),

  markAttendance: (gymId: string, reservationId: string, status: 'attended' | 'no_show', notes?: string) =>
    client.post(`/gyms/${gymId}/attendance/mark`, {
      reservationId,
      status,
      notes,
    }),

  generateQr: (gymId: string, classId: string) =>
    client.post(`/gyms/${gymId}/attendance/classes/${classId}/qr`),
};

export const disciplinesAPI = {
  listByGym: (gymId: string) =>
    client.get(`/gyms/${gymId}/disciplines`),
};

export default client;
