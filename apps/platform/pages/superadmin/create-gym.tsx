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
import CreateGymForm from '../../components/superadmin/CreateGymForm';
import saStyles from '../../styles/superadmin.module.css';

export default function SuperAdminCreateGymPage() {
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
        throw new Error(typeof overviewError === 'string' ? overviewError : 'No se pudo cargar el resumen');
      }

      setGyms(overview || []);
    } catch (runtimeError: any) {
      console.error('Superadmin create gym error:', runtimeError);
      toast.error(runtimeError?.message || 'Error al cargar la página');
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
          <div className={saStyles.emptyState}>Cargando...</div>
        </div>
      </div>
    );
  }

  const recentGyms = gyms.slice(0, 5);

  return (
    <div className={saStyles.shell}>
      <Sidebar role="superadmin" userName={user?.name || user?.email} onLogout={handleLogout} />

      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Provisioning</span>
            <h1 className={saStyles.title}>Crear Gym</h1>
            <p className={saStyles.subtitle}>
              Alta centralizada del gimnasio con creación inmediata de su cuenta administradora.
            </p>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.controlGrid}>
            <div className={saStyles.formCard}>
              <div className={saStyles.sectionHeader}>
                <div>
                  <h2 className={saStyles.sectionTitle}>Nueva Sede</h2>
                  <p className={saStyles.sectionCopy}>
                    El admin creado quedará vinculado automáticamente al gimnasio.
                  </p>
                </div>
              </div>
              <CreateGymForm onCreated={bootstrap} />
            </div>

            <div className={`${saStyles.summaryCard} ${saStyles.summaryAccentSuccess}`}>
              <p className={saStyles.summaryCardTitle}>Resumen Actual</p>
              <p className={saStyles.summaryValue}>{gyms.length}</p>
              <p className={saStyles.sectionCopy}>Gimnasios cargados hoy en la plataforma.</p>
              <div className={saStyles.noticeList}>
                <span>Alta de sede</span>
                <span>Creación de cuenta admin</span>
                <span>Asignación automática a `gym_access`</span>
              </div>
            </div>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Últimos Gimnasios</h2>
              <p className={saStyles.sectionCopy}>Validación rápida posterior al alta.</p>
            </div>
          </div>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Admins</th>
                </tr>
              </thead>
              <tbody>
                {recentGyms.map((gym) => (
                  <tr key={gym.gym_id}>
                    <td className={saStyles.nameCell}>{gym.gym_name}</td>
                    <td>{gym.city || '-'}</td>
                    <td>
                      <span
                        className={saStyles.statusPill}
                        style={{ backgroundColor: gym.is_active ? '#10b981' : '#ef4444' }}
                      >
                        {gym.is_active ? 'Operativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td>{gym.admin_count}</td>
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
