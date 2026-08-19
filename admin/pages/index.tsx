export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format, subDays } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, gymsAPI, convertSupabaseUser } from '../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../lib/store';
import toast from 'react-hot-toast';
import styles from '../styles/dashboard.module.css';

interface DashboardMetrics {
  totalStudents: number;
  activeMembers: number;
  totalRevenue: number;
  attendanceRate: number;
  classesToday: number;
  pendingPayments: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const gyms = useGymsStore((state) => state.gyms);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      fetchMetrics();
    }
  }, [selectedGymId]);

  const bootstrap = async () => {
    setLoading(true);
    setError(null);

    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      // Get current user
      const { data: userData, error: userError } = await authAPI.getCurrentUser();

      if (userError || !userData.user) {
        throw new Error('Failed to get user information');
      }

      setUser(convertSupabaseUser(userData.user));

      // Get user's gyms
      const { data: gymsData, error: gymsError } = await gymsAPI.listMyGyms();

      if (gymsError) {
        console.error('Gym access error:', gymsError);
        setError(`Unable to load your gyms: ${gymsError}`);
        toast.error('No se pudieron cargar tus gimnasios. Por favor intenta de nuevo.');
        setLoading(false);
        return;
      }

      if (!gymsData || gymsData.length === 0) {
        setError('No tienes gimnasios asignados. Por favor contacta a un administrador.');
        toast.error('No hay gimnasios asignados a tu cuenta');
        setLoading(false);
        return;
      }

      setGyms(gymsData);
      setSelectedGym(gymsData[0].id);
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      setError(error?.message || 'Error al cargar el perfil');
      toast.error(error?.message || 'Error al cargar el perfil');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    if (!selectedGymId) return;

    try {
      // TODO: Create /gyms/:id/metrics endpoint
      setMetrics({
        totalStudents: 147,
        activeMembers: 89,
        totalRevenue: 1245000,
        attendanceRate: 82.5,
        classesToday: 6,
        pendingPayments: 3,
      });
    } catch (error) {
      toast.error('Error al cargar las métricas');
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => bootstrap()} style={{ marginRight: '1rem' }}>
            Intentar de Nuevo
          </button>
          <button onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (loading || !metrics || gyms.length === 0) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Panel de Administrador</h1>
        <div className={styles.userInfo}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <h3>Navigation</h3>
            <a href="/" className={styles.navLink + ' ' + styles.active}>
              Dashboard
            </a>
            <a href="/students" className={styles.navLink}>
              Estudiantes
            </a>
            <a href="/classes" className={styles.navLink}>
              Clases
            </a>
            <a href="/payments" className={styles.navLink}>
              Pagos
            </a>
          </nav>

          <div className={styles.gymSelector}>
            <h3>Gimnasio</h3>
            <select
              value={selectedGymId || ''}
              onChange={(e) => setSelectedGym(e.target.value)}
              className={styles.select}
            >
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Total de Estudiantes</h3>
              <p className={styles.metricValue}>{metrics.totalStudents}</p>
              <span className={styles.metricLabel}>Todo el tiempo</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Miembros Activos</h3>
              <p className={styles.metricValue}>{metrics.activeMembers}</p>
              <span className={styles.metricLabel}>Membresías actuales</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Ingresos Totales</h3>
              <p className={styles.metricValue}>
                ${(metrics.totalRevenue / 1000).toFixed(1)}k
              </p>
              <span className={styles.metricLabel}>Últimos 30 días</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Tasa de Asistencia</h3>
              <p className={styles.metricValue}>{metrics.attendanceRate}%</p>
              <span className={styles.metricLabel}>Este mes</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Clases Hoy</h3>
              <p className={styles.metricValue}>{metrics.classesToday}</p>
              <span className={styles.metricLabel}>Programadas</span>
            </div>

            <div className={styles.metricCard + ' ' + styles.warning}>
              <h3>Pagos Pendientes</h3>
              <p className={styles.metricValue}>{metrics.pendingPayments}</p>
              <span className={styles.metricLabel}>Requiere atención</span>
            </div>
          </div>

          <div className={styles.recentActivity}>
            <h2>Actividad Reciente</h2>
            <div className={styles.activityList}>
              <div className={styles.activityItem}>
                <span className={styles.activityType}>Payment</span>
                <span className={styles.activityText}>
                  John Doe purchased "Unlimited 30 days"
                </span>
                <span className={styles.activityTime}>2 hours ago</span>
              </div>

              <div className={styles.activityItem}>
                <span className={styles.activityType}>Reservation</span>
                <span className={styles.activityText}>
                  Sarah Smith reserved CrossFit 6 AM
                </span>
                <span className={styles.activityTime}>1 hour ago</span>
              </div>

              <div className={styles.activityItem}>
                <span className={styles.activityType}>Membership</span>
                <span className={styles.activityText}>
                  3 memberships expiring this week
                </span>
                <span className={styles.activityTime}>30 minutes ago</span>
              </div>

              <div className={styles.activityItem}>
                <span className={styles.activityType}>Class</span>
                <span className={styles.activityText}>
                  Morning Yoga reached capacity
                </span>
                <span className={styles.activityTime}>10 minutes ago</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
