import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { setCookie } from 'nookies';
import { supabase, authAPI, userAccessAPI, convertSupabaseUser } from '../lib/supabase-api';
import { useAuthStore } from '../lib/store';
import toast from 'react-hot-toast';
import styles from '../styles/auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setAvailableRoles = useAuthStore((state) => state.setAvailableRoles);
  const setActiveGym = useAuthStore((state) => state.setActiveGym);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Correo y contraseña son requeridos');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. Save auth token
      if (data.session?.access_token) {
        setCookie(null, 'authToken', data.session.access_token, {
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }

      // 3. Get user and set in store
      const user = data.user;
      const convertedUser = convertSupabaseUser(user);
      setUser(convertedUser);

      toast.success('Sesión iniciada correctamente');

      // 4. Get all available roles from gym_access
      const { data: rolesData, error: rolesError } = await userAccessAPI.getMyRoles();

      if (rolesError) {
        console.error('Error loading roles:', rolesError);
        // Si es un superadmin (no tiene gym_access), permitir acceso directo
        if (convertedUser.role === 'superadmin') {
          router.push('/superadmin');
          return;
        }
      }

      const availableRoles = rolesData || [];
      setAvailableRoles(availableRoles);

      // 5. Determine redirect based on roles
      if (convertedUser.role === 'superadmin') {
        // Superadmin - mostrar dashboard directamente
        router.push('/superadmin');
      } else if (availableRoles.length === 0) {
        // No roles assigned - error
        toast.error('No tienes roles asignados en ningún gimnasio');
        await supabase.auth.signOut();
        return;
      } else if (availableRoles.length === 1) {
        // Single role - redirect directly
        const { gym_id, role } = availableRoles[0];
        setActiveGym(gym_id);
        setActiveRole(role);

        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'coach') {
          router.push('/coach');
        } else if (role === 'student') {
          router.push('/student');
        }
      } else {
        // Multiple roles - show selector
        // Set first role as active by default
        const { gym_id, role } = availableRoles[0];
        setActiveGym(gym_id);
        setActiveRole(role);
        router.push('/role-selector');
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
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className={styles.footer}>
          ¿No tienes cuenta? <a href="#">Contacta al administrador</a>
        </p>
      </div>
    </div>
  );
}
