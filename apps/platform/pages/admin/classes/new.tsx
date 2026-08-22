import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, classesAPI, convertSupabaseUser } from '../../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../../styles/dashboard.module.css';

export default function NewClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    discipline_id: '',
    scheduled_date: '',
    time_start: '',
    time_end: '',
    capacity: 10,
  });

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    verifyAuth();
  }, []);

  const verifyAuth = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      if (data.user) {
        setUser(convertSupabaseUser(data.user));
      }
    } catch (error) {
      router.push('/login');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGymId) {
      toast.error('Selecciona un gimnasio primero');
      return;
    }

    if (!formData.name || !formData.discipline_id || !formData.scheduled_date || !formData.time_start || !formData.time_end) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await classesAPI.create(selectedGymId, {
        name: formData.name,
        discipline_id: formData.discipline_id,
        scheduled_date: formData.scheduled_date,
        time_start: formData.time_start,
        time_end: formData.time_end,
        capacity: formData.capacity,
      });

      if (error) {
        throw error;
      }

      toast.success('Clase creada correctamente');
      router.push('/admin/classes');
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error(error.message || 'Error al crear la clase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Crear Nueva Clase</h1>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main} style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* Nombre de Clase */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Nombre de Clase *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="ej: CrossFit Principiantes"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
              disabled={loading}
              required
            />
          </div>

          {/* Disciplina */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Disciplina *
            </label>
            <input
              type="text"
              name="discipline_id"
              value={formData.discipline_id}
              onChange={handleChange}
              placeholder="ej: crossfit, yoga, pilates"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
              disabled={loading}
              required
            />
            <small style={{ color: '#666' }}>
              Ingresa el tipo de disciplina o categoría
            </small>
          </div>

          {/* Fecha */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Fecha *
            </label>
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
              disabled={loading}
              required
            />
          </div>

          {/* Horario */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Hora Inicio *
              </label>
              <input
                type="time"
                name="time_start"
                value={formData.time_start}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                disabled={loading}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Hora Término *
              </label>
              <input
                type="time"
                name="time_end"
                value={formData.time_end}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Capacidad */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Capacidad Máxima (personas)
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="1"
              max="200"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 'bold',
              }}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Clase'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
