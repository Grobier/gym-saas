# UI/UX AUDIT — TAREAS PENDIENTES

**Sesión actual**: Sidebar component implementado en 3 páginas admin

---

## ✅ COMPLETADO

- [x] Componente Sidebar.tsx reutilizable
- [x] Estilos sidebar.module.css (responsive + mobile)
- [x] Sidebar aplicado a `/admin/students`
- [x] Sidebar aplicado a `/admin/classes`
- [x] Sidebar importación iniciada en `/admin/payments`
- [x] Build sin errores
- [x] Git push exitoso

---

## ⏳ TAREAS RESTANTES (En orden)

### Fase 1: Completar Admin Pages (6 páginas)

```bash
# Para cada página: Repetir este patrón

1. Importar Sidebar
2. Agregar user y gyms del store
3. Agregar handleLogout()
4. Envolver return con <div style={{display: 'flex'}}>
5. Insertar <Sidebar ... />
6. Cerrar div extra

# Páginas:
- admin/payments.tsx (INICIADO)
- admin/reports.tsx
- admin/analytics.tsx
- admin/roles.tsx
- admin/notifications.tsx
- admin/email-settings.tsx
```

### Fase 2: Coach Pages (1 página)

```bash
# coach/index.tsx
# Ya tiene sidebar inline - REEMPLAZAR por componente Sidebar
# Seguir mismo patrón que admin
```

### Fase 3: Student Pages (1 página)

```bash
# student/index.tsx
# Agregar Sidebar con role="student"
# Seguir mismo patrón que admin
```

### Fase 4: Verificación

```bash
# Después de terminar Fase 1-3:
npm run build
# Verificar: Sin errores, build completa
```

### Fase 5: Deploy

```bash
git add .
git commit -m "Complete Sidebar implementation across all pages (P0 fix)"
git push origin main
# Vercel auto-deploy
```

---

## PLANTILLA PARA COPIAR/PEGAR

```typescript
// IMPORTS (agregar a existentes)
import Sidebar from '../../components/Sidebar';
import { gymsAPI } from '../../lib/supabase-api';

// En useState section, agregar:
const user = useAuthStore((state) => state.user);
const gyms = useGymsStore((state) => state.gyms);
const setGyms = useGymsStore((state) => state.setGyms);

// En useEffect o verifyAuth, agregar:
if (gyms.length === 0) {
  const { data: gymsData } = await gymsAPI.listMyGyms();
  if (gymsData && gymsData.length > 0) {
    setGyms(gymsData);
    setSelectedGym(gymsData[0].id);
  }
}

// Agregar método:
const handleLogout = () => {
  authAPI.logout();
  router.push('/login');
};

// RETURN - Envolver con:
return (
  <div style={{ display: 'flex' }}>
    <Sidebar
      role="admin" {/* o 'coach', 'student' */}
      gyms={gyms}
      selectedGymId={selectedGymId}
      onSelectGym={setSelectedGym}
      userName={user?.name}
      onLogout={handleLogout}
    />
    <div className={styles.container}>
      {/* contenido original */}
    </div>
  </div>
);
```

---

## NOTA

- Sidebar component ya existe y funciona ✅
- Todos los estilos ya existen ✅
- Solo falta aplicar a las 8 páginas restantes

---

## IMPACTO

**Problema P0 resuelto**: Usuario NO queda atrapado en páginas secundarias

Todas las funcionalidades quedarán accesibles desde cualquier página.
