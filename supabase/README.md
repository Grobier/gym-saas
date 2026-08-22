# Supabase Migrations

## Aplicar migraciones manualmente

Si no usas Supabase CLI, aplicar manualmente en Supabase:

1. Ve a https://app.supabase.com → Tu proyecto
2. Click en **SQL Editor** (izquierda)
3. Click en **New Query**
4. Copia el contenido de `migrations/001_fix_gym_access_rls.sql` (primero)
5. Ejecuta (Ctrl + Enter o botón Play)
6. Luego, copia el contenido de `migrations/002_enable_multiroll_per_gym.sql`
7. Ejecuta

## Orden de Migraciones

Aplica en este orden:

1. ✅ `001_fix_gym_access_rls.sql` - Crea tabla gym_access
2. ✅ `002_enable_multiroll_per_gym.sql` - Habilita soporte para múltiples roles

## Migración: 001_fix_gym_access_rls.sql

**Qué hace:**
- Define correctamente la tabla `gym_access` con estructura correcta
- Crea una función PostgreSQL SECURITY DEFINER para evitar recursión RLS
- Implementa RLS policies simples sin ciclos
- Crea índices para performance

**Problema que resuelve:**
- Error 500 en consultas a `gym_access` causado por recursión en RLS policies
- Pantalla Loading infinito cuando usuario no tiene acceso a gimnasios

**Requisitos previos:**
- Usuario admin debe tener al menos 1 fila en `gym_access` con role='admin'

## Migración: 002_enable_multiroll_per_gym.sql

**Qué hace:**
- Cambia restricción UNIQUE de `(user_id, gym_id)` a `(user_id, gym_id, role)`
- Permite que un usuario tenga múltiples roles en el mismo gimnasio
- Crea funciones SQL para obtener roles de usuario
- Actualiza RLS policies
- Crea índices para performance

**Problema que resuelve:**
- Permite que admin+coach sea una sola persona
- No requiere duplicar usuarios/cuentas

**Compatible con:**
- ✅ Usuarios existentes con rol único (continúan funcionando)
- ✅ Nuevos usuarios con múltiples roles

## Verificar después de aplicar

Desde SQL Editor, ejecuta:

```sql
-- Verificar tabla existe
SELECT * FROM gym_access LIMIT 5;

-- Verificar RLS activo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'gym_access';

-- Verificar función existe
SELECT proname FROM pg_proc WHERE proname = 'get_user_gyms';
```

## Datos de prueba

```sql
-- Agregar usuario admin a gimnasio (después de crear usuario en auth.users)
INSERT INTO gym_access (user_id, gym_id, role)
VALUES (
  '88ada3e6-c31b-4cb8-9860-dbb61b991d0e',  -- reemplaza con user_id real
  'gym-uuid-aqui',                          -- reemplaza con gym_id real
  'admin'
);
```
