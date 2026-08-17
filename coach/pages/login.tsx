import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { setCookie } from 'nookies';
import { authAPI } from '../lib/api';
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
      toast.error('Email and password required');
      return;
    }

    setLoading(true);

    try {
      const { data } = await authAPI.login(email, password);

      // Save tokens
      setCookie(null, 'authToken', data.accessToken, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
      setCookie(null, 'refreshToken', data.refreshToken, {
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      toast.success('Logged in successfully');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Coach Dashboard</h1>
        <p className={styles.subtitle}>Manage your classes & attendance</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className={styles.input}
          />

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
