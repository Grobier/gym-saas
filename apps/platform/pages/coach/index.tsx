import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, gymsAPI, classesAPI } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface Class {
  id: string;
  gym_id: string;
  discipline_id?: string;
  scheduled_date?: string;
  time_start?: string;
  time_end?: string;
  capacity?: number;
  status?: string;
  coaches?: string[];
  [key: string]: any;
}

interface ApiError {
  code?: string;
  message?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [classError, setClassError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const gyms = useGymsStore((state) => state.gyms);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      fetchClasses();
    }
  }, [selectedDate, selectedGymId]);

  const bootstrap = async () => {
    console.log('[DASHBOARD] Bootstrap starting...');
    const cookies = parseCookies();
    if (!cookies.authToken) {
      console.log('[DASHBOARD] No auth token, redirecting to login');
      router.push('/login');
      return;
    }

    try {
      console.log('[DASHBOARD] Getting current user...');
      const { data: userData, error: userError } = await authAPI.getCurrentUser();

      if (userError) {
        console.error('[DASHBOARD] User error:', userError);
        throw new Error(`Auth error: ${userError}`);
      }

      setUser(userData?.user || null);
      console.log('[DASHBOARD] User set:', userData?.user?.email);

      console.log('[DASHBOARD] Fetching gyms...');
      const { data: gymsData, error: gymsError } = await gymsAPI.listMyGyms();

      if (gymsError) {
        console.error('[DASHBOARD] Gyms error:', gymsError);
        throw new Error(`Gyms error: ${gymsError}`);
      }

      console.log('[DASHBOARD] Gyms loaded:', gymsData?.length || 0);
      setGyms(gymsData || []);

      if (gymsData && gymsData.length > 0) {
        setSelectedGym(gymsData[0].id);
        console.log('[DASHBOARD] Selected gym:', gymsData[0].id);
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Bootstrap error:', error);
      toast.error('Error al cargar el perfil');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!selectedGymId) return;

    try {
      const startDate = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");
      const endDate = format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");

      const { data, error } = await classesAPI.listByCoach(selectedGymId, startDate, endDate);

      if (error) {
        console.error('Error al cargar clases:', error);
        setClassError(error as ApiError);
        setClasses([]);
        toast.error(`Error al cargar clases: ${error.message || 'Error desconocido'}`);
        return;
      }

      setClasses(data || []);
      setClassError(null);
    } catch (error: any) {
      console.error('Excepción al obtener clases:', error);
      setClassError(error);
      setClasses([]);
      toast.error('Error al cargar las clases');
    }
  };

  const handleClassClick = (classId: string) => {
    router.push(`/coach/class/${classId}`);
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
        <h1>Panel del Entrenador</h1>
        <div className={styles.userInfo}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <h3>Mis Gimnasios</h3>
          {gyms.map((gym) => (
            <button
              key={gym.id}
              className={`${styles.gymBtn} ${selectedGymId === gym.id ? styles.active : ''}`}
              onClick={() => setSelectedGym(gym.id)}
            >
              {gym.name}
              <small>{gym.city}</small>
            </button>
          ))}
        </aside>

        <main className={styles.main}>
          <div className={styles.dateNav}>
            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
              ← Anterior
            </button>
            <h2>{format(selectedDate, 'EEEE, dd MMM')}</h2>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              Siguiente →
            </button>
          </div>

          {classError ? (
            <div className={styles.empty}>
              <p style={{ color: '#d32f2f' }}>Error al cargar las clases</p>
              <small>{classError.message || 'Error desconocido'}</small>
            </div>
          ) : classes.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay clases programadas para esta fecha</p>
            </div>
          ) : (
            <div className={styles.classGrid}>
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className={styles.classCard}
                  onClick={() => handleClassClick(cls.id)}
                >
                  <div className={styles.classHeader}>
                    <h3>{cls.id}</h3>
                    {cls.scheduled_date && cls.time_start && cls.time_end && (
                      <span className={styles.time}>
                        {cls.time_start} - {cls.time_end}
                      </span>
                    )}
                  </div>

                  {cls.capacity && (
                    <div className={styles.capacity}>
                      <span>
                        Capacidad: {cls.capacity}
                      </span>
                      <div className={styles.capacityBar}>
                        <div
                          className={styles.capacityFill}
                          style={{
                            width: `0%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button className={styles.actionBtn}>
                    Tomar Asistencia
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
