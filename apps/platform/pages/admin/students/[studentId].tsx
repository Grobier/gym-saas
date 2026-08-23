export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, studentsAPI, convertSupabaseUser, reservationsAPI, paymentsAPI } from '../../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../../styles/dashboard.module.css';

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

interface ClassReservation {
  class_id: string;
  class_name: string;
  scheduled_date: string;
  time_start: string;
  time_end: string;
  status: string;
}

interface StudentPayment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const { studentId } = router.query;
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [payments, setPayments] = useState<StudentPayment[]>([]);

  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (studentId && selectedGymId) {
      loadStudentData();
    }
  }, [studentId, selectedGymId]);

  const verifyAuth = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      if (data.user) {
        setUser(convertSupabaseUser(data.user));
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const loadStudentData = async () => {
    if (!selectedGymId) return;

    try {
      // In production, you would fetch student details from API
      // For now, we'll create a mock structure
      setStudent({
        id: studentId as string,
        name: 'Estudiante Ejemplo',
        email: 'estudiante@ejemplo.com',
        phone: '+56912345678',
        created_at: new Date().toISOString(),
      });

      // Load reservations
      const { data: reservationsData } = await reservationsAPI.getStudentReservations(studentId as string);
      if (reservationsData) {
        setReservations(
          reservationsData.map((r: any) => ({
            class_id: r.class_id,
            class_name: 'Clase Ejemplo',
            scheduled_date: new Date().toISOString(),
            time_start: '10:00',
            time_end: '11:00',
            status: r.status,
          }))
        );
      }

      // Load payments (would be filtered by student in production)
      const { data: paymentsData } = await paymentsAPI.listByGymId(selectedGymId);
      if (paymentsData) {
        setPayments(paymentsData as StudentPayment[]);
      }
    } catch (error: any) {
      console.error('Error loading student data:', error);
      toast.error('Error al cargar datos del estudiante');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  if (!student) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>Estudiante no encontrado</p>
        </div>
      </div>
    );
  }

  const activeReservations = reservations.filter((r) => r.status === 'active');
  const totalSpent = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Detalle del Estudiante</h1>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main} style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Información del Estudiante */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Información Personal</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                NOMBRE
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{student.name}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                CORREO
              </div>
              <div style={{ fontSize: '1rem' }}>{student.email}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                TELÉFONO
              </div>
              <div style={{ fontSize: '1rem' }}>{student.phone || '-'}</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                MIEMBRO DESDE
              </div>
              <div style={{ fontSize: '1rem' }}>
                {format(new Date(student.created_at), 'dd MMM, yyyy')}
              </div>
            </div>
          </div>
        </section>

        {/* Estadísticas */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Estadísticas</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                Reservas Activas
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                {activeReservations.length}
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                Clases Totales
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0369a1' }}>
                {reservations.length}
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                Pagos Completados
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                ${totalSpent.toFixed(0)}
              </div>
            </div>
          </div>
        </section>

        {/* Reservas Activas */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Reservas Activas ({activeReservations.length})</h2>

          {activeReservations.length === 0 ? (
            <div className={styles.empty}>
              <p>Sin reservas activas</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1rem',
              }}
            >
              {activeReservations.map((res) => (
                <div
                  key={res.class_id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>{res.class_name}</h4>
                  <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                    📅 {format(new Date(res.scheduled_date), 'dd MMM')} · {res.time_start} - {res.time_end}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Historial de Pagos */}
        <section>
          <h2 style={{ marginBottom: '1rem' }}>Historial de Pagos ({payments.length})</h2>

          {payments.length === 0 ? (
            <div className={styles.empty}>
              <p>Sin pagos registrados</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Monto</th>
                    <th>Moneda</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.id.substring(0, 8)}...</td>
                      <td>${payment.amount.toFixed(0)}</td>
                      <td>{payment.currency}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            backgroundColor:
                              payment.status === 'completed'
                                ? '#d1fae5'
                                : payment.status === 'pending'
                                ? '#fef3c7'
                                : '#fee2e2',
                            color:
                              payment.status === 'completed'
                                ? '#059669'
                                : payment.status === 'pending'
                                ? '#92400e'
                                : '#dc2626',
                          }}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{format(new Date(payment.created_at), 'dd MMM, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
