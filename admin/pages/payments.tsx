import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, paymentsAPI } from '../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../lib/store';
import toast from 'react-hot-toast';
import styles from '../styles/payments.module.css';

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'pending_validation';
  paymentMethod: string;
  createdAt: string;
  completedAt?: string;
  transferProofUrl?: string;
}

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
      return;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      setUser(data.user);
    } catch {
      router.push('/login');
    }
  };

  const fetchPayments = async () => {
    if (!selectedGymId) return;

    try {
      const { data } = await paymentsAPI.list(selectedGymId, { status: statusFilter });
      setPayments(data);
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransfer = async (paymentId: string) => {
    try {
      const { data } = await paymentsAPI.validateTransfer(
        selectedGymId!,
        paymentId,
        true
      );
      setPayments(
        payments.map((p) => (p.id === paymentId ? { ...p, status: 'completed' } : p))
      );
      toast.success('Transfer approved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectTransfer = async (paymentId: string) => {
    try {
      await paymentsAPI.validateTransfer(selectedGymId!, paymentId, false);
      setPayments(payments.map((p) => (p.id === paymentId ? { ...p, status: 'failed' } : p)));
      toast.success('Transfer rejected');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return styles.completed;
      case 'pending':
      case 'pending_validation':
        return styles.pending;
      case 'failed':
        return styles.failed;
      default:
        return '';
    }
  };

  const filteredPayments =
    statusFilter === 'all'
      ? payments
      : payments.filter((p) => p.status === statusFilter);

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === 'completed').length,
    pending: payments.filter((p) => p.status === 'pending' || p.status === 'pending_validation')
      .length,
    failed: payments.filter((p) => p.status === 'failed').length,
    revenue: payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Payments</h1>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Revenue</h3>
          <p className={styles.statValue}>${(stats.revenue / 1000).toFixed(1)}k</p>
          <span>{stats.completed} completed</span>
        </div>

        <div className={styles.statCard}>
          <h3>Pending</h3>
          <p className={styles.statValue}>{stats.pending}</p>
          <span>Needs attention</span>
        </div>

        <div className={styles.statCard}>
          <h3>Failed</h3>
          <p className={styles.statValue}>{stats.failed}</p>
          <span>Review required</span>
        </div>
      </div>

      <div className={styles.filters}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">All Payments</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="pending_validation">Pending Validation</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.studentName}</td>
                  <td className={styles.amount}>
                    ${payment.amount.toFixed(0)} {payment.currency}
                  </td>
                  <td>{payment.paymentMethod.toUpperCase()}</td>
                  <td>
                    <span className={`${styles.status} ${getStatusColor(payment.status)}`}>
                      {payment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>{format(new Date(payment.createdAt), 'MMM dd, yyyy')}</td>
                  <td>
                    {payment.status === 'pending_validation' && (
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleApproveTransfer(payment.id)}
                          className={styles.btnSuccess}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectTransfer(payment.id)}
                          className={styles.btnDanger}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {payment.status === 'pending' && (
                      <button
                        onClick={() => router.push(`/payments/${payment.id}`)}
                        className={styles.btnSmall}
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
