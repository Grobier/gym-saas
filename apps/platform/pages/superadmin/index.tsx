export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { format } from 'date-fns';
import { authAPI, convertSupabaseUser, superadminAPI, SuperAdminGymOverview } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface ConsolidatedMetrics {
  totalGyms: number;
  activeGyms: number;
  totalStudents: number;
  totalClasses: number;
  totalRevenue: number;
  trialGyms: number;
  expiredGyms: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [gyms, setGyms] = useState<SuperAdminGymOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ConsolidatedMetrics>({
    totalGyms: 0,
    activeGyms: 0,
    totalStudents: 0,
    totalClasses: 0,
    totalRevenue: 0,
    trialGyms: 0,
    expiredGyms: 0,
  });

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setLoading(true);
    setError(null);

    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data: userData, error: userError } = await authAPI.getCurrentUser();

      if (userError || !userData.user) {
        throw new Error('Failed to get user information');
      }

      const currentUser = convertSupabaseUser(userData.user);

      if (currentUser.role !== 'superadmin') {
        toast.error('No tienes acceso a esta sección');
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const { data: gymsData, error: gymsError } = await superadminAPI.getGymOverview();

      if (gymsError) {
        console.error('Gym access error:', gymsError);
        setError(`Unable to load gyms: ${gymsError}`);
        toast.error('No se pudieron cargar los gimnasios. Por favor intenta de nuevo.');
        setLoading(false);
        return;
      }

      if (!gymsData || gymsData.length === 0) {
        setError('No hay gimnasios en el sistema.');
        setLoading(false);
        return;
      }

      setGyms(gymsData);

      const activeGyms = gymsData.filter(
        (g) => g.subscription_status === 'active'
      ).length;
      const trialGyms = gymsData.filter(
        (g) => g.subscription_status === 'active' && g.subscription_plan === 'trial'
      ).length;
      const expiredGyms = gymsData.filter(
        (g) => g.subscription_status === 'expired' || g.subscription_status === 'cancelled'
      ).length;
      const totalStudents = gymsData.reduce(
        (sum, g) => sum + (g.student_count || 0),
        0
      );
      const totalClasses = gymsData.reduce(
        (sum, g) => sum + (g.class_count || 0),
        0
      );
      const totalRevenue = gymsData.reduce(
        (sum, g) => sum + (g.monthly_revenue || 0),
        0
      );

      setMetrics({
        totalGyms: gymsData.length,
        activeGyms,
        totalStudents,
        totalClasses,
        totalRevenue,
        trialGyms,
        expiredGyms,
      });
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      setError(error?.message || 'Error al cargar el perfil');
      toast.error(error?.message || 'Error al cargar el perfil');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  const getSubscriptionStatus = (gym: SuperAdminGymOverview) => {
    if (!gym.subscription_status) return { label: 'Sin registro', color: '#9ca3af' };
    if (gym.subscription_status === 'expired' || gym.subscription_status === 'cancelled') {
      return { label: 'Expirado', color: '#ef4444' };
    }
    if (gym.subscription_plan === 'trial') {
      return { label: 'Trial', color: '#3b82f6' };
    }
    return { label: 'Activo', color: '#10b981' };
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

  if (loading || gyms.length === 0) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Super Administrador</h1>
        <div className={styles.userInfo} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/role-selector')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            🔄 Cambiar Perfil
          </button>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Métricas Consolidadas */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Métricas Consolidadas</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Total de Gimnasios</h3>
              <p className={styles.metricValue}>{metrics.totalGyms}</p>
              <span className={styles.metricLabel}>En el sistema</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Activos</h3>
              <p className={styles.metricValue} style={{ color: '#10b981' }}>
                {metrics.activeGyms}
              </p>
              <span className={styles.metricLabel}>
                {((metrics.activeGyms / metrics.totalGyms) * 100).toFixed(0)}% activos
              </span>
            </div>

            <div className={styles.metricCard}>
              <h3>Total de Estudiantes</h3>
              <p className={styles.metricValue}>{metrics.totalStudents.toLocaleString()}</p>
              <span className={styles.metricLabel}>Todos los gimnasios</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Total de Clases</h3>
              <p className={styles.metricValue}>{metrics.totalClasses}</p>
              <span className={styles.metricLabel}>Clases programadas</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Ingresos Mensuales</h3>
              <p className={styles.metricValue}>
                ${(metrics.totalRevenue / 1000000).toFixed(1)}M
              </p>
              <span className={styles.metricLabel}>Consolidados</span>
            </div>

            <div className={styles.metricCard + ' ' + styles.warning}>
              <h3>Vencidos/Inactivos</h3>
              <p className={styles.metricValue} style={{ color: '#ef4444' }}>
                {metrics.expiredGyms}
              </p>
              <span className={styles.metricLabel}>Requieren atención</span>
            </div>
          </div>
        </section>

        {/* Resumen de Suscripciones */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Estado de Suscripciones</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                borderLeft: '4px solid #10b981',
              }}
            >
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Activos</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {metrics.activeGyms}
              </p>
            </div>

            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6',
              }}
            >
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Trial</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {metrics.trialGyms}
              </p>
            </div>

            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                borderLeft: '4px solid #ef4444',
              }}
            >
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>Expirados</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {metrics.expiredGyms}
              </p>
            </div>
          </div>
        </section>

        {/* Tabla Gimnasios Detallada */}
        <section>
          <h2 style={{ marginBottom: '1rem' }}>Gimnasios ({gyms.length})</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Plan</th>
                  <th>Estudiantes</th>
                  <th>Clases</th>
                  <th>Ingresos/mes</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => {
                  const status = getSubscriptionStatus(gym);
                  return (
                    <tr key={gym.gym_id}>
                      <td className={styles.name}>{gym.gym_name}</td>
                      <td>{gym.city || '-'}</td>
                      <td>
                        {gym.subscription_plan
                          ? gym.subscription_plan === 'trial'
                            ? '📋 Trial'
                            : gym.subscription_plan === 'monthly'
                            ? '📅 Mensual'
                            : '📅 Anual'
                          : '-'}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#f0f9ff',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {gym.student_count}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {gym.class_count}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#fef3c7',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                          }}
                        >
                          ${(gym.monthly_revenue / 1000).toFixed(0)}k
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.status}
                          style={{ backgroundColor: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td>
                        {gym.subscription_end_date
                          ? format(new Date(gym.subscription_end_date), 'dd MMM')
                          : '-'}
                      </td>
                      <td>
                        <button
                          onClick={() => router.push(`/superadmin/${gym.gym_id}`)}
                          className={styles.btnSmall}
                          style={{ backgroundColor: '#3b82f6' }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
