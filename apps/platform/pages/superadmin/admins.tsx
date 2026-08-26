export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import {
  authAPI,
  convertSupabaseUser,
  superadminAPI,
  SuperAdminGymMember,
  SuperAdminGymOverview,
} from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import saStyles from '../../styles/superadmin.module.css';

interface AdminRow extends SuperAdminGymMember {
  gym_id: string;
  gym_name: string;
  city: string;
}

export default function SuperAdminAdminsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminRow[]>([]);

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

      const gyms = overview || [];
      const memberResponses = await Promise.all(
        gyms.map(async (gym) => {
          const membersResponse = await superadminAPI.getGymMembers(gym.gym_id);
          return { gym, membersResponse };
        })
      );

      const nextAdmins: AdminRow[] = [];

      memberResponses.forEach(({ gym, membersResponse }) => {
        if (membersResponse.error || !membersResponse.data) {
          return;
        }

        membersResponse.data
          .filter((member) => member.role === 'admin')
          .forEach((member) => {
            nextAdmins.push({
              ...member,
              gym_id: gym.gym_id,
              gym_name: gym.gym_name,
              city: gym.city,
            });
          });
      });

      setAdmins(nextAdmins);
    } catch (runtimeError: any) {
      console.error('Superadmin admins error:', runtimeError);
      toast.error(runtimeError?.message || 'Error al cargar administradores');
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
          <div className={saStyles.emptyState}>Cargando administradores...</div>
        </div>
      </div>
    );
  }

  const blockedAdmins = admins.filter((admin) => admin.status === 'blocked').length;

  return (
    <div className={saStyles.shell}>
      <Sidebar role="superadmin" userName={user?.name || user?.email} onLogout={handleLogout} />

      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>People Control</span>
            <h1 className={saStyles.title}>Administradores</h1>
            <p className={saStyles.subtitle}>
              Vista global de responsables por gimnasio para detectar huecos operativos o sedes bloqueadas.
            </p>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total Admins</p>
              <p className={saStyles.metricValue}>{admins.length}</p>
              <div className={saStyles.metricHint}>Cuentas con rol admin</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Bloqueados</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>{blockedAdmins}</p>
              <div className={saStyles.metricHint}>Por bloqueo de sede</div>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Administrador</th>
                  <th>Correo</th>
                  <th>Gimnasio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin, index) => (
                  <tr key={`${admin.user_id || admin.email}-${index}`}>
                    <td className={saStyles.nameCell}>{admin.display_name}</td>
                    <td>{admin.email || '-'}</td>
                    <td>
                      <div>{admin.gym_name}</div>
                      <div className={saStyles.microCopy}>{admin.city || 'Sin ciudad'}</div>
                    </td>
                    <td>
                      <span
                        className={saStyles.statusPill}
                        style={{ backgroundColor: admin.status === 'blocked' ? '#ef4444' : '#10b981' }}
                      >
                        {admin.status}
                      </span>
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
