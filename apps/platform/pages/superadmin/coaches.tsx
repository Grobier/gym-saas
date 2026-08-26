export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import {
  authAPI,
  convertSupabaseUser,
  superadminAPI,
  SuperAdminGymMember,
} from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import saStyles from '../../styles/superadmin.module.css';

interface CoachRow extends SuperAdminGymMember {
  gym_name: string;
  city: string;
}

export default function SuperAdminCoachesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);

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

      const memberResponses = await Promise.all(
        (overview || []).map(async (gym) => {
          const membersResponse = await superadminAPI.getGymMembers(gym.gym_id);
          return { gym, membersResponse };
        })
      );

      const nextCoaches: CoachRow[] = [];
      memberResponses.forEach(({ gym, membersResponse }) => {
        if (membersResponse.error || !membersResponse.data) return;
        membersResponse.data
          .filter((member) => member.role === 'coach')
          .forEach((member) => {
            nextCoaches.push({
              ...member,
              gym_name: gym.gym_name,
              city: gym.city,
            });
          });
      });

      setCoaches(nextCoaches);
    } catch (runtimeError: any) {
      console.error('Superadmin coaches error:', runtimeError);
      toast.error(runtimeError?.message || 'Error al cargar coaches');
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
          <div className={saStyles.emptyState}>Cargando coaches...</div>
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
            <span className={saStyles.eyebrow}>People Control</span>
            <h1 className={saStyles.title}>Coaches</h1>
            <p className={saStyles.subtitle}>
              Red completa de entrenadores asignados por sede y su estado operativo.
            </p>
          </div>
        </section>
        <section className={saStyles.section}>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Correo</th>
                  <th>Gimnasio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach, index) => (
                  <tr key={`${coach.user_id || coach.email}-${index}`}>
                    <td className={saStyles.nameCell}>{coach.display_name}</td>
                    <td>{coach.email || '-'}</td>
                    <td>
                      <div>{coach.gym_name}</div>
                      <div className={saStyles.microCopy}>{coach.city || 'Sin ciudad'}</div>
                    </td>
                    <td>
                      <span
                        className={saStyles.statusPill}
                        style={{ backgroundColor: coach.status === 'blocked' ? '#ef4444' : '#10b981' }}
                      >
                        {coach.status}
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
