import React, { useEffect, useState } from 'react';
import saStyles from '../../styles/superadmin.module.css';

interface EditGymModalProps {
  open: boolean;
  initialGymName: string;
  initialCity?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (payload: { gym_name: string; city: string }) => Promise<void> | void;
}

export default function EditGymModal({
  open,
  initialGymName,
  initialCity,
  isSaving = false,
  onClose,
  onSubmit,
}: EditGymModalProps) {
  const [gymName, setGymName] = useState(initialGymName);
  const [city, setCity] = useState(initialCity || '');

  useEffect(() => {
    if (open) {
      setGymName(initialGymName);
      setCity(initialCity || '');
    }
  }, [open, initialGymName, initialCity]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({
      gym_name: gymName.trim(),
      city: city.trim(),
    });
  };

  return (
    <div className={saStyles.modalOverlay}>
      <div className={saStyles.modalContent}>
        <div className={saStyles.modalHeader}>
          <h2 className={saStyles.modalTitle}>Editar gimnasio</h2>
          <p className={saStyles.modalDescription}>
            Actualiza la información base del centro de entrenamiento visible en la plataforma.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={saStyles.modalForm}>
          <label className={saStyles.field}>
            <span>Nombre del gym / box</span>
            <input
              value={gymName}
              onChange={(event) => setGymName(event.target.value)}
              className={saStyles.input}
              placeholder="CrossFit Central"
              disabled={isSaving}
            />
          </label>

          <label className={saStyles.field}>
            <span>Ciudad</span>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={saStyles.input}
              placeholder="Santiago"
              disabled={isSaving}
            />
          </label>

          <div className={saStyles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={saStyles.secondaryAction}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={saStyles.primaryAction}
              disabled={isSaving || !gymName.trim()}
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
