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
import saStyles from '../../styles/superadmin.module.css';

export default function SuperAdminSubscriptionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
        throw new Error(typeof overviewError === 'string' ? overviewError : 'No se pudieron cargar las suscripciones');
      }

      setGyms(overview || []);
    } catch (runtimeError: any) {
      console.error('Superadmin subscriptions error:', runtimeError);
      toast.error(runtimeError?.message || 'Error al cargar suscripciones');
      router.push('/superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>Cargando suscripciones...</div>
        </div>
      </div>
    );
  }

  const trials = gyms.filter((gym) => gym.subscription_plan === 'trial').length;
  const expired = gyms.filter(
    (gym) => gym.subscription_status === 'expired' || gym.subscription_status === 'cancelled'
  ).length;
  const withoutSubscription = gyms.filter((gym) => !gym.subscription_status).length;

  return (
    <div className={saStyles.shell}>
      <Sidebar role="superadmin" userName={user?.name || user?.email} onLogout={handleLogout} />
      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Commercial Control</span>
            <h1 className={saStyles.title}>Suscripciones</h1>
            <p className={saStyles.subtitle}>
              Estado comercial por gimnasio para detectar trials, vencidos y sedes sin registro.
            </p>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Trials</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneInfo}`}>{trials}</p>
              <div className={saStyles.metricHint}>En etapa de prueba</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Expirados</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>{expired}</p>
              <div className={saStyles.metricHint}>Requieren seguimiento</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Sin Registro</p>
              <p className={saStyles.metricValue}>{withoutSubscription}</p>
              <div className={saStyles.metricHint}>Sin plan cargado</div>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Gimnasio</th>
                  <th>Operación</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Ingresos/Mes</th>
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
                      <span
                        className={saStyles.statusPill}
                        style={{ backgroundColor: gym.is_active ? '#10b981' : '#ef4444' }}
                      >
                        {gym.is_active ? 'Operativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td>{gym.subscription_plan || 'Sin registro'}</td>
                    <td>{gym.subscription_status || 'Sin registro'}</td>
                    <td>
                      {gym.subscription_end_date
                        ? format(new Date(gym.subscription_end_date), 'dd MMM yyyy')
                        : '-'}
                    </td>
                    <td>${(gym.monthly_revenue / 1000).toFixed(0)}k</td>
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
