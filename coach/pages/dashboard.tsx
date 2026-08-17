import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { parseCookies } from 'nookies';
import { authAPI, gymsAPI, classesAPI } from '../lib/api';
import { useAuthStore, useGymsStore } from '../lib/store';
import toast from 'react-hot-toast';
import styles from '../styles/dashboard.module.css';

interface Class {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  enrolled: number;
  discipline: {
    name: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      fetchClasses();
    }
  }, [selectedDate, selectedGymId]);

  const bootstrap = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data: userData } = await authAPI.getCurrentUser();
      setUser(userData.user);

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

  const fetchClasses = async () => {
    if (!selectedGymId) return;

    try {
      const startDate = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");
      const endDate = format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");

      const { data } = await classesAPI.listByCoach(selectedGymId, startDate, endDate);
      setClasses(data);
    } catch (error) {
      toast.error('Failed to load classes');
    }
  };

  const handleClassClick = (classId: string) => {
    router.push(`/class/${classId}`);
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Coach Dashboard</h1>
        <div className={styles.userInfo}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <h3>My Gyms</h3>
          {gyms.map((gym) => (
            <button
              key={gym.id}
              className={`${styles.gymBtn} ${selectedGymId === gym.id ? styles.active : ''}`}
              onClick={() => setSelectedGym(gym.id)}
            >
              {gym.name}
              <small>{gym.city}</small>
            </button>
          ))}
        </aside>

        <main className={styles.main}>
          <div className={styles.dateNav}>
            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
              ← Previous
            </button>
            <h2>{format(selectedDate, 'EEEE, MMM dd')}</h2>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              Next →
            </button>
          </div>

          {classes.length === 0 ? (
            <div className={styles.empty}>
              <p>No classes scheduled for this date</p>
            </div>
          ) : (
            <div className={styles.classGrid}>
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className={styles.classCard}
                  onClick={() => handleClassClick(cls.id)}
                >
                  <div className={styles.classHeader}>
                    <h3>{cls.name}</h3>
                    <span className={styles.time}>
                      {format(new Date(cls.startsAt), 'HH:mm')} -{' '}
                      {format(new Date(cls.endsAt), 'HH:mm')}
                    </span>
                  </div>

                  <p className={styles.discipline}>{cls.discipline.name}</p>

                  <div className={styles.capacity}>
                    <span>
                      {cls.enrolled}/{cls.capacity} enrolled
                    </span>
                    <div className={styles.capacityBar}>
                      <div
                        className={styles.capacityFill}
                        style={{
                          width: `${(cls.enrolled / cls.capacity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <button className={styles.actionBtn}>
                    Take Attendance
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
