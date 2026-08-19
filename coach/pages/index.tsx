import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI } from '../lib/supabase-api';

/**
 * Root page (/) - Acts as entry point
 *
 * Behavior:
 * - No session → redirect to /login
 * - Valid session → redirect to /dashboard
 * - No visual UI (pure redirect)
 */
export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    redirect();
  }, []);

  const redirect = async () => {
    console.log('[INDEX] Checking session...');

    // Check for auth token in cookies (faster than full auth check)
    const cookies = parseCookies();

    if (!cookies.authToken) {
      console.log('[INDEX] No auth token, redirecting to login');
      router.replace('/login');
      return;
    }

    // Verify session is still valid with Supabase
    try {
      const { data: userData, error } = await authAPI.getCurrentUser();

      if (error || !userData?.user) {
        console.log('[INDEX] Invalid session, redirecting to login');
        router.replace('/login');
        return;
      }

      console.log('[INDEX] Valid session, redirecting to dashboard');
      router.replace('/dashboard');
    } catch (err) {
      console.error('[INDEX] Session check failed:', err);
      router.replace('/login');
    }
  };

  // Render nothing - this is a redirect-only page
  return null;
}
