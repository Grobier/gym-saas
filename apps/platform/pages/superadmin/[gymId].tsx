export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, convertSupabaseUser, superadminAPI, SuperAdminGymOverview } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import saStyles from '../../styles/superadmin.module.css';

export default function SuperAdminGymDetailPage() {
  const router = useRouter();
  const { gymId } = router.query;
  const [loading, setLoading] = useState(true);
  const [gym, setGym] = useState<SuperAdminGymOverview | null>(null);

  const user = useAuthStore((state) => state.user);
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
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>Cargando...</div>
        </div>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>No se encontró el gimnasio.</div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  return (
    <div className={saStyles.shell}>
      <Sidebar
        role="superadmin"
        userName={user?.name || user?.email}
        onLogout={handleLogout}
      />

      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Gym Detail</span>
            <h1 className={saStyles.title}>{gym.gym_name}</h1>
            <p className={saStyles.subtitle}>
              Vista detallada del estado operativo y comercial del gimnasio dentro del
              ecosistema moveOS.
            </p>
          </div>
          <div className={saStyles.heroActions}>
            <button
              onClick={() => router.push('/superadmin/reports')}
              className={saStyles.secondaryAction}
            >
              Ver Reportes
            </button>
            <button
              onClick={() => router.push('/superadmin')}
              className={saStyles.primaryAction}
            >
              Volver al Dashboard
            </button>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Resumen Ejecutivo</h2>
              <p className={saStyles.sectionCopy}>
                Señales clave para operación, crecimiento y seguimiento comercial.
              </p>
            </div>
          </div>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Ciudad</p>
              <p className={saStyles.metricValue}>{gym.city || '-'}</p>
              <div className={saStyles.metricHint}>Ubicación</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Estudiantes</p>
              <p className={saStyles.metricValue}>{gym.student_count}</p>
              <div className={saStyles.metricHint}>Registrados</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Clases</p>
              <p className={saStyles.metricValue}>{gym.class_count}</p>
              <div className={saStyles.metricHint}>Totales</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Ingresos del Mes</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneInfo}`}>
                ${(gym.monthly_revenue / 1000).toFixed(0)}k
              </p>
              <div className={saStyles.metricHint}>Pagos completados</div>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.detailGrid}>
            <div className={saStyles.panel}>
              <div className={saStyles.sectionHeader}>
                <div>
                  <h2 className={saStyles.sectionTitle}>Ficha del Gimnasio</h2>
                  <p className={saStyles.sectionCopy}>Datos base sincronizados desde Supabase.</p>
                </div>
              </div>
              <table className={saStyles.detailList}>
                <tbody>
                  <tr>
                    <th>Nombre</th>
                    <td>{gym.gym_name}</td>
                  </tr>
                  <tr>
                    <th>Ciudad</th>
                    <td>{gym.city || 'Sin registro'}</td>
                  </tr>
                  <tr>
                    <th>Creado</th>
                    <td>{new Date(gym.created_at).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <th>ID</th>
                    <td>{gym.gym_id}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={saStyles.panel}>
              <div className={saStyles.sectionHeader}>
                <div>
                  <h2 className={saStyles.sectionTitle}>Suscripción</h2>
                  <p className={saStyles.sectionCopy}>Estado comercial actual del gimnasio.</p>
                </div>
              </div>
              <table className={saStyles.detailList}>
                <tbody>
                  <tr>
                    <th>Plan</th>
                    <td>{gym.subscription_plan || 'Sin registro'}</td>
                  </tr>
                  <tr>
                    <th>Estado</th>
                    <td>{gym.subscription_status || 'Sin registro'}</td>
                  </tr>
                  <tr>
                    <th>Vence</th>
                    <td>
                      {gym.subscription_end_date
                        ? new Date(gym.subscription_end_date).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>Ingresos/Mes</th>
                    <td>${gym.monthly_revenue.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.summaryGrid}>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentInfo}`}>
              <p className={saStyles.summaryCardTitle}>Actividad</p>
              <p className={saStyles.summaryValue}>{gym.class_count}</p>
              <p className={saStyles.sectionCopy}>Clases registradas en la vista consolidada.</p>
            </article>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentSuccess}`}>
              <p className={saStyles.summaryCardTitle}>Base de alumnos</p>
              <p className={saStyles.summaryValue}>{gym.student_count}</p>
              <p className={saStyles.sectionCopy}>Usuarios estudiantiles asociados al gimnasio.</p>
            </article>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentDanger}`}>
              <p className={saStyles.summaryCardTitle}>Atención comercial</p>
              <p className={saStyles.summaryValue}>
                {gym.subscription_status === 'active' ? 'OK' : 'Revisar'}
              </p>
              <p className={saStyles.sectionCopy}>
                Verifica plan, vencimiento y cobros si no está activo.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
