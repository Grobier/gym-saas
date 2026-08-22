# Multi-Role Implementation Guide

## Overview

Esta guía documenta la implementación de soporte para múltiples roles por usuario en un mismo gimnasio. Permite que una persona (ej: administrador que también entrena) tenga acceso a múltiples interfaces sin duplicar cuentas de usuario.

## Modelo de Datos

### Tabla: `gym_access`

```sql
CREATE TABLE gym_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, gym_id, role)  -- Permite múltiples roles, previene duplicados
);
```

### Restricción de Unicidad

```
UNIQUE(user_id, gym_id, role)
```

Esto permite:
- ✅ user_id=X + gym_id=A + role=admin
- ✅ user_id=X + gym_id=A + role=coach
- ❌ user_id=X + gym_id=A + role=admin (duplicado)

## Funciones SQL

### `get_user_roles_by_gym(p_user_id UUID)`

Obtiene todos los roles de un usuario en todos sus gimnasios.

```sql
SELECT gym_id, role FROM gym_access 
WHERE user_id = $1 
ORDER BY gym_id, role;
```

### `get_user_roles_in_gym(p_user_id UUID, p_gym_id UUID)`

Obtiene los roles de un usuario en un gimnasio específico.

```sql
SELECT DISTINCT role FROM gym_access
WHERE user_id = $1 AND gym_id = $2
ORDER BY role;
```

## State Management (Frontend)

### Zustand Store: `useAuthStore`

```typescript
interface AuthStore {
  user: User | null;                    // Usuario actual
  availableRoles: UserAccess[];         // Todos los roles del usuario
  activeGymId: string | null;           // Gimnasio activo actual
  activeRole: string | null;            // Rol activo actual
}
```

#### Persistencia

- `activeGymId` y `activeRole` se persisten en `localStorage`
- Se restauran automáticamente al recargar la página
- Se valida que los roles persisted sigan siendo válidos

## Flujo de Autenticación

### 1. Login (`pages/login.tsx`)

```
Usuario ingresa email/password
  ↓
Supabase autentica
  ↓
Se obtiene user.user_metadata.role (para superadmin)
  ↓
Se consulta gym_access para obtener todos los roles
  ↓
Condicional:
  - Si es superadmin → ir a /superadmin
  - Si tiene 0 roles → error
  - Si tiene 1 rol → ir directo al dashboard
  - Si tiene 2+ roles → mostrar selector de rol
```

### 2. Selector de Rol (`pages/role-selector.tsx`)

Se muestra cuando un usuario tiene múltiples roles/gimnasios.

Permite:
- Seleccionar un gimnasio
- Seleccionar un rol dentro de ese gimnasio
- Ir al dashboard correspondiente

### 3. Dashboard (ej: `pages/coach/index.tsx`)

En el header, si hay múltiples roles:
- Mostrar dropdown con roles disponibles
- Permitir cambiar de rol sin re-autenticar
- Redirigir al dashboard del nuevo rol

## Componentes

### `RoleSelector.tsx`

Dropdown para seleccionar rol activo en un gimnasio.

**Props:**
- `gymId: string | null` - Gimnasio actual
- `currentRole: string | null` - Rol activo actual

**Comportamiento:**
- Se muestra solo si hay 2+ roles en el gimnasio
- Al seleccionar, guarda en store y redirige
- Valida que el rol sea uno de los asignados

## APIs

### `userAccessAPI`

#### `getMyRoles()`
Obtiene todos los roles del usuario autenticado.

```typescript
const { data, error } = await userAccessAPI.getMyRoles();
// data: UserAccess[] = [{ gym_id, role }, ...]
```

#### `getRolesInGym(gymId: string)`
Obtiene los roles del usuario en un gimnasio específico.

```typescript
const { data } = await userAccessAPI.getRolesInGym(gymId);
// data: string[] = ['admin', 'coach']
```

#### `assignRoleToUser(userId: string, gymId: string, role: string)`
Asigna un rol a un usuario en un gimnasio.

```typescript
const { data, error } = await userAccessAPI.assignRoleToUser(
  userId,
  gymId,
  'coach'
);
```

#### `removeRoleFromUser(userId: string, gymId: string, role: string)`
Remueve un rol de un usuario en un gimnasio.

```typescript
const { data, error } = await userAccessAPI.removeRoleFromUser(
  userId,
  gymId,
  'coach'
);
```

## Helpers

### `getAvailableRolesInGym(availableRoles, gymId)`

Retorna los roles de un usuario en un gimnasio específico.

```typescript
const roles = getAvailableRolesInGym(availableRoles, activeGymId);
// ['admin', 'coach']
```

### `hasRoleInGym(availableRoles, gymId, role)`

Verifica si un usuario tiene un rol específico en un gimnasio.

```typescript
const isAdmin = hasRoleInGym(availableRoles, gymId, 'admin');
```

## Casos de Uso

### Caso 1: Usuario con un solo rol

```
Login → gym_access retorna 1 rol
  ↓
Redirige directamente al dashboard
  ↓
No muestra selector de rol
```

### Caso 2: Usuario admin + coach en mismo gym

```
Login → gym_access retorna:
  - { gym_id=A, role='admin' }
  - { gym_id=A, role='coach' }
  ↓
Muestra selector de rol
  ↓
Usuario elige rol
  ↓
Redirige al dashboard (admin o coach)
  ↓
En dashboard, dropdown permite cambiar de rol
```

### Caso 3: Usuario coach en dos gimnasios

```
Login → gym_access retorna:
  - { gym_id=A, role='coach' }
  - { gym_id=B, role='coach' }
  ↓
Muestra selector de rol (permitir elegir gym)
  ↓
Usuario elige gym + rol
  ↓
Redirige a /coach
  ↓
activeGymId se usa para cargar datos del gym B
```

### Caso 4: Superadmin

```
User metadata tiene role='superadmin'
  ↓
Ignora gym_access
  ↓
Redirige directamente a /superadmin
  ↓
No requiere selección de gym/rol
```

## Seguridad

### RLS (Row-Level Security)

```sql
-- Solo service_role puede insertar/actualizar/eliminar
CREATE POLICY "Service role can manage gym access"
ON gym_access FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Los usuarios pueden ver sus propios accesos
CREATE POLICY "Users can view own gym access"
ON gym_access FOR SELECT
USING (user_id = auth.uid());
```

### Validaciones Frontend

- No permite seleccionar roles no asignados
- Valida persistencia en localStorage vs base de datos
- Si el rol persisted ya no es válido, selecciona uno válido automáticamente

### Validaciones Backend

- Las RLS policies previenen que usuarios accedan a datos de otros
- Las APIs retornan solo los roles asignados
- Cualquier cambio de rol requiere que el usuario tenga ese rol

## Migraciones

### Migration 002: `002_enable_multiroll_per_gym.sql`

Cambios:
- ✅ Elimina restricción `UNIQUE(user_id, gym_id)`
- ✅ Agrega restricción `UNIQUE(user_id, gym_id, role)`
- ✅ Crea funciones SQL para obtener roles
- ✅ Actualiza RLS policies
- ✅ Crea índices para performance

Compatibilidad:
- ✅ No elimina datos existentes
- ✅ Los usuarios con 1 rol continúan funcionando
- ✅ Permite agregar roles adicionales sin problemas

## Próximos Pasos

### Corto Plazo
- [ ] Aplicar migration 002 en Supabase
- [ ] Agregar selector de rol en dashboards de admin y student
- [ ] Pruebas E2E para cambio de rol

### Mediano Plazo
- [ ] Agregar UI para admins asignar roles a usuarios
- [ ] Audit log de cambios de rol
- [ ] Soporte para roles en múltiples gimnasios

### Largo Plazo
- [ ] Roles dinámicos/customizables
- [ ] Permisos granulares por role
- [ ] Delegación de roles

## Troubleshooting

### Usuario ve 404 en selector de rol

```
Posible causa: gym_access tabla vacía o no tiene datos
Solución: Insertar registro en gym_access directamente
```

```sql
INSERT INTO gym_access (user_id, gym_id, role)
VALUES (uuid, gym_uuid, 'coach');
```

### Cambio de rol no funciona

```
Posible causa: activeRole no se sincroniza con availableRoles
Solución: Verificar en console que availableRoles tenga el rol seleccionado
```

### Selector de rol no aparece

```
Posible causa: Usuario tiene solo 1 rol
Solución: Normal, solo aparece con 2+ roles
```

## Referencias

- [Zustand Store Pattern](./ARCHITECTURE.md#zustand)
- [Supabase RLS Guide](./SUPABASE_SETUP.md)
- [Authentication Flow](./AUTHENTICATION.md)
