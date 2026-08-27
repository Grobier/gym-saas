export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, convertSupabaseUser, superadminAPI, SuperAdminGymOverview } from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import saStyles from '../../styles/superadmin.module.css';

export default function SuperAdminReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [gyms, setGyms] = useState<SuperAdminGymOverview[]>([]);

  const user = useAuthStore((state) => state.user);
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
      const { data, error } = await authAPI.getCurrentUser();
      if (error || !data.user) {
        throw new Error('Error de autenticación');
      }

      const currentUser = convertSupabaseUser(data.user);
      if (currentUser.role !== 'superadmin') {
        toast.error('No tienes acceso a esta sección');
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const { data: gymsData, error: gymsError } = await superadminAPI.getGymOverview();
      if (gymsError) {
        throw new Error(typeof gymsError === 'string' ? gymsError : 'No se pudieron cargar los reportes');
      }

      if (gymsData) {
        setGyms(gymsData);
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
      } else {
        data = [...gyms].sort((a, b) => b.monthly_revenue - a.monthly_revenue);
        headers = ['Gimnasio', 'Ingresos Mensuales', '% del Total'];
        filename = `reporte-ingresos-${new Date().toISOString().split('T')[0]}.csv`;
      }

      let csvContent = headers.join(',') + '\n';
      const totalRevenue = gyms.reduce((sum, g) => sum + g.monthly_revenue, 0);

      data.forEach((row: any) => {
        let values: any[] = [];

        if (reportType === 'gyms') {
          values = [
            row.gym_id,
            row.gym_name,
            row.city,
            row.student_count,
            row.class_count,
            row.monthly_revenue,
          ];
        } else {
          const percentage = (totalRevenue === 0 ? 0 : (row.monthly_revenue / totalRevenue) * 100).toFixed(1);
          values = [row.gym_name, row.monthly_revenue, `${percentage}%`];
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

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>Cargando...</div>
        </div>
      </div>
    );
  }

  const totalStudents = gyms.reduce((sum, g) => sum + g.student_count, 0);
  const totalClasses = gyms.reduce((sum, g) => sum + g.class_count, 0);
  const totalRevenue = gyms.reduce((sum, g) => sum + g.monthly_revenue, 0);
  const topGym =
    gyms.length > 0
      ? gyms.reduce((top, g) => (g.monthly_revenue > top.monthly_revenue ? g : top))
      : null;
  const averageRevenue = gyms.length === 0 ? 0 : totalRevenue / gyms.length;

  return (
    <div className={saStyles.shell}>
      <Sidebar
        role="superadmin"
        userName={user?.name || user?.email}
        onLogout={handleLogout}
        availableRoles={[{ gym_id: 'platform', role: 'superadmin', gym_name: 'Plataforma' }]}
      />

      <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Analytics Export</span>
            <h1 className={saStyles.title}>Reportes Consolidados</h1>
            <p className={saStyles.subtitle}>
              Exporta información comparativa de todos los gimnasios desde una superficie limpia
              y ligera, con foco en lectura rápida.
            </p>
          </div>
          <div className={saStyles.heroActions}>
            <button onClick={() => router.push('/superadmin')} className={saStyles.secondaryAction}>
              Volver al Dashboard
            </button>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Estadísticas Generales</h2>
              <p className={saStyles.sectionCopy}>Lectura agregada de toda la red.</p>
            </div>
          </div>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total Estudiantes</p>
              <p className={saStyles.metricValue}>{totalStudents.toLocaleString()}</p>
              <div className={saStyles.metricHint}>Todos los gimnasios</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Total Clases</p>
              <p className={saStyles.metricValue}>{totalClasses}</p>
              <div className={saStyles.metricHint}>Programadas</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Ingresos Totales</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneInfo}`}>${(totalRevenue / 1000000).toFixed(1)}M</p>
              <div className={saStyles.metricHint}>Mes actual</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Promedio por Gimnasio</p>
              <p className={saStyles.metricValue}>${(averageRevenue / 1000).toFixed(0)}k</p>
              <div className={saStyles.metricHint}>Ingresos mensuales</div>
            </article>
          </div>
        </section>

        {topGym && (
          <section className={saStyles.section}>
            <div className={saStyles.performanceCard}>
              <h3 className={saStyles.performanceTitle}>Top Performer: {topGym.gym_name}</h3>
              <p className={saStyles.performanceText}>
                Ingresos: <strong>${(topGym.monthly_revenue / 1000).toFixed(0)}k/mes</strong>
              </p>
              <p className={saStyles.performanceText}>
                Estudiantes: <strong>{topGym.student_count}</strong> | Clases:{' '}
                <strong>{topGym.class_count}</strong>
              </p>
              <p className={saStyles.performanceText}>
                {(totalRevenue === 0 ? 0 : (topGym.monthly_revenue / totalRevenue) * 100).toFixed(1)}
                % del total de ingresos
              </p>
            </div>
          </section>
        )}

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Exportar Reportes</h2>
              <p className={saStyles.sectionCopy}>Acciones rápidas para sacar CSV.</p>
            </div>
          </div>
          <div className={saStyles.summaryGrid}>
            <div className={`${saStyles.summaryCard} ${saStyles.summaryAccentInfo}`}>
              <p className={saStyles.summaryCardTitle}>Reporte de Gimnasios</p>
              <p className={saStyles.sectionCopy}>Información detallada de gimnasios, estudiantes, clases e ingresos.</p>
              <button onClick={() => exportToCSV('gyms')} disabled={exporting !== null} className={saStyles.primaryAction}>
                {exporting === 'gyms' ? 'Exportando...' : '⬇ Descargar CSV'}
              </button>
            </div>
            <div className={`${saStyles.summaryCard} ${saStyles.summaryAccentSuccess}`}>
              <p className={saStyles.summaryCardTitle}>Reporte de Ingresos</p>
              <p className={saStyles.sectionCopy}>Comparativo de desempeño mensual por gimnasio.</p>
              <button onClick={() => exportToCSV('revenue')} disabled={exporting !== null} className={saStyles.secondaryAction}>
                {exporting === 'revenue' ? 'Exportando...' : '⬇ Descargar CSV'}
              </button>
            </div>
            <div className={`${saStyles.summaryCard} ${saStyles.summaryAccentDanger}`}>
              <p className={saStyles.summaryCardTitle}>Observación</p>
              <p className={saStyles.sectionCopy}>Los valores reflejan la información actualmente disponible en Supabase; si faltan tablas comerciales, el panel mostrará cero o sin registro.</p>
            </div>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Ranking por Gimnasio</h2>
              <p className={saStyles.sectionCopy}>Participación relativa dentro del total de ingresos.</p>
            </div>
          </div>
          <div className={saStyles.panel}>
            <table className={saStyles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Estudiantes</th>
                  <th>Clases</th>
                  <th>Ingresos/Mes</th>
                  <th>% Total</th>
                </tr>
              </thead>
              <tbody>
                {gyms
                  .slice()
                  .sort((a, b) => b.monthly_revenue - a.monthly_revenue)
                  .map((gym) => (
                    <tr key={gym.gym_id}>
                      <td className={saStyles.nameCell}>{gym.gym_name}</td>
                      <td>{gym.city || '-'}</td>
                      <td>{gym.student_count}</td>
                      <td>{gym.class_count}</td>
                      <td>${(gym.monthly_revenue / 1000).toFixed(0)}k</td>
                      <td>
                        <div className={saStyles.progressTrack}>
                          <div className={saStyles.progressFill} style={{ width: `${totalRevenue === 0 ? 0 : (gym.monthly_revenue / totalRevenue) * 100}%` }}>
                            {(totalRevenue === 0 ? 0 : (gym.monthly_revenue / totalRevenue) * 100).toFixed(0)}%
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
