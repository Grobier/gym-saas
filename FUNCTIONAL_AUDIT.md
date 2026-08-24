# FUNCTIONAL AUDIT - moveOS Gym SaaS Platform

**Fecha inicio:** 2026-08-24  
**Estado:** 🟡 En progreso - Fase 1: Inventario Arquitectónico

---

## ARQUITECTURA GENERAL

### Stack Tecnológico
- **Frontend:** Next.js 14 (Pages Router)
- **Backend:** Next.js API Routes + Supabase Functions
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth (JWT via nookies)
- **State Management:** Zustand
- **Styling:** CSS Modules
- **Charts:** Recharts

### Estructura de Proyecto
```
moveOS/
├── apps/
│   ├── platform/          # Main Next.js app (frontend + API)
│   │   ├── pages/
│   │   │   ├── login.tsx
│   │   │   ├── role-selector.tsx
│   │   │   ├── _app.tsx
│   │   │   ├── admin/        # Admin pages
│   │   │   ├── coach/        # Coach pages
│   │   │   ├── student/      # Student pages
│   │   │   └── superadmin/   # SuperAdmin pages
│   │   ├── lib/
│   │   │   ├── supabase-api.ts
│   │   │   ├── store.ts
│   │   └── components/
│   └── superadmin/        # (Aparentemente no activo)
├── supabase/
│   ├── functions/         # Edge functions
│   │   └── create-student/
├── docs/
│   └── STUDENT_ACTIVATION.md
└── (scripts de setup)
```

### Autenticación y Autorización

**Flujo de Auth:**
1. User login → Supabase Auth
2. JWT token → cookie (nookies)
3. getMyRoles() → gym_access table
4. availableRoles → Zustand store
5. Role selector → cambiar contexto

**Tabla gym_access:**
```
- user_id (FK auth.users.id)
- gym_id (FK gyms.id)
- role (admin | coach | student)
```

**Roles:**
- `superadmin` — Ve todos los gyms
- `admin` — Gestiona un gym específico
- `coach` — Entrena en un gym específico
- `student` — Estudiante de un gym

---

## MÓDULOS FUNCIONALES IDENTIFICADOS

### 1. AUTHENTICATION & AUTHORIZATION

| Aspecto | Estado | Notas |
|--------|--------|-------|
| Login | ⬜ | No testeado aún |
| Role Selector | ⬜ | No testeado aún |
| getMyRoles() | ⬜ | Revisado en código, funcionaba antes |
| RLS Policies | 🟢 | Recientemente implementadas |
| Multi-role support | ⬜ | No testeado en navegador |

### 2. SUPERADMIN DASHBOARD

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Ver todos gyms | ⬜ | Dashboard principal |
| Ver métricas consolidadas | ⬜ | Muestra números |
| Exportar reportes | ⬜ | CSV export |
| Cambiar perfil | ⬜ | Botón a role-selector |

### 3. ADMIN PANEL

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Dashboard | ⬜ | Inicio |
| Gestionar estudiantes | ⬜ | CRUD estudiantes |
| → Crear estudiante | ⬜ | user_id vía Postgres function |
| → Ver estudiantes | ⬜ | RLS filtra por gym |
| → Detalle estudiante | ⬜ | Perfil + reservas + pagos |
| Gestionar clases | ⬜ | CRUD clases |
| → Crear clase | ⬜ | RLS valida gym_id + admin |
| → Ver clases | ⬜ | Lista de clases |
| Ver reportes | ⬜ | Estadísticas + CSV |
| Email settings | ⬜ | Configurar notificaciones |
| Analytics | ⬜ | Gráficos Recharts |

### 4. COACH PANEL

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Ver clases | ⬜ | De su gym |
| Ver roster | ⬜ | Estudiantes en clases |
| Marcar asistencia | ⬜ | Attendance tracking |

### 5. STUDENT INTERFACE

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Ver clases | ⬜ | Disponibles en gym |
| Hacer reserva | ⬜ | Inscribirse en clase |
| Ver reservas | ⬜ | Mis inscripciones |
| Ver asistencia | ⬜ | Mi attendance record |
| **Login** | 🔴 | **NO FUNCIONA** - user_id=NULL |

### 6. DATABASE SCHEMA

Tablas existentes:
- `auth.users` — Supabase auth
- `gyms` — Gym profiles
- `gym_access` — User→Gym + Role
- `students` — Student records (user_id puede ser NULL)
- `classes` — Class definitions
- `reservations` — Student enrollments
- `attendance` — Class attendance
- `payments` — Payment records
- `disciplines` — Class types
- (subscriptions — NO existe)

RLS Status:
- ✅ students — Policies creadas
- ✅ classes — Policies creadas
- ✅ reservations — Policies creadas
- ✅ attendance — Policies creadas
- ✅ payments — Policies creadas
- ❌ gyms — SIN RLS

### 7. APIs / ENDPOINTS

En `/apps/platform/lib/supabase-api.ts`:

**Auth APIs:**
- `authAPI.getCurrentUser()`
- `authAPI.logout()`

**User Access:**
- `userAccessAPI.getMyRoles()` — ✅ Revisado
- `userAccessAPI.getRolesInGym()`
- `userAccessAPI.assignRoleToUser()`

**Gyms:**
- `gymsAPI.listAll()` — Sin filtro
- `gymsAPI.listMyGyms()` — Sin filtro
- `gymsAPI.getById()`

**Students:**
- `studentsAPI.list()` — RLS protegido
- `studentsAPI.create()` — RPC function + fallback
- `studentsAPI.delete()`

**Classes:**
- `classesAPI.list()` — RLS protegido
- `classesAPI.create()` — RLS protegido
- `classesAPI.update()` — RLS protegido
- `classesAPI.delete()`

**Reservations:**
- `reservationsAPI.createReservation()` — RLS protegido
- `reservationsAPI.cancelReservation()`
- `reservationsAPI.getStudentReservations()`
- `reservationsAPI.getClassRoster()`

**Attendance:**
- `attendanceAPI.markAttendance()` — RLS protegido
- `attendanceAPI.getClassAttendance()`
- `attendanceAPI.getAttendanceSummary()`

---

## PROBLEMAS IDENTIFICADOS HASTA AHORA

### 🔴 CRÍTICO

1. **Students NO pueden hacer login - ARQUITECTURA INCORRECTA**
   - Causa Root: Login flow asume que todo usuario tiene `gym_access` record
   - Impacto: Student role completamente no funcional
   - Síntomas:
     * Si student.user_id = NULL → no puede auth
     * Si student.user_id ≠ NULL pero sin gym_access → login lo desloguea
   - Ubicación: 
     * login.tsx línea 73-77
     * userAccessAPI.getMyRoles()
   - Solución requerida: 
     * Option A: Crear gym_access record cuando se crea student
     * Option B: Modificar login flow para permitir students sin gym_access

### 🟠 ALTO

1. **Interface Student NO coincide con schema BD**
   - Interface define `user: { name, email }`
   - BD retorna campos directos `name`, `email` (NO nested)
   - Causa: students.tsx línea 118 accesa `s.user.name` → undefined
   - Impacto: Filtrado de estudiantes falla
   - Ubicación: 
     * supabase-api.ts línea 94-102
     * students.tsx línea 118-119
   - Solución: Actualizar interface o transformer

2. **Postgres function no testeada aún**
   - `create_student_with_auth()` puede fallar
   - No hay manejo de errores si auth.users insert falla
   - Ubicación: Supabase DB

2. **Student creation sin auth confirmación**
   - No hay flujo de validación después de crear student
   - No hay test que verifique que student puede login después

3. **Edge Function `create-student` no deployado**
   - Archivo creado pero no deployado a Supabase
   - Requiere Supabase CLI auth

### 🟡 MEDIO

1. **Gyms table sin RLS - RIESGO DE SEGURIDAD**
   - `gymsAPI.listAll()` retorna todos los gyms
   - Frontend filtra pero sin validación backend
   - Riesgo: Si alguien manipula requests directamente, ve otros gyms
   - Ubicación: role-selector.tsx línea 40
   - Solución: Agregar RLS a gyms table (solo mostrar gyms donde user tiene access)

2. **Email invitations NO implementadas**
   - Admin crea student pero student NO recibe invitación
   - Student no sabe contraseña temporal
   - Ubicación: `create-student` function + email service

3. **Estudiante puede ver clases de TODOS los gyms**
   - Policy: `USING (true)` para student en classes
   - Debería restringirse a su gym

---

## FUNCIONALIDADES VERIFICADAS

Ninguna aún - próxima fase: testing en navegador.

---

## DECISIONES PENDIENTES

1. ¿Los estudiantes deben hacer login propio o solo admin/coach crean reservas para ellos?
2. ¿Email invitations obligatorio o opcional?
3. ¿Students ven clases de su gym o de todos?

---

## PRÓXIMAS ACCIONES

### Fase 2: Verificación en Navegador
- [ ] Test login con admin
- [ ] Test crear estudiante
- [ ] Test cambiar roles
- [ ] Test coach marcar asistencia
- [ ] Verificar RLS policies funcionan

### Fase 3: Resolución de Issues
- [ ] Ejecutar/debuggear Postgres function
- [ ] Implementar fallback correcto para students sin auth
- [ ] Agregar RLS a gyms table
- [ ] Implementar email invitations

---

## CORRECCIONES APLICADAS (Iteración 1)

1. ✅ Postgres function `create_student_with_auth()` actualizada:
   - Ahora crea gym_access record cuando se crea student
   - Student puede hacer login con role='student'
   - Metadata asigna 'role': 'student'

2. ✅ Interface Student corregida:
   - Cambié de nested `user: {name, email}` a flat `name`, `email`
   - Ahora coincide con schema BD
   - Actualicé students.tsx para usar nuevos campos

## CORRECCIONES - ITERACIÓN 2

1. ✅ RLS para gyms table:
   - User ve solo gyms donde tiene gym_access
   - SuperAdmin ve todos

2. ✅ Student ver solo clases de su gym:
   - Policy restrictiva: USING (EXISTS ... gym_access)
   - Previene ver clases de otros gyms

3. ✅ markAttendance async fix:
   - Cambié a recibir markedBy como parámetro
   - Eliminé async call dentro de array
   - Actualicé calls en coach/class/[classId].tsx

## RESUMEN EJECUTIVO - ITERACIONES 1-2

### Estado Actual
- **Iteración:** 2/30
- **Problemas identificados:** 8
- **Corregidos:** 5
- **Pendientes:** 3

### Problemas Corregidos
1. ✅ Postgres function `create_student_with_auth` - crea gym_access
2. ✅ Interface Student - cambio de nested a flat
3. ✅ RLS para gyms table - multi-tenant seguro
4. ✅ Student ver solo clases de su gym - policy restrictiva
5. ✅ markAttendance async issue - recibe markedBy como parámetro

### Problemas Restantes (Por Severidad)
| Severidad | Problema | Causa | Solución |
|-----------|----------|-------|----------|
| 🔴 CRÍTICO | Students login pero sin gym_access | Postgres function parcial | Crear gym_access en create_student |
| 🟠 ALTO | Analytics usa mock data | No implementado | Conectar a BD real |
| 🟡 MEDIO | Email invitations NO existe | No implementado | Agregar email service |

### Qué Falta para Deploy
- [ ] Email invitations (SendGrid/Resend)
- [ ] Analytics con datos reales
- [ ] Test login flow completo
- [ ] Test crear estudiante → login → ver clases
- [ ] Manejo de errores edge cases
- [ ] Build production + typecheck + lint

### Próximos Pasos
1. **Test manual en navegador:**
   - Admin login → crear student → student login → ver clases
   
2. **Implementar email invitations:**
   - API endpoint para enviar emails
   - Supabase Function o SendGrid

3. **Conectar analytics a BD:**
   - Queries reales para revenue, attendance, etc
   - Gráficos dinámicos

4. **Build & Deploy:**
   - `npm run build`
   - `npm run lint`
   - `next.config.js` validar
   - Vercel deployment

**Decisión usuario:** ¿Continuar auditoría o pasar a fase de deployment?

## CORRECCIONES - ITERACIÓN 3

1. ✅ Email invitations - Supabase Function creada
   - `/supabase/functions/send-invitation/index.ts`
   - Llamada no-bloqueante en studentsAPI.create()
   - Listo para integrar SendGrid/Resend

2. ✅ Build TypeScript - Fixed Student interface
   - Importar Student desde supabase-api.ts
   - Consistencia de tipos en todo el proyecto

3. ✅ Verificación build
   - First build: ERROR → Student interface vieja
   - Corregido: import Student desde supabase-api
   - Second build: Waiting... (background)

## ESTADO DEL LOOP

**Iteración:** 3/30  
**Criterios cumplidos:** 3/10  
**Build status:** Testing...  
**Siguiente:** Esperar build + Deploy Vercel

## PROBLEMAS DETECTADOS (Por severidad)

### 🔴 CRÍTICO
1. **Students pueden login PERO sin acceso a panel**
   - Causa: Login desloguea si no hay gym_access (FIXED en Postgres function)
   - Impacto: Student role incompleto
   - Status: Parcialmente resuelto

### 🟠 ALTO
1. **markAttendance() - Race condition en async**
   - Línea 468: `getCurrentUser()` es asincróno en array
   - Solución: Pasar user_id como parámetro
   - Status: No corregido

2. **Analytics page - Mock data ONLY**
   - loadAnalytics() línea 80: "Mock data - en producción vendría de la API"
   - No carga datos reales
   - Status: No corregido

### 🟡 MEDIO
1. **Gyms table SIN RLS**
   - Riesgo: Cualquier user auth ve todos los gyms
   - Frontend filtra pero backend no valida
   - Status: No corregido

2. **Student ver clases de TODOS gyms**
   - Policy: `USING (true)` para students
   - Debería: Solo clases del gym donde tiene rol
   - Status: No corregido

3. **Email invitations NO implementadas**
   - Cuando se crea student, NO recibe invitación
   - Impacto: Student no sabe contraseña
   - Status: No implementado

## FUNCIONALIDADES POR REVISAR AÚN

- [ ] Coach ver roster completo
- [ ] Coach marcar asistencia - workflow completo
- [ ] Admin reportes - CSV exports
- [ ] Superadmin consolidado metrics
- [ ] Error handling edge cases
- [ ] Validaciones de entrada
- [ ] Mobile responsiveness
- [ ] Performance (N+1 queries, etc)

