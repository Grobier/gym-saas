export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { authAPI, convertSupabaseUser, gymsAPI } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import Sidebar from '../../components/Sidebar';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface AnalyticsData {
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  studentGrowth: Array<{ month: string; students: number }>;
  attendance: Array<{ month: string; rate: number }>;
  topClasses: Array<{ name: string; enrollments: number }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    monthlyRevenue: [],
    studentGrowth: [],
    attendance: [],
    topClasses: [],
  });

  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const gyms = useGymsStore((state) => state.gyms);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    verifyAuth();
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  useEffect(() => {
    if (selectedGymId) {
      loadAnalytics();
    }
  }, [selectedGymId]);

  const verifyAuth = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      const { data: userData } = await authAPI.getCurrentUser();
      if (userData.user) {
        setUser(convertSupabaseUser(userData.user));
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      // Mock data - en producción vendría de la API
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

      setData({
        monthlyRevenue: months.map((m, i) => ({
          month: m,
          revenue: Math.floor(Math.random() * 3000000) + 1000000,
        })),
        studentGrowth: months.map((m, i) => ({
          month: m,
          students: 50 + i * 15 + Math.floor(Math.random() * 10),
        })),
        attendance: months.map((m) => ({
          month: m,
          rate: Math.floor(Math.random() * 30) + 70,
        })),
        topClasses: [
          { name: 'CrossFit 6AM', enrollments: 45 },
          { name: 'Yoga Matutino', enrollments: 38 },
          { name: 'Pilates Tarde', enrollments: 32 },
          { name: 'Functional Noche', enrollments: 28 },
          { name: 'HIIT Tarde', enrollments: 25 },
        ],
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error('Error al cargar análiticas');
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar role="admin" gyms={gyms} selectedGymId={selectedGymId} onSelectGym={setSelectedGym} userName={user?.name} onLogout={handleLogout} />
        <div className={styles.container}>Cargando...</div>
      </div>
    );
  }

  const totalRevenue = data.monthlyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const totalStudents = data.studentGrowth[data.studentGrowth.length - 1]?.students || 0;
  const avgAttendance =
    Math.round(data.attendance.reduce((sum, d) => sum + d.rate, 0) / data.attendance.length) || 0;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar role="admin" gyms={gyms} selectedGymId={selectedGymId} onSelectGym={setSelectedGym} userName={user?.name} onLogout={handleLogout} />
      <div className={styles.container}>
      <header className={styles.header}>
        <h1>Análiticas</h1>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main}>
        {/* Métricas Clave */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Métricas Clave (Últimos 6 meses)</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Ingresos Totales</h3>
              <p className={styles.metricValue}>${(totalRevenue / 1000000).toFixed(1)}M</p>
              <span className={styles.metricLabel}>Últimos 6 meses</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Estudiantes Totales</h3>
              <p className={styles.metricValue}>{totalStudents}</p>
              <span className={styles.metricLabel}>Activos</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Tasa de Asistencia</h3>
              <p className={styles.metricValue}>{avgAttendance}%</p>
              <span className={styles.metricLabel}>Promedio</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Clases por Mes</h3>
              <p className={styles.metricValue}>
                {Math.round(data.studentGrowth.length > 0 ? 156 / 6 : 0)}
              </p>
              <span className={styles.metricLabel}>Promedio</span>
            </div>
          </div>
        </section>

        {/* Gráficos */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Ingresos Mensuales</h2>
          <div
            style={{
              backgroundColor: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${(Number(value) / 1000).toFixed(0)}k`}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Ingresos"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Crecimiento Estudiantes y Asistencia */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem',
          }}
        >
          <section>
            <h2 style={{ marginBottom: '1rem' }}>Crecimiento de Estudiantes</h2>
            <div
              style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.studentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip labelStyle={{ color: '#000' }} />
                  <Legend />
                  <Bar
                    dataKey="students"
                    fill="#10b981"
                    name="Estudiantes"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: '1rem' }}>Tasa de Asistencia</h2>
            <div
              style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.attendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => `${value}%`}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 5 }}
                    name="Asistencia %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Top Clases */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem',
          }}
        >
          <section>
            <h2 style={{ marginBottom: '1rem' }}>Clases Más Populares</h2>
            <div
              style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.topClasses}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={190} />
                  <Tooltip labelStyle={{ color: '#000' }} />
                  <Bar dataKey="enrollments" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: '1rem' }}>Distribución de Clases</h2>
            <div
              style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.topClasses}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="enrollments"
                  >
                    {data.topClasses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip labelStyle={{ color: '#000' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Info */}
        <section style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>ℹ️ Sobre Análiticas</h3>
          <ul style={{ marginBottom: 0 }}>
            <li>Los gráficos muestran datos de los últimos 6 meses</li>
            <li>Las métricas se actualizan automáticamente cada día</li>
            <li>Puedes usar esta información para optimizar tu negocio</li>
            <li>Identifica clases populares y horarios con más demanda</li>
          </ul>
        </section>
      </main>
      </div>
    </div>
  );
}
