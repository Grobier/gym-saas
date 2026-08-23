export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, studentsAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

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

interface FilterOptions {
  search: string;
  minReservations: number;
  sortBy: 'name' | 'createdAt' | 'reservations';
  sortOrder: 'asc' | 'desc';
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    minReservations: 0,
    sortBy: 'name',
    sortOrder: 'asc',
  });

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
      setStudents(data || []);
    } catch (error) {
      toast.error('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
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
    if (!confirm('¿Estás seguro? Esto no se puede deshacer.')) return;

    try {
      await studentsAPI.delete(selectedGymId!, studentId);
      setStudents(students.filter((s) => s.id !== studentId));
      toast.success('Estudiante eliminado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar estudiante');
    }
  };

  const filteredStudents = students
    .filter((s) => {
      // Filtro de búsqueda
      const matchesSearch =
        s.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.user.email.toLowerCase().includes(filters.search.toLowerCase());

      // Filtro de reservas mínimas
      const matchesReservations = (s.activeReservations || 0) >= filters.minReservations;

      return matchesSearch && matchesReservations;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (filters.sortBy) {
        case 'name':
          aVal = a.user.name.toLowerCase();
          bVal = b.user.name.toLowerCase();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'reservations':
          aVal = a.activeReservations || 0;
          bVal = b.activeReservations || 0;
          break;
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

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

      <div className={styles.searchBar} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className={styles.searchInput}
          style={{ flex: 1 }}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: showFilters ? '#007bff' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          }}
        >
          {showFilters ? '🔽 Filtros' : '📊 Filtros'}
        </button>
      </div>

      {showFilters && (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Reservas Mínimas
            </label>
            <input
              type="number"
              min="0"
              value={filters.minReservations}
              onChange={(e) =>
                setFilters({ ...filters, minReservations: parseInt(e.target.value) || 0 })
              }
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Ordenar Por
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters({ ...filters, sortBy: e.target.value as any })
              }
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            >
              <option value="name">Nombre</option>
              <option value="createdAt">Fecha de Inscripción</option>
              <option value="reservations">Reservas Activas</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Orden
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) =>
                setFilters({ ...filters, sortOrder: e.target.value as any })
              }
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() =>
                setFilters({
                  search: '',
                  minReservations: 0,
                  sortBy: 'name',
                  sortOrder: 'asc',
                })
              }
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

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
                        onClick={() => router.push(`/admin/students/${student.id}`)}
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
