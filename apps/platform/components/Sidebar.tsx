import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/sidebar.module.css';

interface SidebarProps {
  role: 'admin' | 'coach' | 'student' | 'superadmin';
  gyms?: Array<{ id: string; name: string }>;
  selectedGymId?: string | null | undefined;
  onSelectGym?: (gymId: string) => void;
  userName?: string | null | undefined;
  onLogout?: () => void;
}

export default function Sidebar({
  role,
  gyms,
  selectedGymId,
  onSelectGym,
  userName,
  onLogout,
}: SidebarProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSuperadmin = role === 'superadmin';

  const getNavItems = () => {
    switch (role) {
      case 'superadmin':
        return [
          { label: 'Resumen', href: '/superadmin' },
          { label: 'Gimnasios', href: '/superadmin/gyms' },
          { label: 'Crear Gym', href: '/superadmin/create-gym' },
          { label: 'Administradores', href: '/superadmin/admins' },
          { label: 'Coaches', href: '/superadmin/coaches' },
          { label: 'Alumnos', href: '/superadmin/students' },
          { label: 'Suscripciones', href: '/superadmin/subscriptions' },
          { label: 'Reportes', href: '/superadmin/reports' },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', href: '/admin' },
          { label: 'Estudiantes', href: '/admin/students' },
          { label: 'Clases', href: '/admin/classes' },
          { label: 'Pagos', href: '/admin/payments' },
          { label: 'Reportes', href: '/admin/reports' },
          { label: 'Roles', href: '/admin/roles' },
          { label: '🔔 Notificaciones', href: '/admin/notifications' },
          { label: '📧 Email', href: '/admin/email-settings' },
          { label: '📊 Analytics', href: '/admin/analytics' },
        ];
      case 'coach':
        return [
          { label: 'Dashboard', href: '/coach' },
          { label: 'Próximas Clases', href: '/coach/classes' },
          { label: 'Alumnos', href: '/coach/students' },
        ];
      case 'student':
        return [
          { label: 'Inicio', href: '/student' },
          { label: 'Clases', href: '/student/classes' },
          { label: 'Mis Reservas', href: '/student/my-bookings' },
          { label: 'Mi Perfil', href: '/student/profile' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className={`${styles.mobileToggle} ${isSuperadmin ? styles.mobileToggleSuperadmin : ''}`}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''} ${isSuperadmin ? styles.sidebarSuperadmin : ''}`}>
        {/* User info */}
        <div className={`${styles.userSection} ${isSuperadmin ? styles.userSectionSuperadmin : ''}`}>
          {isSuperadmin && (
            <div className={styles.brandBlock}>
              <div className={styles.brandBadge}>moveOS</div>
              <div className={styles.brandCopy}>Control Room</div>
            </div>
          )}
          <div className={styles.userName}>{userName || 'Usuario'}</div>
          <div className={styles.userRole}>{role}</div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <h3 className={styles.navTitle}>Navegación</h3>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''} ${isSuperadmin ? styles.navLinkSuperadmin : ''} ${isSuperadmin && isActive(item.href) ? styles.activeSuperadmin : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Gym selector (admin only) */}
        {role === 'admin' && gyms && gyms.length > 0 && (
          <div className={styles.gymSelector}>
            <h3 className={styles.navTitle}>Gimnasio</h3>
            <select
              value={selectedGymId || ''}
              onChange={(e) => {
                onSelectGym?.(e.target.value);
              }}
              className={styles.select}
            >
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>
                  {gym.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Logout button */}
        <div className={styles.logoutSection}>
          <button onClick={onLogout} className={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
