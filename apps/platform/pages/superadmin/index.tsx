export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { format } from 'date-fns';
import { authAPI, convertSupabaseUser, superadminAPI, SuperAdminGymOverview } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import saStyles from '../../styles/superadmin.module.css';

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

      const activeGyms = gymsData.filter((g) => g.subscription_status === 'active').length;
      const trialGyms = gymsData.filter(
        (g) => g.subscription_status === 'active' && g.subscription_plan === 'trial'
      ).length;
      const expiredGyms = gymsData.filter(
        (g) => g.subscription_status === 'expired' || g.subscription_status === 'cancelled'
      ).length;
      const totalStudents = gymsData.reduce((sum, g) => sum + (g.student_count || 0), 0);
      const totalClasses = gymsData.reduce((sum, g) => sum + (g.class_count || 0), 0);
      const totalRevenue = gymsData.reduce((sum, g) => sum + (g.monthly_revenue || 0), 0);

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
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => bootstrap()} style={{ marginRight: '1rem' }}>
              Intentar de Nuevo
            </button>
            <button onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || gyms.length === 0) {
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>Cargando...</div>
        </div>
      </div>
    );
  }

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
            <span className={saStyles.eyebrow}>Platform View</span>
            <h1 className={saStyles.title}>Super Administrador</h1>
            <p className={saStyles.subtitle}>
              Vista consolidada de gimnasios, suscripciones y métricas globales con una
              superficie de control minimalista inspirada en Apple.
            </p>
          </div>
          <div className={saStyles.heroActions}>
            <button
              onClick={() => router.push('/role-selector')}
              className={saStyles.secondaryAction}
            >
              Cambiar Perfil
            </button>
            <button
              onClick={() => router.push('/superadmin/reports')}
              className={saStyles.primaryAction}
            >
              Abrir Reportes
            </button>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Métricas Consolidadas</h2>
              <p className={saStyles.sectionCopy}>Pulso general de la red conectado a Supabase.</p>
            </div>
          </div>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total de Gimnasios</p>
              <p className={saStyles.metricValue}>{metrics.totalGyms}</p>
              <div className={saStyles.metricHint}>En el sistema</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Activos</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneSuccess}`}>{metrics.activeGyms}</p>
              <div className={saStyles.metricHint}>
                {((metrics.activeGyms / metrics.totalGyms) * 100).toFixed(0)}% activos
              </div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total de Estudiantes</p>
              <p className={saStyles.metricValue}>{metrics.totalStudents.toLocaleString()}</p>
              <div className={saStyles.metricHint}>Todos los gimnasios</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total de Clases</p>
              <p className={saStyles.metricValue}>{metrics.totalClasses}</p>
              <div className={saStyles.metricHint}>Clases programadas</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Ingresos Mensuales</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneInfo}`}>
                ${(metrics.totalRevenue / 1000000).toFixed(1)}M
              </p>
              <div className={saStyles.metricHint}>Consolidados</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Vencidos/Inactivos</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>{metrics.expiredGyms}</p>
              <div className={saStyles.metricHint}>Requieren atención</div>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Estado de Suscripciones</h2>
              <p className={saStyles.sectionCopy}>Lectura comercial rápida.</p>
            </div>
          </div>
          <div className={saStyles.summaryGrid}>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentSuccess}`}>
              <p className={saStyles.summaryCardTitle}>Activos</p>
              <p className={saStyles.summaryValue}>{metrics.activeGyms}</p>
            </article>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentInfo}`}>
              <p className={saStyles.summaryCardTitle}>Trial</p>
              <p className={saStyles.summaryValue}>{metrics.trialGyms}</p>
            </article>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentDanger}`}>
              <p className={saStyles.summaryCardTitle}>Expirados</p>
              <p className={saStyles.summaryValue}>{metrics.expiredGyms}</p>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Gimnasios</h2>
              <p className={saStyles.sectionCopy}>{gyms.length} registros visibles.</p>
            </div>
          </div>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Plan</th>
                  <th>Estudiantes</th>
                  <th>Clases</th>
                  <th>Ingresos/Mes</th>
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
                      <td className={saStyles.nameCell}>{gym.gym_name}</td>
                      <td>{gym.city || '-'}</td>
                      <td>
                        {gym.subscription_plan
                          ? gym.subscription_plan === 'trial'
                            ? 'Trial'
                            : gym.subscription_plan === 'monthly'
                            ? 'Mensual'
                            : 'Anual'
                          : '-'}
                      </td>
                      <td><span className={`${saStyles.pill} ${saStyles.pillBlue}`}>{gym.student_count}</span></td>
                      <td><span className={`${saStyles.pill} ${saStyles.pillGreen}`}>{gym.class_count}</span></td>
                      <td><span className={`${saStyles.pill} ${saStyles.pillAmber}`}>${(gym.monthly_revenue / 1000).toFixed(0)}k</span></td>
                      <td><span className={saStyles.statusPill} style={{ backgroundColor: status.color }}>{status.label}</span></td>
                      <td>{gym.subscription_end_date ? format(new Date(gym.subscription_end_date), 'dd MMM') : '-'}</td>
                      <td>
                        <button
                          onClick={() => router.push(`/superadmin/${gym.gym_id}`)}
                          className={saStyles.secondaryAction}
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
