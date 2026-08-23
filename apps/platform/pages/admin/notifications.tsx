export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface Notification {
  id: string;
  type: 'payment' | 'student' | 'class' | 'reservation' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    verifyAuth();
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      loadNotifications();
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

  const loadNotifications = async () => {
    try {
      // Simulamos datos de notificaciones
      // En producción, obtendríamos esto de la API
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'payment',
          title: 'Pago Aprobado',
          message: 'El pago de Juan Pérez ha sido aprobado exitosamente',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          actionUrl: '/admin/payments',
        },
        {
          id: '2',
          type: 'student',
          title: 'Nuevo Estudiante Registrado',
          message: 'María García se ha registrado en tu gimnasio',
          read: false,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          actionUrl: '/admin/students',
        },
        {
          id: '3',
          type: 'reservation',
          title: 'Nueva Reserva',
          message: 'Cristian López se ha registrado en la clase CrossFit 6 AM',
          read: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          actionUrl: '/admin/classes',
        },
        {
          id: '4',
          type: 'class',
          title: 'Clase Próxima a Capacidad',
          message: 'La clase Yoga Matutino está 80% llena',
          read: true,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          actionUrl: '/admin/classes',
        },
        {
          id: '5',
          type: 'system',
          title: 'Mantenimiento Programado',
          message: 'Se realizará mantenimiento del sistema el próximo sábado a las 2 AM',
          read: true,
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];

      setNotifications(mockNotifications);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      toast.error('Error al cargar notificaciones');
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💰';
      case 'student':
        return '👨‍🎓';
      case 'class':
        return '🏋️';
      case 'reservation':
        return '📅';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment':
        return '#10b981';
      case 'student':
        return '#3b82f6';
      case 'class':
        return '#f59e0b';
      case 'reservation':
        return '#8b5cf6';
      case 'system':
        return '#6b7280';
      default:
        return '#000';
    }
  };

  const filteredNotifications =
    filterType === 'all'
      ? notifications
      : filterType === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications.filter((n) => n.type === filterType);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Notificaciones {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              Marcar todo como leído
            </button>
          )}
          <button onClick={() => router.back()} className={styles.logoutBtn}>
            ← Volver
          </button>
        </div>
      </header>

      <main className={styles.main} style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Filtros */}
        <div
          style={{
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterType === 'all' ? '#007bff' : '#e5e7eb',
              color: filterType === 'all' ? 'white' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterType === 'unread' ? '#007bff' : '#e5e7eb',
              color: filterType === 'unread' ? 'white' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            No leídas ({unreadCount})
          </button>
          <button
            onClick={() => setFilterType('payment')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterType === 'payment' ? '#10b981' : '#e5e7eb',
              color: filterType === 'payment' ? 'white' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            💰 Pagos
          </button>
          <button
            onClick={() => setFilterType('student')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterType === 'student' ? '#3b82f6' : '#e5e7eb',
              color: filterType === 'student' ? 'white' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            👨‍🎓 Estudiantes
          </button>
          <button
            onClick={() => setFilterType('class')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterType === 'class' ? '#f59e0b' : '#e5e7eb',
              color: filterType === 'class' ? 'white' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
            }}
          >
            🏋️ Clases
          </button>
        </div>

        {/* Notificaciones */}
        {filteredNotifications.length === 0 ? (
          <div className={styles.empty}>
            <p>
              {filterType === 'unread'
                ? 'No hay notificaciones sin leer'
                : 'No hay notificaciones'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '1.5rem',
                  border: `2px solid ${notification.read ? '#e5e7eb' : getNotificationColor(notification.type)}`,
                  borderLeft: `4px solid ${getNotificationColor(notification.type)}`,
                  borderRadius: '8px',
                  backgroundColor: notification.read ? '#fafafa' : '#f0f9ff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: notification.read ? 0.7 : 1,
                }}
                onClick={() => {
                  if (!notification.read) markAsRead(notification.id);
                  if (notification.actionUrl) {
                    router.push(notification.actionUrl);
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          margin: 0,
                          marginBottom: '0.5rem',
                          fontWeight: notification.read ? 'normal' : 'bold',
                          color: notification.read ? '#666' : '#000',
                        }}
                      >
                        {notification.title}
                        {!notification.read && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: getNotificationColor(
                                notification.type
                              ),
                            }}
                          />
                        )}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          marginBottom: '0.5rem',
                          color: '#666',
                          fontSize: '0.95rem',
                        }}
                      >
                        {notification.message}
                      </p>
                      <small style={{ color: '#999' }}>
                        {new Date(notification.createdAt).toLocaleString('es-CL')}
                      </small>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
