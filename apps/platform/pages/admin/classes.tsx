export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import toast from 'react-hot-toast';
import { classesAPI, authAPI, gymsAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
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

      const { data: gymsData } = await gymsAPI.listMyGyms();
      if (gymsData && gymsData.length > 0) {
        setGyms(gymsData);
        setSelectedGym(gymsData[0].id);
      }
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
      setLoading(true);
      const { data, error } = await classesAPI.list(selectedGymId);

      if (error) {
        console.error('Error al cargar clases:', error);
        toast.error('Error al cargar clases: ' + error);
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

  if (loading) return <div className={styles.container}>Cargando...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Clases</h1>
        <button
          onClick={() => router.push('/admin/classes/new')}
          className={styles.primaryBtn}
        >
          + Crear Clase
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Horario</th>
                <th>Capacidad</th>
                <th>Inscritos</th>
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
                    <td>{cls.time_start} - {cls.time_end}</td>
                    <td>{cls.capacity}</td>
                    <td>{cls.enrolled}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => router.push(`/admin/classes/${cls.id}/edit`)}
                          className={styles.btnSmall}
                          style={{ backgroundColor: '#3b82f6' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de que deseas eliminar esta clase?')) {
                              // TODO: Implement delete
                              toast.loading('Eliminando clase...');
                            }
                          }}
                          className={styles.btnSmall}
                          style={{ backgroundColor: '#ef4444' }}
                        >
                          Eliminar
                        </button>
                      </div>
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
