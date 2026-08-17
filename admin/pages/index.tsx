import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format, subDays } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, gymsAPI, convertSupabaseUser } from '../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../lib/store';
import toast from 'react-hot-toast';
import styles from '../styles/dashboard.module.css';

interface DashboardMetrics {
  totalStudents: number;
  activeMembers: number;
  totalRevenue: number;
  attendanceRate: number;
  classesToday: number;
  pendingPayments: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const gyms = useGymsStore((state) => state.gyms);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const setGyms = useGymsStore((state) => state.setGyms);
  const setSelectedGym = useGymsStore((state) => state.setSelectedGym);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      fetchMetrics();
    }
  }, [selectedGymId]);

  const bootstrap = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data: userData } = await authAPI.getCurrentUser();
      if (userData.user) {
        setUser(convertSupabaseUser(userData.user));
      }

      const { data: gymsData } = await gymsAPI.listMyGyms();
      setGyms(gymsData);

      if (gymsData.length > 0) {
        setSelectedGym(gymsData[0].id);
      }
    } catch (error) {
      toast.error('Failed to load profile');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    if (!selectedGymId) return;

    try {
      // TODO: Create /gyms/:id/metrics endpoint
      setMetrics({
        totalStudents: 147,
        activeMembers: 89,
        totalRevenue: 1245000,
        attendanceRate: 82.5,
        classesToday: 6,
        pendingPayments: 3,
      });
    } catch (error) {
      toast.error('Failed to load metrics');
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  if (loading || !metrics) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Admin Dashboard</h1>
        <div className={styles.userInfo}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <h3>Navigation</h3>
            <a href="/dashboard" className={styles.navLink + ' ' + styles.active}>
              Dashboard
            </a>
            <a href="/students" className={styles.navLink}>
              Students
            </a>
            <a href="/classes" className={styles.navLink}>
              Classes
            </a>
            <a href="/memberships" className={styles.navLink}>
              Memberships
            </a>
            <a href="/payments" className={styles.navLink}>
              Payments
            </a>
            <a href="/reports" className={styles.navLink}>
              Reports
            </a>
            <a href="/settings" className={styles.navLink}>
              Settings
            </a>
          </nav>

          <div className={styles.gymSelector}>
            <h3>Gym</h3>
            <select
              value={selectedGymId || ''}
              onChange={(e) => setSelectedGym(e.target.value)}
              className={styles.select}
            >
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <h3>Total Students</h3>
              <p className={styles.metricValue}>{metrics.totalStudents}</p>
              <span className={styles.metricLabel}>All time</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Active Members</h3>
              <p className={styles.metricValue}>{metrics.activeMembers}</p>
              <span className={styles.metricLabel}>Current memberships</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Total Revenue</h3>
              <p className={styles.metricValue}>
                ${(metrics.totalRevenue / 1000).toFixed(1)}k
              </p>
              <span className={styles.metricLabel}>Last 30 days</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Attendance Rate</h3>
              <p className={styles.metricValue}>{metrics.attendanceRate}%</p>
              <span className={styles.metricLabel}>This month</span>
            </div>

            <div className={styles.metricCard}>
              <h3>Classes Today</h3>
              <p className={styles.metricValue}>{metrics.classesToday}</p>
              <span className={styles.metricLabel}>Scheduled</span>
            </div>

            <div className={styles.metricCard + ' ' + styles.warning}>
              <h3>Pending Payments</h3>
              <p className={styles.metricValue}>{metrics.pendingPayments}</p>
              <span className={styles.metricLabel}>Needs action</span>
            </div>
          </div>

          <div className={styles.recentActivity}>
            <h2>Recent Activity</h2>
            <div className={styles.activityList}>
              <div className={styles.activityItem}>
                <span className={styles.activityType}>Payment</span>
                <span className={styles.activityText}>
                  John Doe purchased "Unlimited 30 days"
                </span>
                <span className={styles.activityTime}>2 hours ago</span>
              </div>

              <div className={styles.activityItem}>
                <span className={styles.activityType}>Reservation</span>
                <span className={styles.activityText}>
                  Sarah Smith reserved CrossFit 6 AM
                </span>
                <span className={styles.activityTime}>1 hour ago</span>
              </div>

              <div className={styles.activityItem}>
                <span className={styles.activityType}>Membership</span>
                <span className={styles.activityText}>
                  3 memberships expiring this week
                </span>
                <span className={styles.activityTime}>30 minutes ago</span>
              </div>

              <div className={styles.activityItem}>
                <span className={styles.activityType}>Class</span>
                <span className={styles.activityText}>
                  Morning Yoga reached capacity
                </span>
                <span className={styles.activityTime}>10 minutes ago</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
