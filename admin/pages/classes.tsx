import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { classesAPI } from '../lib/supabase-api';

interface Class {
  id: string;
  name: string;
  discipline_id: string;
  schedule: string;
  capacity: number;
  enrolled: number;
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      // TODO: Get gymId from context or route
      const gymId = 'default-gym-id';
      const { data, error } = await classesAPI.list(gymId);
      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast.error('Failed to load classes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Classes</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Schedule</th>
            <th>Capacity</th>
            <th>Enrolled</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr key={cls.id}>
              <td>{cls.name}</td>
              <td>{cls.schedule}</td>
              <td>{cls.capacity}</td>
              <td>{cls.enrolled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
