export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, classesAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface Class {
  id: string;
  name: string;
  discipline_id: string;
  scheduled_date: string;
  time_start: string;
  time_end: string;
  capacity: number;
  enrolled: number;
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      loadClasses();
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

      // TODO: Load only gyms where student is enrolled
    } catch (error) {
      console.error('Error de autenticación:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    if (!selectedGymId) return;

    try {
      const { data, error } = await classesAPI.list(selectedGymId);

      if (error) {
        console.error('Error al cargar clases:', error);
        toast.error('Error al cargar clases');
        setClasses([]);
        return;
      }

      setClasses(data || []);
    } catch (error: any) {
      console.error('Error cargando clases:', error);
      toast.error('Error al cargar las clases');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = (classId: string) => {
    toast.success('Reserva realizada');
    // TODO: Implement reserve class logic
  };

  if (loading) return <div className={styles.container}>Cargando...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Clases Disponibles</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Disponibilidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No hay clases disponibles
                  </td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.id}>
                    <td className={styles.name}>{cls.name}</td>
                    <td>{cls.scheduled_date}</td>
                    <td>
                      {cls.time_start} - {cls.time_end}
                    </td>
                    <td>
                      {cls.enrolled < cls.capacity ? (
                        <span className={styles.status} style={{backgroundColor: '#10b981'}}>
                          Disponible
                        </span>
                      ) : (
                        <span className={styles.status} style={{backgroundColor: '#ef4444'}}>
                          Lleno
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleReserve(cls.id)}
                        className={styles.btnSmall}
                        disabled={cls.enrolled >= cls.capacity}
                      >
                        Reservar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
