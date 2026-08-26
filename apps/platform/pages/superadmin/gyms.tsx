export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import {
  authAPI,
  convertSupabaseUser,
  superadminAPI,
  SuperAdminGymOverview,
} from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import saStyles from '../../styles/superadmin.module.css';

export default function SuperAdminGymsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updatingGymId, setUpdatingGymId] = useState<string | null>(null);
  const [gyms, setGyms] = useState<SuperAdminGymOverview[]>([]);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data, error } = await authAPI.getCurrentUser();
      if (error || !data.user) {
        throw new Error('Error de autenticación');
      }

      const currentUser = convertSupabaseUser(data.user);
      if (currentUser.role !== 'superadmin') {
        toast.error('No tienes acceso a esta sección');
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const { data: overview, error: overviewError } = await superadminAPI.getGymOverview();
      if (overviewError) {
        throw new Error(typeof overviewError === 'string' ? overviewError : 'No se pudieron cargar los gimnasios');
      }

      setGyms(overview || []);
    } catch (runtimeError: any) {
      console.error('Superadmin gyms error:', runtimeError);
      toast.error(runtimeError?.message || 'Error al cargar gimnasios');
      router.push('/superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  const handleToggleGym = async (gym: SuperAdminGymOverview) => {
    const shouldActivate = !gym.is_active;
    const reason = shouldActivate
      ? ''
      : window.prompt(
          `Razón para bloquear ${gym.gym_name}. Esto afectará admin, coaches y alumnos.`,
          gym.blocked_reason || ''
        );

    if (!shouldActivate && reason === null) {
      return;
    }

    setUpdatingGymId(gym.gym_id);
    try {
      const { error } = await superadminAPI.toggleGymStatus(
        gym.gym_id,
        shouldActivate,
        shouldActivate ? undefined : reason || 'Bloqueado por superadministración'
      );

      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo actualizar el gimnasio');
      }

      toast.success(shouldActivate ? 'Gimnasio activado' : 'Gimnasio bloqueado');
      await bootstrap();
    } catch (runtimeError: any) {
      console.error('Toggle gym error:', runtimeError);
      toast.error(runtimeError?.message || 'No se pudo actualizar el estado');
    } finally {
      setUpdatingGymId(null);
    }
  };

  if (loading) {
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>Cargando gimnasios...</div>
        </div>
      </div>
    );
  }

  const activeGyms = gyms.filter((gym) => gym.is_active).length;
  const blockedGyms = gyms.filter((gym) => !gym.is_active).length;
  const gymsWithoutAdmin = gyms.filter((gym) => gym.admin_count === 0).length;

  return (
    <div className={saStyles.shell}>
      <Sidebar role="superadmin" userName={user?.name || user?.email} onLogout={handleLogout} />

      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Gym Directory</span>
            <h1 className={saStyles.title}>Gimnasios</h1>
            <p className={saStyles.subtitle}>
              Directorio completo de sedes para revisar operación, equipo asignado y acceso.
            </p>
          </div>
          <div className={saStyles.heroActions}>
            <button
              onClick={() => router.push('/superadmin/create-gym')}
              className={saStyles.primaryAction}
            >
              Crear Gym
            </button>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total</p>
              <p className={saStyles.metricValue}>{gyms.length}</p>
              <div className={saStyles.metricHint}>Sedes registradas</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Operativos</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneSuccess}`}>{activeGyms}</p>
              <div className={saStyles.metricHint}>Acceso habilitado</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Bloqueados</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>{blockedGyms}</p>
              <div className={saStyles.metricHint}>Sin acceso operativo</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Sin Admin</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneInfo}`}>{gymsWithoutAdmin}</p>
              <div className={saStyles.metricHint}>Requieren asignación</div>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Equipo</th>
                  <th>Operación</th>
                  <th>Plan</th>
                  <th>Ingresos/Mes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => (
                  <tr key={gym.gym_id}>
                    <td className={saStyles.nameCell}>
                      <div>{gym.gym_name}</div>
                      <div className={saStyles.microCopy}>{gym.city || 'Sin ciudad'}</div>
                    </td>
                    <td>
                      <div className={saStyles.inlineMetricRow}>
                        <span className={`${saStyles.pill} ${saStyles.pillBlue}`}>{gym.admin_count} admin</span>
                        <span className={`${saStyles.pill} ${saStyles.pillGreen}`}>{gym.coach_count} coach</span>
                        <span className={`${saStyles.pill} ${saStyles.pillAmber}`}>{gym.student_count} alumnos</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={saStyles.statusPill}
                        style={{ backgroundColor: gym.is_active ? '#10b981' : '#ef4444' }}
                      >
                        {gym.is_active ? 'Operativo' : 'Bloqueado'}
                      </span>
                      {gym.blocked_reason && <div className={saStyles.microCopy}>{gym.blocked_reason}</div>}
                    </td>
                    <td>{gym.subscription_plan || 'Sin registro'}</td>
                    <td>${(gym.monthly_revenue / 1000).toFixed(0)}k</td>
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
                          disabled={updatingGymId === gym.gym_id}
                          className={gym.is_active ? saStyles.dangerAction : saStyles.primaryAction}
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
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
