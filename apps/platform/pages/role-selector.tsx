import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { useAuthStore, getAvailableRolesInGym } from '../lib/store';
import { authAPI, convertSupabaseUser, gymsAPI } from '../lib/supabase-api';
import styles from '../styles/dashboard.module.css';

interface GymWithRoles {
  gym: {
    id: string;
    name: string;
    city: string;
  };
  roles: string[];
}

export default function RoleSelectorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gymsWithRoles, setGymsWithRoles] = useState<GymWithRoles[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const user = useAuthStore((state) => state.user);
  const availableRoles = useAuthStore((state) => state.availableRoles);
  const setActiveGym = useAuthStore((state) => state.setActiveGym);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);

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
      const { data: authData } = await authAPI.getCurrentUser();
      if (authData.user) {
        const currentUser = convertSupabaseUser(authData.user);
        setIsSuperadmin(currentUser.role === 'superadmin');
      }

      // Get all gyms
      const { data: gymsData } = await gymsAPI.listAll();
      if (!gymsData) {
        setLoading(false);
        return;
      }

      // Build gyms with roles
      const gymsRoles: GymWithRoles[] = gymsData
        .map((gym) => {
          const roles = getAvailableRolesInGym(availableRoles, gym.id);
          return { gym, roles };
        })
        .filter((item) => item.roles.length > 0);

      setGymsWithRoles(gymsRoles);
    } catch (error) {
      console.error('Error loading gyms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (gymId: string, role: string) => {
    setActiveGym(gymId);
    setActiveRole(role);

    if (role === 'superadmin') {
      router.push('/superadmin');
    } else if (role === 'admin') {
      router.push('/admin');
    } else if (role === 'coach') {
      router.push('/coach');
    } else if (role === 'student') {
      router.push('/student');
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Selecciona tu Contexto</h1>
        <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
          {user?.name} ({user?.email})
        </p>
      </header>

      <main className={styles.main} style={{ maxWidth: '600px', margin: '0 auto' }}>
        {isSuperadmin && (
          <div
            style={{
              padding: '1.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fafafa',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Plataforma</h2>
            <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.9rem' }}>
              Acceso global al panel de superadministración
            </p>
            <button
              onClick={() => router.push('/superadmin')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            >
              👑 Super Admin
            </button>
          </div>
        )}

        {gymsWithRoles.length === 0 && !isSuperadmin ? (
          <div className={styles.empty}>
            <p>No tienes roles asignados en ningún gimnasio</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {gymsWithRoles.map((item) => (
              <div
                key={item.gym.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                }}
              >
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                  {item.gym.name}
                </h2>
                <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.9rem' }}>
                  {item.gym.city}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {item.roles.map((role) => (
                    <button
                      key={`${item.gym.id}-${role}`}
                      onClick={() => handleSelectRole(item.gym.id, role)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = '#0056b3')
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = '#007bff')
                      }
                    >
                      {role === 'superadmin' && '👑 Super Admin'}
                      {role === 'admin' && '👤 Administrador'}
                      {role === 'coach' && '🏋️ Entrenador'}
                      {role === 'student' && '📚 Estudiante'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
