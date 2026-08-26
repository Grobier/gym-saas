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

interface StudentRow extends SuperAdminGymMember {
  gym_name: string;
  city: string;
}

export default function SuperAdminStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);

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

      const nextStudents: StudentRow[] = [];
      memberResponses.forEach(({ gym, membersResponse }) => {
        if (membersResponse.error || !membersResponse.data) return;
        membersResponse.data
          .filter((member) => member.role === 'student')
          .forEach((member) => {
            nextStudents.push({
              ...member,
              gym_name: gym.gym_name,
              city: gym.city,
            });
          });
      });

      setStudents(nextStudents);
    } catch (runtimeError: any) {
      console.error('Superadmin students error:', runtimeError);
      toast.error(runtimeError?.message || 'Error al cargar alumnos');
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
          <div className={saStyles.emptyState}>Cargando alumnos...</div>
        </div>
      </div>
    );
  }

  const withoutAccount = students.filter((student) => student.status === 'without-account').length;

  return (
    <div className={saStyles.shell}>
      <Sidebar role="superadmin" userName={user?.name || user?.email} onLogout={handleLogout} />
      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Student Network</span>
            <h1 className={saStyles.title}>Alumnos</h1>
            <p className={saStyles.subtitle}>
              Visión transversal de estudiantes por sede, con foco en cuentas pendientes o acceso bloqueado.
            </p>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total Alumnos</p>
              <p className={saStyles.metricValue}>{students.length}</p>
              <div className={saStyles.metricHint}>Base total consolidada</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Sin Cuenta</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>{withoutAccount}</p>
              <div className={saStyles.metricHint}>Requieren activación</div>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Correo</th>
                  <th>Gimnasio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={`${student.user_id || student.email}-${index}`}>
                    <td className={saStyles.nameCell}>{student.display_name}</td>
                    <td>{student.email || '-'}</td>
                    <td>
                      <div>{student.gym_name}</div>
                      <div className={saStyles.microCopy}>{student.city || 'Sin ciudad'}</div>
                    </td>
                    <td>
                      <span
                        className={saStyles.statusPill}
                        style={{
                          backgroundColor:
                            student.status === 'blocked'
                              ? '#ef4444'
                              : student.status === 'without-account'
                                ? '#f59e0b'
                                : '#10b981',
                        }}
                      >
                        {student.status}
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
