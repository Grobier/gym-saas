export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, classesAPI, reservationsAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface Booking {
  reservationId: string;
  classId: string;
  className: string;
  discipline: string;
  scheduled_date: string;
  time_start: string;
  time_end: string;
  status: 'active' | 'cancelled';
  reservedAt: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

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
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!user) return;

    try {
      // Get all user's reservations
      const { data: reservationsData, error: resError } = await reservationsAPI.getStudentReservations(user.id);

      if (resError) {
        throw resError;
      }

      if (!reservationsData || reservationsData.length === 0) {
        setBookings([]);
        return;
      }

      // For each reservation, get class details
      const bookingsData: Booking[] = [];

      for (const reservation of reservationsData) {
        try {
          const { data: classData } = await classesAPI.getWithRoster(reservation.class_id);

          if (classData) {
            bookingsData.push({
              reservationId: reservation.id,
              classId: reservation.class_id,
              className: classData.name || 'Clase sin nombre',
              discipline: classData.discipline_id || '',
              scheduled_date: classData.scheduled_date || '',
              time_start: classData.time_start || '',
              time_end: classData.time_end || '',
              status: reservation.status,
              reservedAt: reservation.created_at,
            });
          }
        } catch (error) {
          console.error(`Error loading class ${reservation.class_id}:`, error);
        }
      }

      // Sort by date
      bookingsData.sort(
        (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      );

      setBookings(bookingsData);
    } catch (error: any) {
      console.error('Error al cargar reservaciones:', error);
      toast.error('Error al cargar tus reservaciones');
    }
  };

  const handleCancelReservation = async (classId: string, reservationId: string) => {
    if (!user) return;

    if (!window.confirm('¿Estás seguro de que deseas cancelar esta reservación?')) {
      return;
    }

    setCancellingId(reservationId);

    try {
      const { error } = await reservationsAPI.cancelReservation(classId, user.id);

      if (error) {
        throw error;
      }

      setBookings((prev) => prev.filter((b) => b.reservationId !== reservationId));
      toast.success('Reservación cancelada');
    } catch (error: any) {
      console.error('Error al cancelar:', error);
      toast.error(error.message || 'Error al cancelar reservación');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  const upcomingBookings = bookings.filter((b) => {
    const classDate = new Date(b.scheduled_date);
    return classDate >= new Date() && b.status === 'active';
  });

  const pastBookings = bookings.filter((b) => {
    const classDate = new Date(b.scheduled_date);
    return classDate < new Date();
  });

  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Mis Reservaciones</h1>
      </header>

      <main className={styles.main}>
        {bookings.length === 0 ? (
          <div className={styles.empty}>
            <p>No tienes reservaciones aún</p>
            <button
              onClick={() => router.push('/student/classes')}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 'bold',
              }}
            >
              Ver Clases Disponibles
            </button>
          </div>
        ) : (
          <>
            {/* Próximas clases */}
            {upcomingBookings.length > 0 && (
              <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                  Próximas Clases ({upcomingBookings.length})
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem',
                  }}
                >
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.reservationId}
                      style={{
                        padding: '1.5rem',
                        border: '2px solid #10b981',
                        borderRadius: '8px',
                        backgroundColor: '#f0fdf4',
                      }}
                    >
                      <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>
                        {booking.className}
                      </h3>
                      <p
                        style={{
                          margin: '0 0 1rem 0',
                          color: '#666',
                          fontSize: '0.9rem',
                        }}
                      >
                        {booking.discipline}
                      </p>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '1rem',
                          marginBottom: '1rem',
                          fontSize: '0.9rem',
                        }}
                      >
                        <div>
                          <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                            FECHA
                          </div>
                          <div style={{ fontWeight: 'bold' }}>
                            {format(new Date(booking.scheduled_date), 'EEE, dd MMM')}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#999', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                            HORARIO
                          </div>
                          <div style={{ fontWeight: 'bold' }}>
                            {booking.time_start} - {booking.time_end}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelReservation(booking.classId, booking.reservationId)}
                        disabled={cancellingId === booking.reservationId}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor:
                            cancellingId === booking.reservationId
                              ? 'not-allowed'
                              : 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          opacity:
                            cancellingId === booking.reservationId ? 0.6 : 1,
                        }}
                      >
                        {cancellingId === booking.reservationId
                          ? 'Cancelando...'
                          : 'Cancelar Reservación'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Clases pasadas */}
            {pastBookings.length > 0 && (
              <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#999' }}>
                  Clases Pasadas ({pastBookings.length})
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem',
                  }}
                >
                  {pastBookings.map((booking) => (
                    <div
                      key={booking.reservationId}
                      style={{
                        padding: '1.5rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: '#f9fafb',
                        opacity: 0.7,
                      }}
                    >
                      <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#999' }}>
                        {booking.className}
                      </h3>
                      <p
                        style={{
                          margin: '0',
                          color: '#999',
                          fontSize: '0.9rem',
                        }}
                      >
                        {format(new Date(booking.scheduled_date), 'EEE, dd MMM')} •{' '}
                        {booking.time_start}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reservaciones canceladas */}
            {cancelledBookings.length > 0 && (
              <section>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#999' }}>
                  Canceladas ({cancelledBookings.length})
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem',
                  }}
                >
                  {cancelledBookings.map((booking) => (
                    <div
                      key={booking.reservationId}
                      style={{
                        padding: '1.5rem',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        backgroundColor: '#fef2f2',
                        opacity: 0.7,
                      }}
                    >
                      <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#dc2626' }}>
                        {booking.className}
                      </h3>
                      <p
                        style={{
                          margin: '0',
                          color: '#dc2626',
                          fontSize: '0.9rem',
                        }}
                      >
                        Cancelada • {format(new Date(booking.scheduled_date), 'EEE, dd MMM')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
