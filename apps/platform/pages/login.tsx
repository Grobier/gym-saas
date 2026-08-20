import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { setCookie } from 'nookies';
import { supabase } from '../lib/supabase-api';
import toast from 'react-hot-toast';
import styles from '../styles/auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Correo y contraseña son requeridos');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session?.access_token) {
        setCookie(null, 'authToken', data.session.access_token, {
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }

      toast.success('Sesión iniciada correctamente');

      // Redirect based on role
      const user = data.user;
      const role = user?.user_metadata?.role || 'student';

      if (role === 'superadmin') {
        router.push('/superadmin');
      } else if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'coach') {
        router.push('/coach');
      } else {
        router.push('/student');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Ingresar</h1>
        <p className={styles.subtitle}>Plataforma Gym SaaS</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={styles.input}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className={styles.input}
          />

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
