export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import toast from 'react-hot-toast';
import { classesAPI, authAPI, gymsAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import Sidebar from '../../components/Sidebar';
import styles from '../../styles/dashboard.module.css';

interface Class {
  id: string;
  name: string;
  discipline_id: string;
  scheduled_date: string;
  time_start: string;
  time_end: string;
  capacity: number;
  enrolled: number;
}

interface ClassFilters {
  search: string;
  discipline: string;
  minCapacity: number;
  sortBy: 'name' | 'date' | 'capacity';
  sortOrder: 'asc' | 'desc';
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ClassFilters>({
    search: '',
    discipline: '',
    minCapacity: 0,
    sortBy: 'date',
    sortOrder: 'asc',
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

  useEffect(() => {
    if (selectedGymId) {
      loadClasses();
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

      const { data: gymsData } = await gymsAPI.listMyGyms();
      if (gymsData && gymsData.length > 0) {
        setGyms(gymsData);
        setSelectedGym(gymsData[0].id);
      }
    } catch (error) {
      console.error('Error de autenticación:', error);
      toast.error('Error de autenticación');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  const loadClasses = async () => {
    if (!selectedGymId) return;

    try {
      setLoading(true);
      const { data, error } = await classesAPI.list(selectedGymId);

      if (error) {
        console.error('Error al cargar clases:', error);
        toast.error('Error al cargar clases: ' + error);
        setClasses([]);
        return;
      }

      setClasses(data || []);
    } catch (error: any) {
      console.error('Error cargando clases:', error);
      toast.error('Error al cargar las clases');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes
    .filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(filters.search.toLowerCase());
      const matchesDiscipline =
        !filters.discipline || c.discipline_id === filters.discipline;
      const matchesCapacity = c.capacity >= filters.minCapacity;

      return matchesSearch && matchesDiscipline && matchesCapacity;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (filters.sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.scheduled_date).getTime();
          bVal = new Date(b.scheduled_date).getTime();
          break;
        case 'capacity':
          aVal = a.capacity;
          bVal = b.capacity;
          break;
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const disciplines = Array.from(new Set(classes.map((c) => c.discipline_id)));

  if (loading) return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        role="admin"
        gyms={gyms}
        selectedGymId={selectedGymId}
        onSelectGym={setSelectedGym}
        userName={user?.name}
        onLogout={handleLogout}
      />
      <div className={styles.container}>Cargando...</div>
    </div>
  );

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
        <h1>Clases</h1>
        <button
          onClick={() => router.push('/admin/classes/new')}
          className={styles.primaryBtn}
        >
          + Crear Clase
        </button>
      </header>

      <div className={styles.searchBar} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
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
              Disciplina
            </label>
            <select
              value={filters.discipline}
              onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Todas las disciplinas</option>
              {disciplines.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Capacidad Mínima
            </label>
            <input
              type="number"
              min="0"
              value={filters.minCapacity}
              onChange={(e) =>
                setFilters({ ...filters, minCapacity: parseInt(e.target.value) || 0 })
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
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
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
              <option value="date">Fecha</option>
              <option value="capacity">Capacidad</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Orden
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as any })}
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
                  discipline: '',
                  minCapacity: 0,
                  sortBy: 'date',
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

      <main className={styles.main}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Horario</th>
                <th>Capacidad</th>
                <th>Inscritos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No hay clases disponibles
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => (
                  <tr key={cls.id}>
                    <td className={styles.name}>{cls.name}</td>
                    <td>{cls.time_start} - {cls.time_end}</td>
                    <td>{cls.capacity}</td>
                    <td>{cls.enrolled}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => router.push(`/admin/classes/${cls.id}/edit`)}
                          className={styles.btnSmall}
                          style={{ backgroundColor: '#3b82f6' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de que deseas eliminar esta clase?')) {
                              // TODO: Implement delete
                              toast.loading('Eliminando clase...');
                            }
                          }}
                          className={styles.btnSmall}
                          style={{ backgroundColor: '#ef4444' }}
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
      </main>
      </div>
    </div>
  );
}
