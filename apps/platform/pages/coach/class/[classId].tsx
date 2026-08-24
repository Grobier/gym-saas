import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { parseCookies } from 'nookies';
import { classesAPI, reservationsAPI, attendanceAPI, authAPI } from '../../../lib/supabase-api';
import { useGymsStore, useAuthStore } from '../../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../../styles/dashboard.module.css';

interface ClassDetail {
  id: string;
  gym_id: string;
  name?: string;
  discipline_id?: string;
  scheduled_date?: string;
  time_start?: string;
  time_end?: string;
  coaches?: string[];
  status?: string;
  capacity?: number;
  [key: string]: any;
}

interface Student {
  id: string;
  name: string;
  email: string;
  attendance_status: 'present' | 'absent' | 'excused' | 'unmarked';
  notes?: string;
}

export default function ClassPage() {
  const router = useRouter();
  const { classId } = router.query;

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [roster, setRoster] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedGymId = useGymsStore((state) => state.selectedGymId);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (classId && selectedGymId) {
      fetchClassData();
    }
  }, [classId, selectedGymId]);

  const verifyAuth = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      if (!data.user) {
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchClassData = async () => {
    try {
      // Get class details
      const { data: classData } = await classesAPI.getWithRoster(classId as string);
      setClassDetail(classData);

      // Get roster (registered students)
      const { data: rosterData } = await reservationsAPI.getClassRoster(classId as string);

      if (rosterData) {
        // Get attendance records
        const { data: attendanceData } = await attendanceAPI.getClassAttendance(classId as string);

        // Build student list with attendance status
        const students: Student[] = (rosterData || []).map((item: any) => {
          const attended = attendanceData?.find((a: any) => a.student_id === item.student_id);
          return {
            id: item.student_id,
            name: item.student_name || 'Sin nombre',
            email: item.student_email || '',
            attendance_status: attended?.status || 'unmarked',
            notes: attended?.notes || '',
          };
        });

        setRoster(students);
      }
    } catch (error: any) {
      console.error('Error fetching class data:', error);
      toast.error('Error al cargar datos de la clase');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (
    studentId: string,
    status: 'present' | 'absent' | 'excused'
  ) => {
    setSaving(true);
    try {
      if (!user?.id) {
        toast.error('Usuario no autenticado');
        return;
      }
      await attendanceAPI.markAttendance(classId as string, studentId, status, user.id);

      // Update local state
      setRoster((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? { ...s, attendance_status: status }
            : s
        )
      );

      toast.success(`Asistencia marcada como ${status}`);
    } catch (error) {
      toast.error('Error al marcar asistencia');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      if (!user?.id) {
        toast.error('Usuario no autenticado');
        return;
      }
      // Guardar todos los cambios de asistencia
      for (const student of roster) {
        if (student.attendance_status !== 'unmarked') {
          await attendanceAPI.markAttendance(
            classId as string,
            student.id,
            student.attendance_status,
            user.id
          );
        }
      }
      toast.success('Asistencia guardada correctamente');
      router.back();
    } catch (error) {
      toast.error('Error al guardar asistencia');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  if (!classDetail) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>Clase no encontrada</p>
        </div>
      </div>
    );
  }

  const unmarkedCount = roster.filter((s) => s.attendance_status === 'unmarked').length;
  const presentCount = roster.filter((s) => s.attendance_status === 'present').length;
  const absentCount = roster.filter((s) => s.attendance_status === 'absent').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Tomar Asistencia</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
            {classDetail.name || 'Clase'} - {classDetail.scheduled_date ? format(new Date(classDetail.scheduled_date), 'EEEE, dd MMM') : ''}
            {' '}
            {classDetail.time_start} - {classDetail.time_end}
          </p>
        </div>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main} style={{ maxWidth: '900px' }}>
        {/* Resumen */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Estudiantes</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{roster.length}</div>
          </div>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f0fff4',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Presentes</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981' }}>
              {presentCount}
            </div>
          </div>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#ffe8e8',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Ausentes</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444' }}>
              {absentCount}
            </div>
          </div>
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#fff8e8',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Sin marcar</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {unmarkedCount}
            </div>
          </div>
        </div>

        {/* Tabla de estudiantes */}
        {roster.length === 0 ? (
          <div className={styles.empty}>
            <p>No hay estudiantes registrados en esta clase</p>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => (
                    <tr key={student.id}>
                      <td className={styles.name}>{student.name}</td>
                      <td>{student.email}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            backgroundColor:
                              student.attendance_status === 'present'
                                ? '#d1fae5'
                                : student.attendance_status === 'absent'
                                ? '#fee2e2'
                                : student.attendance_status === 'excused'
                                ? '#fef3c7'
                                : '#e5e7eb',
                            color:
                              student.attendance_status === 'present'
                                ? '#059669'
                                : student.attendance_status === 'absent'
                                ? '#dc2626'
                                : student.attendance_status === 'excused'
                                ? '#d97706'
                                : '#374151',
                          }}
                        >
                          {student.attendance_status === 'present' && '✓ Presente'}
                          {student.attendance_status === 'absent' && '✗ Ausente'}
                          {student.attendance_status === 'excused' && '~ Justificado'}
                          {student.attendance_status === 'unmarked' && '○ Sin marcar'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleMarkAttendance(student.id, 'present')}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor:
                                student.attendance_status === 'present' ? '#10b981' : '#e5e7eb',
                              color:
                                student.attendance_status === 'present' ? 'white' : '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                            }}
                          >
                            Presente
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.id, 'absent')}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor:
                                student.attendance_status === 'absent' ? '#ef4444' : '#e5e7eb',
                              color:
                                student.attendance_status === 'absent' ? 'white' : '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                            }}
                          >
                            Ausente
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.id, 'excused')}
                            disabled={saving}
                            style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor:
                                student.attendance_status === 'excused' ? '#f59e0b' : '#e5e7eb',
                              color:
                                student.attendance_status === 'excused' ? 'white' : '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                            }}
                          >
                            Justificado
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button
                onClick={() => router.back()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  opacity: saving ? 0.6 : 1,
                }}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAll}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  opacity: saving ? 0.6 : 1,
                }}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Asistencia'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
