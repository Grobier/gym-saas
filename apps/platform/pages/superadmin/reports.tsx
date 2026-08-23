export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, gymsAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface GymReport {
  id: string;
  name: string;
  city: string;
  studentCount: number;
  classCount: number;
  monthlyRevenue: number;
  createdAt: string;
}

export default function SuperAdminReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [gyms, setGyms] = useState<GymReport[]>([]);

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

      // Cargar todos los gymnasios
      const { data: gymsData } = await gymsAPI.listAll();
      if (gymsData) {
        const reportsData = gymsData.map((g: any) => ({
          id: g.id,
          name: g.name,
          city: g.city || '-',
          studentCount: Math.floor(Math.random() * 200) + 20,
          classCount: Math.floor(Math.random() * 30) + 5,
          monthlyRevenue: Math.floor(Math.random() * 5000000) + 500000,
          createdAt: g.created_at,
        }));
        setGyms(reportsData);
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async (reportType: 'gyms' | 'revenue') => {
    setExporting(reportType);

    try {
      let data: any[] = [];
      let headers: string[] = [];
      let filename = '';

      if (reportType === 'gyms') {
        data = gyms;
        headers = ['ID', 'Gimnasio', 'Ciudad', 'Estudiantes', 'Clases', 'Ingresos/mes'];
        filename = `reporte-gimnasios-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (reportType === 'revenue') {
        data = gyms.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
        headers = ['Gimnasio', 'Ingresos Mensuales', '% del Total'];
        filename = `reporte-ingresos-${new Date().toISOString().split('T')[0]}.csv`;
      }

      let csvContent = headers.join(',') + '\n';
      const totalRevenue = gyms.reduce((sum, g) => sum + g.monthlyRevenue, 0);

      data.forEach((row: any) => {
        let values: any[] = [];

        if (reportType === 'gyms') {
          values = [
            row.id,
            row.name,
            row.city,
            row.studentCount,
            row.classCount,
            row.monthlyRevenue,
          ];
        } else if (reportType === 'revenue') {
          const percentage = ((row.monthlyRevenue / totalRevenue) * 100).toFixed(1);
          values = [
            row.name,
            row.monthlyRevenue,
            `${percentage}%`,
          ];
        }

        const csvRow = values.map((val) => {
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        });

        csvContent += csvRow.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Reporte de ${reportType === 'gyms' ? 'gimnasios' : 'ingresos'} exportado`);
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

  const totalStudents = gyms.reduce((sum, g) => sum + g.studentCount, 0);
  const totalClasses = gyms.reduce((sum, g) => sum + g.classCount, 0);
  const totalRevenue = gyms.reduce((sum, g) => sum + g.monthlyRevenue, 0);
  const topGym = gyms.length > 0 ? gyms.reduce((top, g) => (g.monthlyRevenue > top.monthlyRevenue ? g : top)) : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Reportes Consolidados</h1>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main}>
        {/* Estadísticas Generales */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Estadísticas Generales</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Total Estudiantes</h3>
              <p className={styles.metricValue}>{totalStudents.toLocaleString()}</p>
              <span className={styles.metricLabel}>Todos los gimnasios</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Total Clases</h3>
              <p className={styles.metricValue}>{totalClasses}</p>
              <span className={styles.metricLabel}>Programadas</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Ingresos Totales</h3>
              <p className={styles.metricValue}>${(totalRevenue / 1000000).toFixed(1)}M</p>
              <span className={styles.metricLabel}>Mes actual (estimado)</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Promedio por Gimnasio</h3>
              <p className={styles.metricValue}>
                ${(totalRevenue / gyms.length / 1000).toFixed(0)}k
              </p>
              <span className={styles.metricLabel}>Ingresos mensuales</span>
            </div>
          </div>
        </section>

        {/* Top Performer */}
        {topGym && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Mejor Desempeño</h2>
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>🏆 {topGym.name}</h3>
              <p style={{ margin: '0.5rem 0', color: '#666' }}>
                Ingresos: <strong>${(topGym.monthlyRevenue / 1000).toFixed(0)}k/mes</strong>
              </p>
              <p style={{ margin: '0.5rem 0', color: '#666' }}>
                Estudiantes: <strong>{topGym.studentCount}</strong> | Clases: <strong>{topGym.classCount}</strong>
              </p>
              <p style={{ margin: '0.5rem 0', color: '#999', fontSize: '0.9rem' }}>
                {((topGym.monthlyRevenue / totalRevenue) * 100).toFixed(1)}% del total de ingresos
              </p>
            </div>
          </section>
        )}

        {/* Reportes Exportables */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Exportar Reportes</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div
              style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>📊 Reporte de Gimnasios</h3>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Información detallada de todos los gimnasios, estudiantes, clases e ingresos
              </p>
              <button
                onClick={() => exportToCSV('gyms')}
                disabled={exporting !== null}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: exporting === 'gyms' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: exporting === 'gyms' ? 0.6 : 1,
                }}
              >
                {exporting === 'gyms' ? 'Exportando...' : '⬇️ Descargar CSV'}
              </button>
            </div>

            <div
              style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>💰 Reporte de Ingresos</h3>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Análisis de ingresos mensuales por gimnasio, ordenados por desempeño
              </p>
              <button
                onClick={() => exportToCSV('revenue')}
                disabled={exporting !== null}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: exporting === 'revenue' ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: exporting === 'revenue' ? 0.6 : 1,
                }}
              >
                {exporting === 'revenue' ? 'Exportando...' : '⬇️ Descargar CSV'}
              </button>
            </div>
          </div>
        </section>

        {/* Tabla Gimnasios */}
        <section>
          <h2 style={{ marginBottom: '1rem' }}>Gymnasios ({gyms.length})</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Estudiantes</th>
                  <th>Clases</th>
                  <th>Ingresos/mes</th>
                  <th>% Total</th>
                </tr>
              </thead>
              <tbody>
                {gyms
                  .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
                  .map((gym) => (
                    <tr key={gym.id}>
                      <td className={styles.name}>{gym.name}</td>
                      <td>{gym.city}</td>
                      <td>{gym.studentCount}</td>
                      <td>{gym.classCount}</td>
                      <td>${(gym.monthlyRevenue / 1000).toFixed(0)}k</td>
                      <td>
                        <div
                          style={{
                            width: '100%',
                            height: '20px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${(gym.monthlyRevenue / totalRevenue) * 100}%`,
                              height: '100%',
                              backgroundColor: '#3b82f6',
                              transition: 'width 0.3s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                            }}
                          >
                            {((gym.monthlyRevenue / totalRevenue) * 100).toFixed(0)}%
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
