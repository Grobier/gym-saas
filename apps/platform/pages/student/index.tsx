import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, gymsAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const gyms = useGymsStore((state) => state.gyms);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setLoading(true);

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

      setUser(convertSupabaseUser(userData.user));

      // For now, gyms can be empty for students, or we can fetch their gym associations
      const { data: gymsData } = await gymsAPI.listMyGyms();
      if (gymsData && gymsData.length > 0) {
        setGyms(gymsData);
        setSelectedGym(gymsData[0].id);
      }
    } catch (error: any) {
      console.error('Bootstrap error:', error);
      toast.error('Error al cargar el perfil');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Mi Área de Estudiante</h1>
        <div className={styles.userInfo}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <h3>Mis Clases</h3>
            <p className={styles.metricValue}>0</p>
            <span className={styles.metricLabel}>Esta semana</span>
          </div>

          <div className={styles.metricCard}>
            <h3>Mis Reservas</h3>
            <p className={styles.metricValue}>0</p>
            <span className={styles.metricLabel}>Activas</span>
          </div>

          <div className={styles.metricCard}>
            <h3>Mi Membresía</h3>
            <p className={styles.metricValue}>-</p>
            <span className={styles.metricLabel}>Estado</span>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <h2>Clases Disponibles</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Horario</th>
                <th>Disponibilidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No hay clases disponibles
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
