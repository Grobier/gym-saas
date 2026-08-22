export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, classesAPI, reservationsAPI, convertSupabaseUser } from '../../lib/supabase-api';
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
  enrolled?: number;
}

interface ClassWithReservation extends Class {
  isReserved: boolean;
  reservationId?: string;
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassWithReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingClassId, setReservingClassId] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (selectedGymId && user) {
      loadClasses();
    }
  }, [selectedGymId, user]);

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
        const convertedUser = convertSupabaseUser(data.user);
        setUser(convertedUser);

        // Load gyms for student
        const { data: gymsData } = await classesAPI.list(''); // Will be filtered by RLS
        if (gymsData && gymsData.length > 0) {
          // Use first gym or stored selection
          const gymId = localStorage.getItem('activeGymId') || gymsData[0].gym_id;
          setSelectedGym(gymId);
        }
      }
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    if (!selectedGymId || !user) return;

    try {
      // Get all classes for the gym
      const { data: classesData, error: classesError } = await classesAPI.list(selectedGymId);

      if (classesError) {
        throw classesError;
      }

      if (!classesData) {
        setClasses([]);
        return;
      }

      // Get user's reservations
      const { data: reservationsData } = await reservationsAPI.getStudentReservations(user.id);

      // Build classes list with reservation status
      const classesWithReservation: ClassWithReservation[] = (classesData || []).map((cls: Class) => {
        const reservation = reservationsData?.find((r: any) => r.class_id === cls.id);
        return {
          ...cls,
          isReserved: !!reservation,
          reservationId: reservation?.id,
        };
      });

      // Filter to future classes only
      const futureClasses = classesWithReservation.filter((cls) => {
        const classDate = new Date(cls.scheduled_date);
        return classDate >= new Date();
      });

      setClasses(futureClasses);
    } catch (error: any) {
      console.error('Error al cargar clases:', error);
      toast.error('Error al cargar clases');
    }
  };

  const handleReserve = async (classId: string, isReserved: boolean) => {
    if (!user) return;

    setReservingClassId(classId);

    try {
      if (isReserved) {
        // Cancel reservation
        const classItem = classes.find((c) => c.id === classId);
        if (!classItem?.reservationId) {
          throw new Error('No se encontró la reservación');
        }

        const { error } = await reservationsAPI.cancelReservation(classId, user.id);
        if (error) throw error;

        setClasses((prev) =>
          prev.map((c) =>
            c.id === classId
              ? { ...c, isReserved: false, reservationId: undefined }
              : c
          )
        );
        toast.success('Reservación cancelada');
      } else {
        // Create reservation
        const { error } = await reservationsAPI.createReservation(classId, user.id);
        if (error) {
          if (error.message?.includes('unique')) {
            throw new Error('Ya tienes una reservación en esta clase');
          }
          throw error;
        }

        setClasses((prev) =>
          prev.map((c) =>
            c.id === classId
              ? { ...c, isReserved: true }
              : c
          )
        );
        toast.success('¡Reservación confirmada!');
      }

      // Refresh data
      await loadClasses();
    } catch (error: any) {
      console.error('Error al reservar:', error);
      toast.error(error.message || 'Error al procesar reservación');
    } finally {
      setReservingClassId(null);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Clases Disponibles</h1>
      </header>

      <main className={styles.main}>
        {classes.length === 0 ? (
          <div className={styles.empty}>
            <p>No hay clases disponibles</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {classes.map((cls) => (
              <div
                key={cls.id}
                style={{
                  padding: '1.5rem',
                  border: cls.isReserved ? '2px solid #10b981' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: cls.isReserved ? '#f0fdf4' : '#fafafa',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {/* Encabezado */}
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>
                    {cls.name || 'Clase'}
                  </h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {cls.discipline_id}
                  </p>
                </div>

                {/* Fecha y hora */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      FECHA
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      {format(new Date(cls.scheduled_date), 'EEE, dd MMM')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      HORARIO
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      {cls.time_start} - {cls.time_end}
                    </div>
                  </div>
                </div>

                {/* Capacidad */}
                <div>
                  <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    CAPACIDAD
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {cls.enrolled || 0}/{cls.capacity}
                    </span>
                    {' '}
                    <span style={{ color: '#666' }}>
                      {cls.capacity - (cls.enrolled || 0)} disponibles
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      height: '6px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: cls.isReserved ? '#10b981' : '#3b82f6',
                        width: `${((cls.enrolled || 0) / cls.capacity) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Estado y botón */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                  {cls.isReserved && (
                    <div
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#d1fae5',
                        borderRadius: '4px',
                        marginBottom: '0.75rem',
                        color: '#059669',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      ✓ YA TIENES RESERVACIÓN
                    </div>
                  )}
                  <button
                    onClick={() => handleReserve(cls.id, cls.isReserved)}
                    disabled={reservingClassId === cls.id}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: cls.isReserved ? '#ef4444' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: reservingClassId === cls.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      opacity: reservingClassId === cls.id ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      if (reservingClassId !== cls.id) {
                        e.currentTarget.style.opacity = '0.9';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {reservingClassId === cls.id
                      ? 'Procesando...'
                      : cls.isReserved
                      ? 'Cancelar Reservación'
                      : 'Reservar Ahora'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
