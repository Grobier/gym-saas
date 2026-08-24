export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, studentsAPI, classesAPI, paymentsAPI, convertSupabaseUser, gymsAPI } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import Sidebar from '../../components/Sidebar';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface ReportStats {
  totalStudents: number;
  totalClasses: number;
  totalRevenue: number;
  totalPayments: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [stats, setStats] = useState<ReportStats>({
    totalStudents: 0,
    totalClasses: 0,
    totalRevenue: 0,
    totalPayments: 0,
  });

  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const gyms = useGymsStore((state) => state.gyms);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    verifyAuth();
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  useEffect(() => {
    if (selectedGymId) {
      loadStats();
    }
  }, [selectedGymId, dateRange]);

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
      console.error('Auth verification failed:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!selectedGymId) return;

    try {
      const { data: students } = await studentsAPI.list(selectedGymId);
      const { data: classes } = await classesAPI.list(selectedGymId);
      const { data: payments } = await paymentsAPI.listByGymId(selectedGymId);

      const revenue = (payments || [])
        .filter((p: any) => p.status === 'completed')
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      setStats({
        totalStudents: students?.length || 0,
        totalClasses: classes?.length || 0,
        totalRevenue: revenue,
        totalPayments: payments?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error al cargar estadísticas');
    }
  };

  const exportToCSV = async (reportType: 'students' | 'classes' | 'payments') => {
    if (!selectedGymId) return;

    setExporting(reportType);

    try {
      let data: any[] = [];
      let headers: string[] = [];
      let filename = '';

      if (reportType === 'students') {
        const { data: students } = await studentsAPI.list(selectedGymId);
        data = students || [];
        headers = ['ID', 'Nombre', 'Correo', 'Teléfono', 'Fecha Inscripción'];
        filename = `estudiantes-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (reportType === 'classes') {
        const { data: classes } = await classesAPI.list(selectedGymId);
        data = classes || [];
        headers = ['ID', 'Nombre', 'Disciplina', 'Fecha', 'Hora Inicio', 'Hora Término', 'Capacidad', 'Inscritos'];
        filename = `clases-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (reportType === 'payments') {
        const { data: payments } = await paymentsAPI.listByGymId(selectedGymId);
        data = payments || [];
        headers = ['ID Pago', 'Monto', 'Moneda', 'Estado', 'Fecha'];
        filename = `pagos-${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Build CSV content
      let csvContent = headers.join(',') + '\n';

      data.forEach((row: any) => {
        let values: any[] = [];

        if (reportType === 'students') {
          values = [
            row.id,
            row.user?.name || '',
            row.user?.email || '',
            row.phone || '',
            new Date(row.createdAt).toLocaleDateString('es-CL'),
          ];
        } else if (reportType === 'classes') {
          values = [
            row.id,
            row.name,
            row.discipline_id,
            row.scheduled_date,
            row.time_start,
            row.time_end,
            row.capacity,
            row.enrolled || 0,
          ];
        } else if (reportType === 'payments') {
          values = [
            row.id,
            row.amount,
            row.currency,
            row.status,
            new Date(row.created_at).toLocaleDateString('es-CL'),
          ];
        }

        // Escape CSV values
        const csvRow = values.map((val) => {
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        });

        csvContent += csvRow.join(',') + '\n';
      });

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Reporte de ${reportType} exportado`);
    } catch (error: any) {
      console.error('Error exporting report:', error);
      toast.error('Error al exportar reporte');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        role="admin"
        gyms={gyms}
        selectedGymId={selectedGymId}
        onSelectGym={setSelectedGym}
        userName={user?.name}
        onLogout={handleLogout}
      />
      <div className={styles.container}>
      <header className={styles.header}>
        <h1>Reportes</h1>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main}>
        {/* Filtro de fechas */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Período de Reporte</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1.5rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
            }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Desde
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Hasta
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </section>

        {/* Estadísticas rápidas */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Estadísticas</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Estudiantes Totales</h3>
              <p className={styles.metricValue}>{stats.totalStudents}</p>
            </div>

            <div className={styles.metricCard}>
              <h3>Clases Totales</h3>
              <p className={styles.metricValue}>{stats.totalClasses}</p>
            </div>

            <div className={styles.metricCard}>
              <h3>Ingresos Totales</h3>
              <p className={styles.metricValue}>${(stats.totalRevenue / 1000).toFixed(1)}k</p>
            </div>

            <div className={styles.metricCard}>
              <h3>Transacciones</h3>
              <p className={styles.metricValue}>{stats.totalPayments}</p>
            </div>
          </div>
        </section>

        {/* Reportes disponibles */}
        <section>
          <h2 style={{ marginBottom: '1rem' }}>Exportar Reportes</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Reporte Estudiantes */}
            <div
              style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>📚 Reporte de Estudiantes</h3>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Lista completa de estudiantes registrados en el gimnasio
              </p>
              <button
                onClick={() => exportToCSV('students')}
                disabled={exporting !== null}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: exporting === 'students' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: exporting === 'students' ? 0.6 : 1,
                }}
              >
                {exporting === 'students' ? 'Exportando...' : '⬇️ Descargar CSV'}
              </button>
            </div>

            {/* Reporte Clases */}
            <div
              style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🏋️ Reporte de Clases</h3>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Información de todas las clases del período
              </p>
              <button
                onClick={() => exportToCSV('classes')}
                disabled={exporting !== null}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: exporting === 'classes' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: exporting === 'classes' ? 0.6 : 1,
                }}
              >
                {exporting === 'classes' ? 'Exportando...' : '⬇️ Descargar CSV'}
              </button>
            </div>

            {/* Reporte Pagos */}
            <div
              style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>💰 Reporte de Pagos</h3>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Historial completo de transacciones y pagos
              </p>
              <button
                onClick={() => exportToCSV('payments')}
                disabled={exporting !== null}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: exporting === 'payments' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: exporting === 'payments' ? 0.6 : 1,
                }}
              >
                {exporting === 'payments' ? 'Exportando...' : '⬇️ Descargar CSV'}
              </button>
            </div>
          </div>
        </section>

        {/* Info */}
        <section style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>ℹ️ Información</h3>
          <ul style={{ marginBottom: 0 }}>
            <li>Los reportes se descargan en formato CSV</li>
            <li>Puedes abrir los archivos con Excel, Google Sheets u otros programas similares</li>
            <li>Selecciona el período de fechas para filtrar los datos</li>
            <li>Los reportes incluyen todos los datos disponibles del período seleccionado</li>
          </ul>
        </section>
      </main>
      </div>
    </div>
  );
}
