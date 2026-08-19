export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, studentsAPI, convertSupabaseUser } from '../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../lib/store';
import toast from 'react-hot-toast';
import styles from '../styles/students.module.css';

interface Student {
  id: string;
  user: {
    name: string;
    email: string;
  };
  phone?: string;
  createdAt: string;
  activeReservations?: number;
  totalVisits?: number;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      fetchStudents();
    }
  }, [selectedGymId]);

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

  const fetchStudents = async () => {
    if (!selectedGymId) return;

    try {
      const { data } = await studentsAPI.list(selectedGymId, { search });
      setStudents(data);
    } catch (error) {
      toast.error('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleAddStudent = async (formData: any) => {
    try {
      const { data } = await studentsAPI.create(selectedGymId!, formData);
      setStudents([data, ...students]);
      setShowModal(false);
      toast.success('Estudiante agregado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add student');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    try {
      await studentsAPI.delete(selectedGymId!, studentId);
      setStudents(students.filter((s) => s.id !== studentId));
      toast.success('Estudiante eliminado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar estudiante');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.user.name.toLowerCase().includes(search.toLowerCase()) ||
      s.user.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Estudiantes</h1>
        <button onClick={() => setShowModal(true)} className={styles.primaryBtn}>
          + Agregar Estudiante
        </button>
      </header>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Reservas Activas</th>
              <th>Total Visitas</th>
              <th>Se Unió</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  No se encontraron estudiantes
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className={styles.name}>{student.user.name}</td>
                  <td>{student.user.email}</td>
                  <td>{student.phone || '-'}</td>
                  <td>
                    <span className={styles.badge}>{student.activeReservations || 0}</span>
                  </td>
                  <td>{student.totalVisits || 0}</td>
                  <td>{new Date(student.createdAt).toLocaleDateString('es-CL')}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => router.push(`/students/${student.id}`)}
                        className={styles.btnSmall}
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className={styles.btnSmall + ' ' + styles.danger}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddStudentModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddStudent}
        />
      )}
    </div>
  );
}

function AddStudentModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onAdd({ name, email, phone });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>Agregar Estudiante</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Nombre Completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={styles.secondaryBtn}
            >
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={styles.primaryBtn}>
              {loading ? 'Agregando...' : 'Agregar Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
