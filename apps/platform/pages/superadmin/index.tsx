export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { format } from 'date-fns';
import {
  authAPI,
  convertSupabaseUser,
  superadminAPI,
  SuperAdminGymOverview,
} from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import CreateGymForm from '../../components/superadmin/CreateGymForm';
import saStyles from '../../styles/superadmin.module.css';

interface ConsolidatedMetrics {
  totalGyms: number;
  operationalGyms: number;
  blockedGyms: number;
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
  const [updatingGymId, setUpdatingGymId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ConsolidatedMetrics>({
    totalGyms: 0,
    operationalGyms: 0,
    blockedGyms: 0,
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
        return;
      }

      const overview = gymsData || [];
      setGyms(overview);

      const operationalGyms = overview.filter((g) => g.is_active).length;
      const blockedGyms = overview.filter((g) => !g.is_active).length;
      const trialGyms = overview.filter(
        (g) => g.subscription_status === 'active' && g.subscription_plan === 'trial'
      ).length;
      const expiredGyms = overview.filter(
        (g) => g.subscription_status === 'expired' || g.subscription_status === 'cancelled'
      ).length;
      const totalStudents = overview.reduce((sum, g) => sum + (g.student_count || 0), 0);
      const totalClasses = overview.reduce((sum, g) => sum + (g.class_count || 0), 0);
      const totalRevenue = overview.reduce((sum, g) => sum + (g.monthly_revenue || 0), 0);

      setMetrics({
        totalGyms: overview.length,
        operationalGyms,
        blockedGyms,
        totalStudents,
        totalClasses,
        totalRevenue,
        trialGyms,
        expiredGyms,
      });
    } catch (runtimeError: any) {
      console.error('Bootstrap error:', runtimeError);
      setError(runtimeError?.message || 'Error al cargar el perfil');
      toast.error(runtimeError?.message || 'Error al cargar el perfil');
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

  const handleToggleGym = async (gym: SuperAdminGymOverview) => {
    const shouldActivate = !gym.is_active;
    const reason = shouldActivate
      ? ''
      : window.prompt(
          `Razón para bloquear ${gym.gym_name}. Este bloqueo afectará admin, coaches y alumnos.`,
          gym.blocked_reason || ''
        );

    if (!shouldActivate && reason === null) {
      return;
    }

    setUpdatingGymId(gym.gym_id);

    try {
      const { error: updateError } = await superadminAPI.toggleGymStatus(
        gym.gym_id,
        shouldActivate,
        shouldActivate ? undefined : reason || 'Bloqueado por superadministración'
      );

      if (updateError) {
        throw new Error(typeof updateError === 'string' ? updateError : 'No se pudo actualizar el gimnasio');
      }

      toast.success(
        shouldActivate
          ? `${gym.gym_name} reactivado`
          : `${gym.gym_name} bloqueado correctamente`
      );

      await bootstrap();
    } catch (runtimeError: any) {
      console.error('Toggle gym status error:', runtimeError);
      toast.error(runtimeError?.message || 'No se pudo actualizar el gimnasio');
    } finally {
      setUpdatingGymId(null);
    }
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

  if (loading) {
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
      <Sidebar role="superadmin" userName={user?.name || user?.email} onLogout={handleLogout} />

      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Platform Control</span>
            <h1 className={saStyles.title}>Super Administrador</h1>
            <p className={saStyles.subtitle}>
              Opera la red completa: alta de gimnasios, creación de administradores y
              activación o bloqueo operativo de cada sede.
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
              <p className={saStyles.sectionCopy}>
                Visión de operación, base de usuarios y salud comercial.
              </p>
            </div>
          </div>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total de Gimnasios</p>
              <p className={saStyles.metricValue}>{metrics.totalGyms}</p>
              <div className={saStyles.metricHint}>En el sistema</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Operativos</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneSuccess}`}>
                {metrics.operationalGyms}
              </p>
              <div className={saStyles.metricHint}>Con acceso habilitado</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Bloqueados</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>
                {metrics.blockedGyms}
              </p>
              <div className={saStyles.metricHint}>Sin acceso operativo</div>
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
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.controlGrid}>
            <div className={saStyles.formCard}>
              <div className={saStyles.sectionHeader}>
                <div>
                  <h2 className={saStyles.sectionTitle}>Alta de Gimnasio</h2>
                  <p className={saStyles.sectionCopy}>
                    Crea la sede y deja su cuenta administradora operativa desde el inicio.
                  </p>
                </div>
              </div>

              <CreateGymForm onCreated={bootstrap} />
            </div>

            <div className={`${saStyles.summaryCard} ${saStyles.summaryAccentInfo}`}>
              <p className={saStyles.summaryCardTitle}>Operación de Plataforma</p>
              <p className={saStyles.summaryValue}>{metrics.operationalGyms}</p>
              <p className={saStyles.sectionCopy}>
                El bloqueo de un gimnasio corta el acceso operativo de admin, coaches y alumnos
                asociados al contexto de esa sede.
              </p>
              <div className={saStyles.noticeList}>
                <span>Alta centralizada de gimnasios</span>
                <span>Creación inmediata de cuenta admin</span>
                <span>Bloqueo / reactivación por sede</span>
              </div>
            </div>
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
              <p className={saStyles.summaryValue}>{metrics.operationalGyms}</p>
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
              <h2 className={saStyles.sectionTitle}>Directorio de Gimnasios</h2>
              <p className={saStyles.sectionCopy}>{gyms.length} registros visibles.</p>
            </div>
          </div>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Operación</th>
                  <th>Equipo</th>
                  <th>Plan</th>
                  <th>Ingresos/Mes</th>
                  <th>Estado Comercial</th>
                  <th>Vence</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => {
                  const status = getSubscriptionStatus(gym);
                  const operationLabel = gym.is_active ? 'Operativo' : 'Bloqueado';
                  const operationColor = gym.is_active ? '#10b981' : '#ef4444';

                  return (
                    <tr key={gym.gym_id}>
                      <td className={saStyles.nameCell}>
                        <div>{gym.gym_name}</div>
                        <div className={saStyles.microCopy}>{gym.city || 'Sin ciudad'}</div>
                      </td>
                      <td>
                        <span
                          className={saStyles.statusPill}
                          style={{ backgroundColor: operationColor }}
                        >
                          {operationLabel}
                        </span>
                        {gym.blocked_reason && (
                          <div className={saStyles.microCopy}>{gym.blocked_reason}</div>
                        )}
                      </td>
                      <td>
                        <div className={saStyles.inlineMetricRow}>
                          <span className={`${saStyles.pill} ${saStyles.pillBlue}`}>
                            {gym.admin_count} admin
                          </span>
                          <span className={`${saStyles.pill} ${saStyles.pillGreen}`}>
                            {gym.coach_count} coach
                          </span>
                          <span className={`${saStyles.pill} ${saStyles.pillAmber}`}>
                            {gym.student_count} alumno
                          </span>
                        </div>
                      </td>
                      <td>
                        {gym.subscription_plan
                          ? gym.subscription_plan === 'trial'
                            ? 'Trial'
                            : gym.subscription_plan === 'monthly'
                              ? 'Mensual'
                              : 'Anual'
                          : '-'}
                      </td>
                      <td>${(gym.monthly_revenue / 1000).toFixed(0)}k</td>
                      <td>
                        <span
                          className={saStyles.statusPill}
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
                        <div className={saStyles.inlineActions}>
                          <button
                            onClick={() => router.push(`/superadmin/${gym.gym_id}`)}
                            className={saStyles.secondaryAction}
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => handleToggleGym(gym)}
                            className={gym.is_active ? saStyles.dangerAction : saStyles.primaryAction}
                            disabled={updatingGymId === gym.gym_id}
                          >
                            {updatingGymId === gym.gym_id
                              ? 'Guardando...'
                              : gym.is_active
                                ? 'Bloquear'
                                : 'Activar'}
                          </button>
                        </div>
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
