import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const cookies = parseCookies();
    const authToken = cookies.authToken;

    if (!authToken) {
      router.replace('/login');
    } else {
      // Redirigir al dashboard del rol correspondiente
      // Por defecto ir a coach (rol principal)
      router.replace('/coach');
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirigiendo...</p>
    </div>
  );
}
