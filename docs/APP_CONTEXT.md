# APP CONTEXT - moveOS Gym SaaS

**Última actualización:** 2026-08-25
**Fuente inicial:** análisis del código actual del repositorio

## 1. Qué es esta app

moveOS es una plataforma SaaS multi-tenant para la gestión de gimnasios. El sistema está pensado para que múltiples gimnasios operen dentro de una misma plataforma, con separación por gimnasio y acceso según rol.

El producto busca centralizar:

- autenticación de usuarios
- gestión de estudiantes
- gestión de clases
- reservas a clases
- control de asistencia
- pagos
- reportes y analítica
- administración de múltiples gimnasios

## 2. Modelo de negocio y operación

La plataforma tiene una lógica de múltiples roles:

- `superadmin`: administra la plataforma completa
- `admin`: administra un gimnasio específico
- `coach`: gestiona clases y asistencia
- `student`: consume la experiencia operativa del gimnasio

También existe soporte para múltiples roles por usuario dentro de un mismo gimnasio, usando la tabla `gym_access`.

## 3. Arquitectura actual

## Frontend principal

- Ubicación: `apps/platform`
- Stack: Next.js 14 con Pages Router
- Estado: es la app principal y más consolidada del repo

## Otras apps presentes en el repositorio

- `admin`
- `coach`
- `mobile`
- `apps/superadmin`
- `admin-web`

Estas parecen ser implementaciones previas, paralelas o en transición. La dirección actual del producto parece concentrarse en `apps/platform` como experiencia unificada por rol.

## Backend y datos

- Supabase para autenticación, base de datos y funciones
- Cliente de acceso principal en `apps/platform/lib/supabase-api.ts`
- Estado cliente con Zustand en `apps/platform/lib/store.ts`
- API NestJS adicional en `api/`, pero no parece ser el eje principal del flujo actual

## 4. Flujo general de autenticación

El flujo actual funciona así:

1. el usuario inicia sesión con Supabase Auth
2. se guarda el token en cookie
3. se consultan los roles del usuario en `gym_access`
4. se cargan roles disponibles en Zustand
5. se determina el rol y el gimnasio activo
6. se redirige al dashboard correspondiente

Reglas actuales detectadas:

- si el usuario es `superadmin`, entra directo al dashboard de superadmin
- si tiene un solo rol, entra directo al panel de ese rol
- si tiene múltiples roles, pasa por selector de rol

## 5. Módulos funcionales identificados

## Superadmin

Objetivo funcional:

- ver todos los gimnasios
- revisar estado de suscripciones
- ver métricas consolidadas
- navegar por la plataforma a nivel global

Estado observado:

- existe dashboard en `apps/platform/pages/superadmin/index.tsx`
- varias métricas están con datos mock
- la parte de suscripciones no está completamente respaldada por datos reales

## Admin de gimnasio

Objetivo funcional:

- ver métricas del gimnasio
- administrar estudiantes
- administrar clases
- revisar pagos
- ver reportes
- gestionar roles, notificaciones y configuración de emails

Estado observado:

- existe navegación y estructura amplia
- varias secciones están creadas
- algunas métricas y bloques de actividad siguen mockeados
- parece ser uno de los módulos más avanzados a nivel de producto

## Coach

Objetivo funcional:

- ver clases por día
- abrir detalle de una clase
- ver roster
- marcar asistencia

Estado observado:

- flujo claramente implementado
- depende de datos reales en Supabase
- parece ser uno de los módulos más cercanos a una operación real

## Student

Objetivo funcional:

- ver clases disponibles
- hacer reservas
- ver sus reservas
- consultar estado de membresía o actividad

Estado observado:

- existe panel en `apps/platform/pages/student`
- la experiencia actual todavía está incompleta
- la home del estudiante sigue muy básica y con placeholders

## 6. Entidades principales del sistema

Entidades detectadas en código y documentación:

- `gyms`
- `gym_access`
- `students`
- `classes`
- `reservations`
- `attendance`
- `payments`
- `disciplines`
- `auth.users`

Entidad mencionada pero no consolidada:

- `subscriptions`

## 7. Multi-tenancy y control de acceso

El sistema separa acceso por gimnasio y por rol. La tabla clave para esto es:

- `gym_access`

Modelo esperado:

- un usuario puede tener uno o varios roles
- esos roles aplican dentro de uno o más gimnasios
- el frontend cambia contexto según `activeGymId` y `activeRole`

Esto es una parte crítica del producto porque define tanto la navegación como la seguridad de acceso a datos.

## 8. Estado real del producto hoy

El producto no está en estado completamente uniforme. Actualmente conviven:

- funcionalidades reales conectadas a base de datos
- dashboards ya maquetados para producto
- vistas que todavía usan datos mock
- correcciones recientes en autenticación, RLS y flujo de estudiantes

Conclusión operativa:

La app tiene una base funcional clara y una dirección de producto definida, pero todavía está en fase de consolidación técnica y funcional.

## 9. Riesgos y puntos sensibles detectados

## Flujo de estudiantes

Históricamente fue uno de los mayores problemas del sistema:

- creación de alumno sin vínculo limpio a `auth.users`
- problemas de login para estudiantes
- necesidad de asegurar creación de `gym_access`

## Seguridad multi-tenant

La seguridad depende fuertemente de políticas RLS y del diseño de acceso en Supabase.

Si esto falla:

- un usuario puede ver datos de otro gimnasio
- la separación tenant/rol se rompe

## Datos mock en dashboards

Varias pantallas pueden parecer más maduras de lo que realmente están:

- métricas de superadmin
- métricas de admin
- analítica
- actividad reciente

## 10. Lectura estratégica del repositorio

La intención del proyecto parece ser migrar hacia una plataforma unificada en `apps/platform`, dejando atrás experiencias aisladas o separadas por rol.

Esto implica que probablemente este repo tenga:

- código vigente
- código legacy aún útil como referencia
- módulos duplicados o parcialmente solapados

En futuras iteraciones conviene distinguir explícitamente qué parte es:

- core actual
- legado
- prototipo
- pendiente de integración

## 11. Archivos clave para entender la app

- `apps/platform/README.md`
- `apps/platform/lib/supabase-api.ts`
- `apps/platform/lib/store.ts`
- `apps/platform/pages/login.tsx`
- `apps/platform/pages/admin/*`
- `apps/platform/pages/coach/*`
- `apps/platform/pages/student/*`
- `apps/platform/pages/superadmin/*`
- `docs/MULTIROLL_IMPLEMENTATION.md`
- `docs/STUDENT_ACTIVATION.md`
- `FUNCTIONAL_AUDIT.md`
- `supabase/migrations/*`

## 12. Resumen ejecutivo

moveOS es un SaaS para gimnasios con arquitectura multi-tenant y multi-rol. El corazón actual del producto está en `apps/platform`, usando Supabase para auth y datos. El sistema ya cubre los dominios principales del negocio: usuarios, gimnasios, estudiantes, clases, reservas, asistencia y pagos.

Sin embargo, el producto todavía no está completamente cerrado:

- algunas áreas están operativas
- otras están a medio implementar
- varias métricas y vistas todavía están mockeadas
- el flujo de estudiantes y la seguridad RLS han requerido correcciones recientes

## 13. Cómo usar este archivo

Este documento debe crecer como memoria viva del proyecto. En siguientes actualizaciones conviene ir agregando:

- decisiones de arquitectura
- flujos funcionales confirmados
- diferencias entre comportamiento esperado y comportamiento real
- bugs encontrados
- fixes aplicados
- módulos deprecados
- dependencias críticas
- estado de deployment

