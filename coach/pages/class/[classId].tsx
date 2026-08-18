import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { classesAPI, attendanceAPI } from '../../lib/supabase-api';
import { useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/class.module.css';

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
      generateQr();
    }
  }, [classId, selectedGymId]);

  const fetchClass = async () => {
    try {
      const { data } = await classesAPI.getWithRoster(
        selectedGymId!,
        classId as string
      );
      setClassDetail(data);

      // Load existing attendance
      const { data: attendanceData } = await attendanceAPI.getClassAttendance(
        selectedGymId!,
        classId as string
      );

      const attMap = new Map();
      attendanceData.forEach((att: Attendance) => {
        attMap.set(att.studentId, att);
      });
      setAttendance(attMap);
    } catch (error) {
      toast.error('Failed to load class');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const generateQr = async () => {
    try {
      const { data } = await attendanceAPI.generateQr(selectedGymId!, classId as string);
      setQrCode(data.qrCode);
    } catch (error) {
      console.error('Failed to generate QR', error);
    }
  };

  const markAttendance = async (
    reservationId: string,
    studentId: string,
    status: 'attended' | 'no_show'
  ) => {
    setSaving(true);
    try {
      const { data } = await attendanceAPI.markAttendance(
        selectedGymId!,
        reservationId,
        status
      );

      setAttendance((prev) => new Map(prev).set(studentId, data));
      toast.success(`Marked as ${status}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!classDetail) {
    return <div className={styles.container}>Class not found</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ← Back
        </button>
        <div className={styles.classInfo}>
          <h1>{classDetail.id}</h1>
          {classDetail.scheduled_date && (
            <p>{format(new Date(classDetail.scheduled_date), 'EEEE, MMM dd')}</p>
          )}
          {classDetail.time_start && classDetail.time_end && (
            <p>
              {classDetail.time_start} - {classDetail.time_end}
            </p>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <h3>QR Code</h3>
          {qrCode ? (
            <div className={styles.qrContainer}>
              <img src={qrCode} alt="QR Code" className={styles.qr} />
              <p className={styles.qrHint}>Students scan to check in</p>
            </div>
          ) : (
            <p>Generating QR...</p>
          )}
        </aside>

        <main className={styles.main}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Attended</span>
              <span className={styles.statValue}>
                {Array.from(attendance.values()).filter((a) => a.status === 'attended').length}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>No Show</span>
              <span className={styles.statValue}>
                {Array.from(attendance.values()).filter((a) => a.status === 'no_show').length}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total</span>
              <span className={styles.statValue}>{classDetail.roster.length}</span>
            </div>
          </div>

          <div className={styles.roster}>
            <h3>Roster</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classDetail.roster.map((student) => {
                  const att = attendance.get(student.id);
                  return (
                    <tr key={student.id} className={att ? styles.marked : ''}>
                      <td>{student.user.name}</td>
                      <td>
                        {att ? (
                          <span
                            className={`${styles.status} ${
                              att.status === 'attended'
                                ? styles.attended
                                : styles.noShow
                            }`}
                          >
                            {att.status === 'attended' ? '✓ Attended' : '✗ No Show'}
                          </span>
                        ) : (
                          <span className={styles.statusPending}>Pending</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() =>
                              markAttendance(student.id, student.id, 'attended')
                            }
                            disabled={saving}
                            className={`${styles.btn} ${
                              att?.status === 'attended' ? styles.active : ''
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() =>
                              markAttendance(student.id, student.id, 'no_show')
                            }
                            disabled={saving}
                            className={`${styles.btn} ${styles.danger} ${
                              att?.status === 'no_show' ? styles.active : ''
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
