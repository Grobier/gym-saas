export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import { authAPI, gymsAPI, convertSupabaseUser } from '../../lib/supabase-api';
import { useAuthStore, useGymsStore } from '../../lib/store';
import Sidebar from '../../components/Sidebar';
import toast from 'react-hot-toast';
import styles from '../../styles/dashboard.module.css';

interface EmailNotificationSetting {
  id: string;
  type: 'payment_approved' | 'payment_rejected' | 'new_student' | 'class_reminder' | 'reservation_confirmed';
  enabled: boolean;
  recipientType: 'admin' | 'student' | 'coach' | 'both';
  template: string;
}

const EMAIL_TEMPLATES = {
  payment_approved: {
    subject: 'Pago Aprobado - {gym_name}',
    body: `Hola {user_name},

Tu pago de ${'{amount}'} ha sido aprobado exitosamente.

Detalles:
- ID de Transacción: {transaction_id}
- Fecha: {date}
- Monto: ${'{amount}'}

Gracias por tu confianza.

Saludos,
El equipo de {gym_name}`,
  },
  payment_rejected: {
    subject: 'Pago Rechazado - {gym_name}',
    body: `Hola {user_name},

Tu pago de ${'{amount}'} ha sido rechazado.

Detalles:
- ID de Transacción: {transaction_id}
- Motivo: {rejection_reason}
- Fecha: {date}

Por favor intenta nuevamente o contacta a soporte.

Saludos,
El equipo de {gym_name}`,
  },
  new_student: {
    subject: 'Nuevo Estudiante Registrado - {gym_name}',
    body: `Hola {admin_name},

Un nuevo estudiante se ha registrado en tu gimnasio.

Información:
- Nombre: {student_name}
- Email: {student_email}
- Teléfono: {student_phone}
- Fecha: {date}

Accede al panel para ver más detalles.

Saludos,
El equipo de {gym_name}`,
  },
  class_reminder: {
    subject: 'Recordatorio: Tu clase comienza en 1 hora - {gym_name}',
    body: `Hola {user_name},

Recordatorio: Tu clase "{class_name}" comienza en 1 hora.

Detalles:
- Hora: {class_time}
- Instructor: {instructor_name}
- Ubicación: {gym_name}

¡No olvides llegar 10 minutos antes!

Saludos,
El equipo de {gym_name}`,
  },
  reservation_confirmed: {
    subject: 'Reservación Confirmada - {gym_name}',
    body: `Hola {user_name},

Tu reservación ha sido confirmada.

Detalles:
- Clase: {class_name}
- Fecha: {class_date}
- Hora: {class_time}
- Capacidad disponible: {available_spots}/{total_capacity}

¡Te esperamos!

Saludos,
El equipo de {gym_name}`,
  },
};

export default function EmailSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('payment_approved');
  const [settings, setSettings] = useState<EmailNotificationSetting[]>([
    {
      id: '1',
      type: 'payment_approved',
      enabled: true,
      recipientType: 'admin',
      template: 'payment_approved',
    },
    {
      id: '2',
      type: 'payment_rejected',
      enabled: true,
      recipientType: 'admin',
      template: 'payment_rejected',
    },
    {
      id: '3',
      type: 'new_student',
      enabled: true,
      recipientType: 'admin',
      template: 'new_student',
    },
    {
      id: '4',
      type: 'class_reminder',
      enabled: false,
      recipientType: 'student',
      template: 'class_reminder',
    },
    {
      id: '5',
      type: 'reservation_confirmed',
      enabled: true,
      recipientType: 'student',
      template: 'reservation_confirmed',
    },
  ]);

  const setUser = useAuthStore((state) => state.setUser);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    verifyAuth();
  }, []);

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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // En producción, guardaría a la API
      toast.success('Configuración de emails guardada');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const getEventLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment_approved: '💰 Pago Aprobado',
      payment_rejected: '❌ Pago Rechazado',
      new_student: '👨‍🎓 Nuevo Estudiante',
      class_reminder: '🔔 Recordatorio de Clase',
      reservation_confirmed: '📅 Reservación Confirmada',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  const selectedTemplateData = EMAIL_TEMPLATES[selectedTemplate as keyof typeof EMAIL_TEMPLATES];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Configuración de Notificaciones por Email</h1>
        <button onClick={() => router.back()} className={styles.logoutBtn}>
          ← Volver
        </button>
      </header>

      <main className={styles.main} style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Info */}
        <div
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            borderLeft: '4px solid #3b82f6',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>ℹ️ Notificaciones por Email</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.95rem' }}>
            Configura qué eventos generarán notificaciones automáticas por email a administradores,
            entrenadores y estudiantes. Los emails se enviarán automáticamente cuando ocurran estos eventos.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginBottom: '2rem',
          }}
        >
          {/* Panel Izquierdo - Configuración */}
          <section>
            <h2 style={{ marginBottom: '1rem' }}>Eventos de Notificación</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {settings.map((setting) => (
                <div
                  key={setting.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: setting.enabled ? '4px solid #10b981' : '4px solid #9ca3af',
                  }}
                  onClick={() => setSelectedTemplate(setting.template)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>
                        {getEventLabel(setting.type)}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                        Destinatario: {setting.recipientType === 'admin' ? '👤 Admin' : '👨‍🎓 Estudiante'}
                      </p>
                    </div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={setting.enabled}
                        onChange={() => toggleSetting(setting.id)}
                        style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                      />
                      <span style={{ fontSize: '0.9rem' }}>
                        {setting.enabled ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </section>

          {/* Panel Derecho - Preview */}
          <section>
            <h2 style={{ marginBottom: '1rem' }}>Vista Previa del Email</h2>
            {selectedTemplateData && (
              <div
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  maxHeight: '500px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    <strong>Asunto:</strong>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '1rem', color: '#000' }}>
                    {selectedTemplateData.subject}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                    <strong>Contenido:</strong>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>
                    {selectedTemplateData.body}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                    <strong>Variables disponibles:</strong>
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>
                    {'{gym_name}, {user_name}, {amount}, {transaction_id}, {date}, {class_name}, ...'}
                  </p>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                💡 <strong>Nota:</strong> Configurar notificaciones automáticas mejora la experiencia del usuario
                y reduce el trabajo manual de comunicación. Los emails se envían instantáneamente cuando
                ocurren los eventos.
              </p>
            </div>
          </section>
        </div>

        {/* Tabla de Historial de Emails Enviados */}
        <section>
          <h2 style={{ marginBottom: '1rem' }}>Historial de Emails Enviados</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Destinatario</th>
                  <th>Fecha/Hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    No hay emails enviados aún
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
