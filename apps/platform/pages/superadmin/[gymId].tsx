export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import {
  authAPI,
  convertSupabaseUser,
  superadminAPI,
  userAccessAPI,
  SuperAdminGymMember,
  SuperAdminGymOverview,
} from '../../lib/supabase-api';
import { useAuthStore } from '../../lib/store';
import toast from 'react-hot-toast';
import Sidebar from '../../components/Sidebar';
import ConfirmActionModal from '../../components/superadmin/ConfirmActionModal';
import EditGymModal from '../../components/superadmin/EditGymModal';
import saStyles from '../../styles/superadmin.module.css';

export default function SuperAdminGymDetailPage() {
  const router = useRouter();
  const { gymId } = router.query;
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingGym, setDeletingGym] = useState(false);
  const [gym, setGym] = useState<SuperAdminGymOverview | null>(null);
  const [members, setMembers] = useState<SuperAdminGymMember[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [savingGymInfo, setSavingGymInfo] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (router.isReady) {
      bootstrap();
    }
  }, [router.isReady, gymId]);

  const bootstrap = async () => {
    const cookies = parseCookies();
    if (!cookies.authToken) {
      router.push('/login');
      return;
    }

    try {
      const { data: userData, error: userError } = await authAPI.getCurrentUser();

      if (userError || !userData.user) {
        throw new Error('Failed to get user information');
      }

      const currentUser = convertSupabaseUser(userData.user);
      if (currentUser.role !== 'superadmin') {
        toast.error('No tienes acceso a esta sección');
        router.push('/login');
        return;
      }

      setUser(currentUser);

      const { data: rolesData } = await userAccessAPI.getMyRoles();
      if (rolesData) {
        setAvailableRoles(rolesData);
      }

      const [{ data: overview, error: overviewError }, { data: gymMembers, error: membersError }] =
        await Promise.all([
          superadminAPI.getGymOverview(),
          superadminAPI.getGymMembers(String(gymId)),
        ]);

      if (overviewError) {
        throw new Error(typeof overviewError === 'string' ? overviewError : 'No se pudo cargar el gimnasio');
      }

      if (membersError) {
        throw new Error(typeof membersError === 'string' ? membersError : 'No se pudieron cargar los miembros');
      }

      const currentGym = (overview || []).find((item) => item.gym_id === gymId);

      if (!currentGym) {
        toast.error('Gimnasio no encontrado');
        router.push('/superadmin');
        return;
      }

      setGym(currentGym);
      setMembers(gymMembers || []);
    } catch (runtimeError: any) {
      console.error('Superadmin gym detail error:', runtimeError);
      toast.error(runtimeError?.message || 'Error al cargar el gimnasio');
      router.push('/superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/login');
  };

  const handleToggleGym = async () => {
    if (!gym) return;

    const shouldActivate = !gym.is_active;
    const reason = shouldActivate
      ? ''
      : window.prompt(
          `Razón para bloquear ${gym.gym_name}. Esto afectará admin, coaches y alumnos.`,
          gym.blocked_reason || ''
        );

    if (!shouldActivate && reason === null) {
      return;
    }

    setUpdatingStatus(true);

    try {
      const { error } = await superadminAPI.toggleGymStatus(
        gym.gym_id,
        shouldActivate,
        shouldActivate ? undefined : reason || 'Bloqueado por superadministración'
      );

      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo actualizar el estado');
      }

      toast.success(shouldActivate ? 'Gimnasio reactivado' : 'Gimnasio bloqueado');
      await bootstrap();
    } catch (runtimeError: any) {
      console.error('Toggle gym detail status error:', runtimeError);
      toast.error(runtimeError?.message || 'No se pudo actualizar el gimnasio');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleArchiveGym = async () => {
    if (!gym) return;

    if (!gym.is_archived) {
      setArchiveReason(gym.archived_reason || '');
      setArchiveOpen(true);
      return;
    }

    setUpdatingStatus(true);
    try {
      const { error } = await superadminAPI.toggleGymArchive(gym.gym_id, false);

      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo actualizar el archivo');
      }

      toast.success('Gimnasio restaurado');
      await bootstrap();
    } catch (runtimeError: any) {
      console.error('Archive gym detail error:', runtimeError);
      toast.error(runtimeError?.message || 'No se pudo archivar el gimnasio');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const confirmArchiveGym = async () => {
    if (!gym) return;

    setUpdatingStatus(true);
    try {
      const { error } = await superadminAPI.toggleGymArchive(gym.gym_id, true, archiveReason.trim());

      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo actualizar el archivo');
      }

      toast.success('Gimnasio archivado');
      setArchiveOpen(false);
      setArchiveReason('');
      await bootstrap();
    } catch (runtimeError: any) {
      console.error('Confirm archive gym detail error:', runtimeError);
      toast.error(runtimeError?.message || 'No se pudo archivar el gimnasio');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteGym = () => {
    setDeleteConfirmation('');
    setDeleteOpen(true);
  };

  const handleUpdateGym = async (payload: { gym_name: string; city: string }) => {
    if (!gym) return;

    setSavingGymInfo(true);
    try {
      const { error } = await superadminAPI.updateGym({
        gym_id: gym.gym_id,
        gym_name: payload.gym_name,
        city: payload.city || undefined,
      });

      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo actualizar el gimnasio');
      }

      toast.success('Información del gimnasio actualizada');
      setEditOpen(false);
      await bootstrap();
    } catch (runtimeError: any) {
      console.error('Update gym detail error:', runtimeError);
      toast.error(runtimeError?.message || 'No se pudo actualizar el gimnasio');
    } finally {
      setSavingGymInfo(false);
    }
  };

  const confirmDeleteGym = async () => {
    if (!gym) return;

    setDeletingGym(true);
    try {
      const { error } = await superadminAPI.deleteGym(gym.gym_id);
      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo eliminar el gimnasio');
      }

      toast.success('Gimnasio eliminado permanentemente');
      setDeleteOpen(false);
      setDeleteConfirmation('');
      router.push('/superadmin/gyms');
    } catch (runtimeError: any) {
      console.error('Delete gym detail error:', runtimeError);
      toast.error(
        runtimeError?.message || 'No se pudo eliminar. Si tiene datos, archívalo en su lugar.'
      );
    } finally {
      setDeletingGym(false);
    }
  };

  if (loading) {
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>Cargando...</div>
        </div>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className={saStyles.shell}>
        <div className={saStyles.main}>
          <div className={saStyles.emptyState}>No se encontró el gimnasio.</div>
        </div>
      </div>
    );
  }

  const admins = members.filter((member) => member.role === 'admin');
  const coaches = members.filter((member) => member.role === 'coach');
  const students = members.filter((member) => member.role === 'student');
  const studentsWithoutAccount = students.filter((member) => member.status === 'without-account');
  const blockedMembers = members.filter((member) => member.status === 'blocked');

  const renderMembersTable = (
    title: string,
    description: string,
    group: SuperAdminGymMember[],
    emptyLabel: string
  ) => (
    <section className={saStyles.section}>
      <div className={saStyles.panel}>
        <div className={saStyles.sectionHeader}>
          <div>
            <h2 className={saStyles.sectionTitle}>{title}</h2>
            <p className={saStyles.sectionCopy}>{description}</p>
          </div>
        </div>

        {group.length === 0 ? (
          <div className={saStyles.emptyInline}>{emptyLabel}</div>
        ) : (
          <table className={saStyles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {group.map((member, index) => (
                <tr key={`${title}-${member.user_id || member.email || index}`}>
                  <td className={saStyles.nameCell}>{member.display_name}</td>
                  <td>{member.email || '-'}</td>
                  <td>
                    <span
                      className={saStyles.statusPill}
                      style={{
                        backgroundColor:
                          member.status === 'blocked'
                            ? '#ef4444'
                            : member.status === 'without-account'
                              ? '#f59e0b'
                              : '#10b981',
                      }}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td>
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );

  return (
    <>
      <div className={saStyles.shell}>
        <Sidebar
          role="superadmin"
          userName={user?.name || user?.email}
          onLogout={handleLogout}
          availableRoles={availableRoles}
        />

        <main className={saStyles.main}>
        <section className={saStyles.hero}>
          <div>
            <span className={saStyles.eyebrow}>Gym Detail</span>
            <h1 className={saStyles.title}>{gym.gym_name}</h1>
            <p className={saStyles.subtitle}>
              Control completo de operación, equipo asignado y base estudiantil del gimnasio.
            </p>
          </div>
          <div className={saStyles.heroActions}>
            <button
              onClick={() => router.push('/superadmin')}
              className={saStyles.secondaryAction}
            >
              Volver al Dashboard
            </button>
            <button onClick={() => setEditOpen(true)} className={saStyles.secondaryAction}>
              Editar info
            </button>
            <button
              onClick={handleToggleGym}
              className={gym.is_active ? saStyles.dangerAction : saStyles.primaryAction}
              disabled={updatingStatus || gym.is_archived}
            >
              {updatingStatus
                ? 'Guardando...'
                : gym.is_active
                  ? 'Bloquear Gimnasio'
                  : 'Activar Gimnasio'}
            </button>
            <button
              onClick={handleArchiveGym}
              className={saStyles.secondaryAction}
              disabled={updatingStatus}
            >
              {updatingStatus
                ? 'Guardando...'
                : gym.is_archived
                  ? 'Restaurar Gym'
                  : 'Archivar Gym'}
            </button>
            <button
              onClick={handleDeleteGym}
              className={saStyles.ghostDangerAction}
              disabled={deletingGym}
            >
              {deletingGym ? 'Eliminando...' : 'Eliminar Gym'}
            </button>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.metricGrid}>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Estado Operativo</p>
              <p className={`${saStyles.metricValue} ${gym.is_archived ? saStyles.toneInfo : gym.is_active ? saStyles.toneSuccess : saStyles.toneWarning}`}>
                {gym.is_archived ? 'Archivado' : gym.is_active ? 'Activo' : 'Bloqueado'}
              </p>
              <div className={saStyles.metricHint}>
                {gym.archived_reason || gym.blocked_reason || 'Sin restricciones'}
              </div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Admins</p>
              <p className={saStyles.metricValue}>{gym.admin_count}</p>
              <div className={saStyles.metricHint}>Con acceso de gestión</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Coaches</p>
              <p className={saStyles.metricValue}>{gym.coach_count}</p>
              <div className={saStyles.metricHint}>Equipo operativo</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Alumnos</p>
              <p className={saStyles.metricValue}>{gym.student_count}</p>
              <div className={saStyles.metricHint}>Base registrada</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Sin Cuenta</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>
                {studentsWithoutAccount.length}
              </p>
              <div className={saStyles.metricHint}>Alumnos no activados</div>
            </article>
            <article className={saStyles.metricCard}>
              <p className={saStyles.metricLabel}>Miembros Bloqueados</p>
              <p className={`${saStyles.metricValue} ${saStyles.toneWarning}`}>
                {blockedMembers.length}
              </p>
              <div className={saStyles.metricHint}>Por estado operativo del gym</div>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.detailGrid}>
            <div className={saStyles.panel}>
              <div className={saStyles.sectionHeader}>
                <div>
                  <h2 className={saStyles.sectionTitle}>Ficha del Gimnasio</h2>
                  <p className={saStyles.sectionCopy}>Datos base sincronizados desde Supabase.</p>
                </div>
              </div>
              <table className={saStyles.detailList}>
                <tbody>
                  <tr>
                    <th>Nombre</th>
                    <td>{gym.gym_name}</td>
                  </tr>
                  <tr>
                    <th>Ciudad</th>
                    <td>{gym.city || 'Sin registro'}</td>
                  </tr>
                  <tr>
                    <th>Creado</th>
                    <td>{new Date(gym.created_at).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <th>ID</th>
                    <td>{gym.gym_id}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={saStyles.panel}>
              <div className={saStyles.sectionHeader}>
                <div>
                  <h2 className={saStyles.sectionTitle}>Comercial</h2>
                  <p className={saStyles.sectionCopy}>Estado de suscripción e ingresos.</p>
                </div>
              </div>
              <table className={saStyles.detailList}>
                <tbody>
                  <tr>
                    <th>Plan</th>
                    <td>{gym.subscription_plan || 'Sin registro'}</td>
                  </tr>
                  <tr>
                    <th>Estado</th>
                    <td>{gym.subscription_status || 'Sin registro'}</td>
                  </tr>
                  <tr>
                    <th>Vence</th>
                    <td>
                      {gym.subscription_end_date
                        ? new Date(gym.subscription_end_date).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>Ingresos/Mes</th>
                    <td>${gym.monthly_revenue.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.summaryGrid}>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentInfo}`}>
              <p className={saStyles.summaryCardTitle}>Administradores</p>
              <p className={saStyles.summaryValue}>{admins.length}</p>
              <p className={saStyles.sectionCopy}>Responsables directos del box o sede.</p>
            </article>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentSuccess}`}>
              <p className={saStyles.summaryCardTitle}>Coaches</p>
              <p className={saStyles.summaryValue}>{coaches.length}</p>
              <p className={saStyles.sectionCopy}>Equipo técnico asociado por rol.</p>
            </article>
            <article className={`${saStyles.summaryCard} ${saStyles.summaryAccentDanger}`}>
              <p className={saStyles.summaryCardTitle}>Alumnos</p>
              <p className={saStyles.summaryValue}>{students.length}</p>
              <p className={saStyles.sectionCopy}>Registros estudiantiles consolidados.</p>
            </article>
          </div>
        </section>

        <section className={saStyles.section}>
          <div className={saStyles.sectionHeader}>
            <div>
              <h2 className={saStyles.sectionTitle}>Ecosistema del Gimnasio</h2>
              <p className={saStyles.sectionCopy}>
                Vista desglosada por rama para revisar responsables, coaches y base de alumnos.
              </p>
            </div>
          </div>
        </section>

        {renderMembersTable(
          'Administradores',
          'Responsables directos de operación y gestión del gimnasio.',
          admins,
          'No hay administradores asignados a este gimnasio.'
        )}

        {renderMembersTable(
          'Coaches',
          'Equipo técnico y operativo asociado a la sede.',
          coaches,
          'No hay coaches asignados a este gimnasio.'
        )}

        {renderMembersTable(
          'Alumnos',
          'Base estudiantil visible por el superadministrador.',
          students,
          'No hay alumnos registrados en este gimnasio.'
        )}
        </main>
      </div>

      <ConfirmActionModal
        open={archiveOpen}
        onOpenChange={(open) => {
          setArchiveOpen(open);
          if (!open) {
            setArchiveReason('');
          }
        }}
        title="Archivar gimnasio"
        description={
          gym
            ? `Archivarás todo el ecosistema de ${gym.gym_name}. Admin, coaches y alumnos perderán acceso operativo, pero sus datos quedarán intactos para restaurarlo más adelante.`
            : ''
        }
        confirmLabel="Archivar ecosistema"
        onConfirm={confirmArchiveGym}
        isLoading={updatingStatus}
        reasonLabel="Motivo del archivado"
        reasonValue={archiveReason}
        onReasonChange={setArchiveReason}
        reasonPlaceholder="Ej. cierre temporal, consolidación de sedes o limpieza operativa."
      />

      <ConfirmActionModal
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteConfirmation('');
          }
        }}
        title="Eliminar gimnasio"
        description={
          gym
            ? `Escribe ELIMINAR para borrar permanentemente ${gym.gym_name}. Solo funciona si no tiene datos relacionados.`
            : ''
        }
        confirmLabel="Eliminar definitivamente"
        onConfirm={confirmDeleteGym}
        isLoading={deletingGym}
        tone="danger"
        requiredText="ELIMINAR"
        typedValue={deleteConfirmation}
        onTypedValueChange={setDeleteConfirmation}
      />

      <EditGymModal
        open={editOpen}
        initialGymName={gym.gym_name}
        initialCity={gym.city}
        isSaving={savingGymInfo}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdateGym}
      />
    </>
  );
}
