export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { format } from 'date-fns';
import { authAPI, gymsAPI, subscriptionsAPI, convertSupabaseUser, Gym, Subscription } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface GymWithSubscription extends Gym {
  subscription?: Subscription | null;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [gyms, setGyms] = useState<GymWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Get current user
      const { data: userData, error: userError } = await authAPI.getCurrentUser();

      if (userError || !userData.user) {
        throw new Error('Failed to get user information');
      }

      setUser(convertSupabaseUser(userData.user));

      // Get all gyms
      const { data: gymsData, error: gymsError } = await gymsAPI.listAll();

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

      // Get subscriptions for each gym
      const { data: subscriptionsData } = await subscriptionsAPI.list();

      const gymsWithSubscriptions = gymsData.map((gym) => ({
        ...gym,
        subscription: subscriptionsData?.find((sub) => sub.gym_id === gym.id) || null,
      }));

      setGyms(gymsWithSubscriptions);
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

  const getSubscriptionStatus = (subscription: Subscription | null | undefined) => {
    if (!subscription) return { label: 'Sin suscripción', color: '#9ca3af', daysRemaining: 0 };

    if (subscription.status === 'expired') {
      return { label: 'Expirado', color: '#ef4444', daysRemaining: 0 };
    }

    const endDate = new Date(subscription.end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { label: 'Expirado', color: '#ef4444', daysRemaining: 0 };
    }

    if (subscription.plan_type === 'trial') {
      return { label: `Trial (${daysRemaining} días)`, color: '#3b82f6', daysRemaining };
    }

    return { label: 'Activo', color: '#10b981', daysRemaining };
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
        <div className={styles.userInfo}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.headerSection}>
          <h2>Gimnasios ({gyms.length})</h2>
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Total</span>
              <p className={styles.statValue}>{gyms.length}</p>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Activos</span>
              <p className={styles.statValue}>
                {gyms.filter((g) => g.subscription?.status === 'active').length}
              </p>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Trial</span>
              <p className={styles.statValue}>
                {gyms.filter((g) => g.subscription?.plan_type === 'trial').length}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ciudad</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Próximo vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gyms.map((gym) => {
                const status = getSubscriptionStatus(gym.subscription);
                return (
                  <tr key={gym.id}>
                    <td className={styles.gymName}>{gym.name}</td>
                    <td>{gym.city}</td>
                    <td>
                      {gym.subscription ? (
                        <span className={styles.planBadge}>
                          {gym.subscription.plan_type === 'trial' ? 'Trial' :
                           gym.subscription.plan_type === 'monthly' ? 'Mensual' : 'Anual'}
                        </span>
                      ) : (
                        <span className={styles.planBadge}>-</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={styles.status}
                        style={{ backgroundColor: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>{format(new Date(gym.created_at), 'dd MMM, yyyy')}</td>
                    <td>
                      {gym.subscription ? format(new Date(gym.subscription.end_date), 'dd MMM, yyyy') : '-'}
                    </td>
                    <td>
                      <button
                        onClick={() => router.push(`/superadmin/${gym.id}`)}
                        className={styles.btnSmall}
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
      </main>
    </div>
  );
}
