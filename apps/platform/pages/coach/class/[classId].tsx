import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { classesAPI } from '../../../lib/supabase-api';
import { useGymsStore } from '../../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../../styles/dashboard.module.css';

interface Attendance {
  id: string;
  reservationId: string;
  studentId: string;
  status: 'attended' | 'no_show';
  checkedInAt?: string;
  notes?: string;
}

interface Student {
  id: string;
  user: {
    name: string;
  };
  attendance?: Attendance;
}

interface ClassDetail {
  id: string;
  gym_id: string;
  discipline_id?: string;
  scheduled_date?: string;
  time_start?: string;
  time_end?: string;
  coaches?: string[];
  status?: string;
  capacity?: number;
  roster?: any[];
  [key: string]: any;
}

export default function ClassPage() {
  const router = useRouter();
  const { classId } = router.query;

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [attendance, setAttendance] = useState<Map<string, Attendance>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    if (classId && selectedGymId) {
      fetchClass();
    }
  }, [classId, selectedGymId]);

  const fetchClass = async () => {
    try {
      const { data } = await classesAPI.getWithRoster(classId as string);
      setClassDetail(data);
    } catch (error) {
      toast.error('Error al cargar la clase');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (
    reservationId: string,
    studentId: string,
    status: 'attended' | 'no_show'
  ) => {
    setSaving(true);
    try {
      // TODO: Implement attendance marking via API
      const newAttendance: Attendance = {
        id: Math.random().toString(),
        reservationId,
        studentId,
        status,
        checkedInAt: new Date().toISOString(),
      };

      setAttendance((prev) => new Map(prev).set(studentId, newAttendance));
      toast.success(`Marcado como ${status === 'attended' ? 'presente' : 'ausente'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al marcar asistencia');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  if (!classDetail) {
    return <div className={styles.container}>Clase no encontrada</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.logoutBtn} style={{background: '#6b7280'}}>
          ← Atrás
        </button>
        <div>
          <h1>{classDetail.id}</h1>
          {classDetail.scheduled_date && (
            <p style={{color: '#6b7280'}}>{format(new Date(classDetail.scheduled_date), 'EEEE, MMM dd')}</p>
          )}
          {classDetail.time_start && classDetail.time_end && (
            <p style={{color: '#6b7280'}}>
              {classDetail.time_start} - {classDetail.time_end}
            </p>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <h3>Presentes</h3>
            <p className={styles.metricValue}>
              {Array.from(attendance.values()).filter((a) => a.status === 'attended').length}
            </p>
            <span className={styles.metricLabel}>Asistieron</span>
          </div>
          <div className={styles.metricCard}>
            <h3>Ausentes</h3>
            <p className={styles.metricValue}>
              {Array.from(attendance.values()).filter((a) => a.status === 'no_show').length}
            </p>
            <span className={styles.metricLabel}>No asistieron</span>
          </div>
          <div className={styles.metricCard}>
            <h3>Total</h3>
            <p className={styles.metricValue}>{classDetail.roster?.length || 0}</p>
            <span className={styles.metricLabel}>Inscritos</span>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <h2>Lista de Asistencia</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre del Estudiante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {classDetail.roster && classDetail.roster.length > 0 ? (
                classDetail.roster.map((student) => {
                  const att = attendance.get(student.id);
                  return (
                    <tr key={student.id}>
                      <td className={styles.name}>{student.user.name}</td>
                      <td>
                        {att ? (
                          <span
                            className={styles.status}
                            style={{
                              backgroundColor: att.status === 'attended' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {att.status === 'attended' ? '✓ Asistió' : '✗ No asistió'}
                          </span>
                        ) : (
                          <span className={styles.status} style={{backgroundColor: '#f59e0b'}}>
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => markAttendance(student.id, student.id, 'attended')}
                            disabled={saving}
                            className={styles.btnSmall}
                            style={{
                              backgroundColor: att?.status === 'attended' ? '#10b981' : '#667eea',
                            }}
                          >
                            Presente
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, student.id, 'no_show')}
                            disabled={saving}
                            className={styles.btnSmall}
                            style={{
                              backgroundColor: att?.status === 'no_show' ? '#ef4444' : '#6b7280',
                            }}
                          >
                            Ausente
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className={styles.empty}>
                    No hay estudiantes inscritos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
