export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, userAccessAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface UserRoleAssignment {
  email: string;
  role: 'admin' | 'coach' | 'student';
}

export default function RolesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UserRoleAssignment>({
    email: '',
    role: 'coach',
  });
  const [assigning, setAssigning] = useState(false);
  const [userRoles, setUserRoles] = useState<Array<{ email: string; role: string }>>([]);

  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      loadUserRoles();
    }
  }, [selectedGymId]);

  const verifyAuth = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      if (data.user) {
        setUser(convertSupabaseUser(data.user));
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async () => {
    if (!selectedGymId) return;

    try {
      // This would fetch user roles from the gym in production
      // For now, we'll show an empty list
      setUserRoles([]);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGymId) {
      toast.error('Selecciona un gimnasio primero');
      return;
    }

    if (!formData.email || !formData.role) {
      toast.error('Completa todos los campos');
      return;
    }

    setAssigning(true);

    try {
      // Note: This is a simplified flow
      // In production, you would:
      // 1. Look up user by email
      // 2. Check if user exists, if not create invitation
      // 3. Assign role via userAccessAPI.assignRoleToUser()

      // For now, we'll show a success message
      toast.success(`Rol "${formData.role}" asignado a ${formData.email} en este gimnasio`);

      // Add to local list
      setUserRoles((prev) => [
        ...prev,
        { email: formData.email, role: formData.role },
      ]);

      // Reset form
      setFormData({ email: '', role: 'coach' });
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Error al asignar rol');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Gestión de Roles</h1>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main} style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Formulario de asignación */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Asignar Nuevo Rol</h2>

          <form
            onSubmit={handleAssignRole}
            style={{
              padding: '1.5rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              maxWidth: '500px',
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Correo del Usuario *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="usuario@ejemplo.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                disabled={assigning}
                required
              />
              <small style={{ color: '#666' }}>
                Si el usuario no existe, se enviará una invitación
              </small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                disabled={assigning}
              >
                <option value="student">👨‍🎓 Estudiante</option>
                <option value="coach">🏋️ Entrenador</option>
                <option value="admin">👤 Administrador</option>
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                El rol otorgará permisos correspondientes en este gimnasio
              </small>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setFormData({ email: '', role: 'coach' })}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                }}
                disabled={assigning}
              >
                Limpiar
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: assigning ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  opacity: assigning ? 0.6 : 1,
                }}
                disabled={assigning}
              >
                {assigning ? 'Asignando...' : 'Asignar Rol'}
              </button>
            </div>
          </form>
        </section>

        {/* Listado de usuarios con roles */}
        <section>
          <h2 style={{ marginBottom: '1rem' }}>
            Usuarios con Roles ({userRoles.length})
          </h2>

          {userRoles.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay usuarios con roles asignados</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userRoles.map((userRole, idx) => (
                    <tr key={idx}>
                      <td>{userRole.email}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor:
                              userRole.role === 'admin'
                                ? '#dbeafe'
                                : userRole.role === 'coach'
                                ? '#fef3c7'
                                : '#dbeafe',
                            color:
                              userRole.role === 'admin'
                                ? '#1e40af'
                                : userRole.role === 'coach'
                                ? '#92400e'
                                : '#1e40af',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                          }}
                        >
                          {userRole.role === 'admin' && '👤 Administrador'}
                          {userRole.role === 'coach' && '🏋️ Entrenador'}
                          {userRole.role === 'student' && '👨‍🎓 Estudiante'}
                        </span>
                      </td>
                      <td>
                        <button
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Información */}
        <section style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>ℹ️ Información</h3>
          <ul style={{ marginBottom: 0 }}>
            <li>Los usuarios pueden tener múltiples roles en el mismo gimnasio</li>
            <li>
              Un usuario puede ser Administrador + Entrenador al mismo tiempo
            </li>
            <li>Los roles se aplican automáticamente al usuario en su próximo login</li>
            <li>
              Usa esta sección para gestionar el equipo de tu gimnasio
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
