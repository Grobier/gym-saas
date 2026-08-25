export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, convertSupabaseUser, superadminAPI, SuperAdminGymOverview } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

export default function SuperAdminGymDetailPage() {
  const router = useRouter();
  const { gymId } = router.query;
  const [loading, setLoading] = useState(true);
  const [gym, setGym] = useState<SuperAdminGymOverview | null>(null);

  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (router.isReady) {
      bootstrap();
    }
  }, [router.isReady, gymId]);

  const bootstrap = async () => {
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

      const { data, error } = await superadminAPI.getGymOverview();

      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo cargar el gimnasio');
      }

      const currentGym = (data || []).find((item) => item.gym_id === gymId);

      if (!currentGym) {
        toast.error('Gimnasio no encontrado');
        router.push('/superadmin');
        return;
      }

      setGym(currentGym);
    } catch (error: any) {
      console.error('Superadmin gym detail error:', error);
      toast.error(error?.message || 'Error al cargar el gimnasio');
      router.push('/superadmin');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  if (!gym) {
    return <div className={styles.container}>No se encontró el gimnasio.</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{gym.gym_name}</h1>
        <div className={styles.userInfo}>
          <button onClick={() => router.push('/superadmin/reports')} className={styles.logoutBtn}>
            Ver Reportes
          </button>
          <button onClick={() => router.push('/superadmin')} className={styles.logoutBtn}>
            ← Volver
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section style={{ marginBottom: '2rem' }}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Ciudad</h3>
              <p className={styles.metricValue}>{gym.city || '-'}</p>
              <span className={styles.metricLabel}>Ubicación</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Estudiantes</h3>
              <p className={styles.metricValue}>{gym.student_count}</p>
              <span className={styles.metricLabel}>Registrados</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Clases</h3>
              <p className={styles.metricValue}>{gym.class_count}</p>
              <span className={styles.metricLabel}>Totales</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Ingresos del Mes</h3>
              <p className={styles.metricValue}>${(gym.monthly_revenue / 1000).toFixed(0)}k</p>
              <span className={styles.metricLabel}>Pagos completados</span>
            </div>
          </div>
        </section>

        <section className={styles.tableContainer}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>Suscripción</th>
                <td>{gym.subscription_plan || 'Sin registro'}</td>
              </tr>
              <tr>
                <th>Estado</th>
                <td>{gym.subscription_status || 'Sin registro'}</td>
              </tr>
              <tr>
                <th>Vencimiento</th>
                <td>{gym.subscription_end_date ? new Date(gym.subscription_end_date).toLocaleDateString() : '-'}</td>
              </tr>
              <tr>
                <th>Creado</th>
                <td>{new Date(gym.created_at).toLocaleDateString()}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
