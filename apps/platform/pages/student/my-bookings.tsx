export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface Booking {
  id: string;
  className: string;
  classDate: string;
  classTime: string;
  status: 'active' | 'completed' | 'cancelled';
  bookedAt: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    verifyAuth();
  }, []);

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

      // Load bookings (placeholder)
      setBookings([]);
    } catch (error) {
      console.error('Error de autenticación:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) return;

    try {
      // TODO: Implement cancel booking logic
      setBookings(bookings.filter((b) => b.id !== bookingId));
      toast.success('Reserva cancelada');
    } catch (error: any) {
      toast.error('Error al cancelar reserva');
    }
  };

  if (loading) return <div className={styles.container}>Cargando...</div>;

  const activeBookings = bookings.filter((b) => b.status === 'active');
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Mis Reservas</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <h3>Próximas Clases</h3>
            <p className={styles.metricValue}>{activeBookings.length}</p>
            <span className={styles.metricLabel}>Clases activas</span>
          </div>

          <div className={styles.metricCard}>
            <h3>Clases Completadas</h3>
            <p className={styles.metricValue}>{completedBookings.length}</p>
            <span className={styles.metricLabel}>Total histórico</span>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <h2>Reservas Activas</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Clase</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {activeBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No tienes reservas activas
                  </td>
                </tr>
              ) : (
                activeBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className={styles.name}>{booking.className}</td>
                    <td>{booking.classDate}</td>
                    <td>{booking.classTime}</td>
                    <td>
                      <span className={styles.status} style={{backgroundColor: '#10b981'}}>
                        Confirmada
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className={styles.btnSmall}
                        style={{backgroundColor: '#ef4444'}}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.tableContainer} style={{marginTop: '2rem'}}>
          <h2>Clases Completadas</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Clase</th>
                <th>Fecha</th>
                <th>Horario</th>
              </tr>
            </thead>
            <tbody>
              {completedBookings.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.empty}>
                    No has completado clases aún
                  </td>
                </tr>
              ) : (
                completedBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className={styles.name}>{booking.className}</td>
                    <td>{booking.classDate}</td>
                    <td>{booking.classTime}</td>
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
