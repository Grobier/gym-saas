import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { superadminAPI } from '../../lib/supabase-api';
import saStyles from '../../styles/superadmin.module.css';

interface CreateGymFormProps {
  onCreated?: () => Promise<void> | void;
}

interface CreateGymFormState {
  gym_name: string;
  city: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

const initialCreateGymState: CreateGymFormState = {
  gym_name: '',
  city: '',
  admin_name: '',
  admin_email: '',
  admin_password: '',
};

export default function CreateGymForm({ onCreated }: CreateGymFormProps) {
  const [creatingGym, setCreatingGym] = useState(false);
  const [formData, setFormData] = useState<CreateGymFormState>(initialCreateGymState);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.gym_name || !formData.admin_name || !formData.admin_email) {
      toast.error('Completa nombre del gimnasio, nombre del administrador y correo.');
      return;
    }

    setCreatingGym(true);

    try {
      const { data, error } = await superadminAPI.createGymWithAdmin({
        gym_name: formData.gym_name,
        city: formData.city,
        admin_name: formData.admin_name,
        admin_email: formData.admin_email,
        admin_password: formData.admin_password || undefined,
      });

      if (error) {
        throw new Error(typeof error === 'string' ? error : 'No se pudo crear el gimnasio');
      }

      toast.success(
        data?.temp_password
          ? `Gimnasio creado. Password temporal del admin: ${data.temp_password}`
          : 'Gimnasio y administrador creados'
      );

      setFormData(initialCreateGymState);
      await onCreated?.();
    } catch (runtimeError: any) {
      console.error('Create gym error:', runtimeError);
      toast.error(runtimeError?.message || 'No se pudo crear el gimnasio');
    } finally {
      setCreatingGym(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={saStyles.formStack}>
      <div className={saStyles.fieldGrid}>
        <label className={saStyles.field}>
          <span>Nombre del gym / box</span>
          <input
            name="gym_name"
            value={formData.gym_name}
            onChange={handleInputChange}
            className={saStyles.input}
            placeholder="CrossFit Central"
            disabled={creatingGym}
          />
        </label>
        <label className={saStyles.field}>
          <span>Ciudad</span>
          <input
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className={saStyles.input}
            placeholder="Santiago"
            disabled={creatingGym}
          />
        </label>
      </div>

      <div className={saStyles.fieldGrid}>
        <label className={saStyles.field}>
          <span>Administrador</span>
          <input
            name="admin_name"
            value={formData.admin_name}
            onChange={handleInputChange}
            className={saStyles.input}
            placeholder="Nombre del administrador"
            disabled={creatingGym}
          />
        </label>
        <label className={saStyles.field}>
          <span>Correo admin</span>
          <input
            name="admin_email"
            type="email"
            value={formData.admin_email}
            onChange={handleInputChange}
            className={saStyles.input}
            placeholder="admin@gym.com"
            disabled={creatingGym}
          />
        </label>
      </div>

      <label className={saStyles.field}>
        <span>Password temporal opcional</span>
        <input
          name="admin_password"
          value={formData.admin_password}
          onChange={handleInputChange}
          className={saStyles.input}
          placeholder="Si se deja vacío, se genera automáticamente"
          disabled={creatingGym}
        />
      </label>

      <div className={saStyles.actionRow}>
        <button
          type="button"
          onClick={() => setFormData(initialCreateGymState)}
          className={saStyles.secondaryAction}
          disabled={creatingGym}
        >
          Limpiar
        </button>
        <button type="submit" className={saStyles.primaryAction} disabled={creatingGym}>
          {creatingGym ? 'Creando...' : 'Crear Gym + Admin'}
        </button>
      </div>
    </form>
  );
}
