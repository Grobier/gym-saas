export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, paymentsAPI, convertSupabaseUser, Payment } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
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
