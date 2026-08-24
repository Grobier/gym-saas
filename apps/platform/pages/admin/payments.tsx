export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, paymentsAPI, convertSupabaseUser, gymsAPI, Payment } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import Sidebar from '../../components/Sidebar';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      fetchPayments();
    }
  }, [selectedGymId, statusFilter]);

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
      console.error('Error de autenticación:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!selectedGymId) return;

    try {
      const { data } = await paymentsAPI.list(selectedGymId, { status: statusFilter });
      setPayments(data || []);
    } catch (error) {
      toast.error('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePayment = async (paymentId: string, approved: boolean) => {
    if (!selectedGymId) return;

    setValidatingId(paymentId);

    try {
      const { error } = await paymentsAPI.validateTransfer(selectedGymId, paymentId, approved);

      if (error) {
        throw error;
      }

      // Update local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, status: approved ? 'completed' : 'failed' }
            : p
        )
      );

      toast.success(approved ? 'Pago aprobado' : 'Pago rechazado');
    } catch (error: any) {
      console.error('Error validating payment:', error);
      toast.error('Error al procesar pago');
    } finally {
      setValidatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#3b82f6';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const filteredPayments =
    statusFilter === 'all'
      ? payments
      : payments.filter((p) => p.status === statusFilter);

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === 'completed').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    failed: payments.filter((p) => p.status === 'failed').length,
    revenue: payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Pagos</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <h3>Ingresos Totales</h3>
            <p className={styles.metricValue}>${(stats.revenue / 1000).toFixed(1)}k</p>
            <span className={styles.metricLabel}>{stats.completed} completados</span>
          </div>

          <div className={styles.metricCard}>
            <h3>Pendientes</h3>
            <p className={styles.metricValue}>{stats.pending}</p>
            <span className={styles.metricLabel}>Requiere atención</span>
          </div>

          <div className={styles.metricCard + ' ' + styles.warning}>
            <h3>Fallidos</h3>
            <p className={styles.metricValue}>{stats.failed}</p>
            <span className={styles.metricLabel}>Revisión requerida</span>
          </div>
        </div>

        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.select}
          >
            <option value="all">Todos los Pagos</option>
            <option value="completed">Completados</option>
            <option value="pending">Pendientes</option>
            <option value="failed">Fallidos</option>
          </select>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID Pago</th>
                <th>Monto</th>
                <th>Moneda</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No se encontraron pagos
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.id.substring(0, 8)}...</td>
                    <td>${payment.amount.toFixed(0)}</td>
                    <td>{payment.currency}</td>
                    <td>
                      <span
                        className={styles.status}
                        style={{ backgroundColor: getStatusColor(payment.status) }}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{format(new Date(payment.created_at), 'dd MMM, yyyy')}</td>
                    <td>
                      {payment.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleValidatePayment(payment.id, true)}
                            disabled={validatingId === payment.id}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: validatingId === payment.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              opacity: validatingId === payment.id ? 0.6 : 1,
                            }}
                          >
                            {validatingId === payment.id ? 'Procesando...' : 'Aprobar'}
                          </button>
                          <button
                            onClick={() => handleValidatePayment(payment.id, false)}
                            disabled={validatingId === payment.id}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: validatingId === payment.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              opacity: validatingId === payment.id ? 0.6 : 1,
                            }}
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.9rem' }}>
                          Procesado
                        </span>
                      )}
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
