import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore, getAvailableRolesInGym } from '../lib/store';

interface RoleSelectorProps {
  gymId: string | null;
  currentRole: string | null;
}

export default function RoleSelector({ gymId, currentRole }: RoleSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const availableRoles = useAuthStore((state) => state.availableRoles);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);

  if (!gymId) return null;

  const rolesInGym = getAvailableRolesInGym(availableRoles, gymId);

  if (rolesInGym.length <= 1) {
    return null;
  }

  const handleSelectRole = (role: string) => {
    setActiveRole(role);
    setIsOpen(false);

    // Redirect to appropriate dashboard
    if (role === 'admin') {
      router.push('/admin');
    } else if (role === 'coach') {
      router.push('/coach');
    } else if (role === 'student') {
      router.push('/student');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'coach':
        return 'Entrenador';
      case 'student':
        return 'Estudiante';
      default:
        return role;
    }
  };

  const currentRoleLabel = getRoleLabel(currentRole || '');

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {currentRoleLabel}
        <span style={{ fontSize: '0.7rem' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '150px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            marginTop: '0.5rem',
          }}
        >
          {rolesInGym.map((role) => (
            <button
              key={role}
              onClick={() => handleSelectRole(role)}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                backgroundColor: currentRole === role ? '#e3f2fd' : 'white',
                border: 'none',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: currentRole === role ? 'bold' : 'normal',
              }}
              onMouseOver={(e) => {
                if (currentRole !== role) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseOut={(e) => {
                if (currentRole !== role) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              {currentRole === role && '✓ '}
              {getRoleLabel(role)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
