# UI/UX AUDIT — moveOS

**Estado**: 🟡 En revisión  
**Fecha inicio**: 2026-08-24  
**Última actualización**: 2026-08-24

---

## RESUMEN EJECUTIVO

Auditoría UI/UX de moveOS Gym SaaS multi-tenant.

Aplicación: Next.js 14 con Pages Router  
Roles: Superadmin, Admin, Coach, Student  
Estado actual: Funcional pero con inconsistencias UX

---

## SITEMAP ACTUAL

### 🔐 Authentication

| Pantalla | Ruta | Rol | Navegable | Estado |
| -------- | ---- | --- | --------- | ------ |
| Login | `/login` | Público | ✅ | 🟢 |
| Role Selector | `/role-selector` | Autenticado | ✅ | 🟡 |

### 👑 Superadmin

| Pantalla | Ruta | Navegable | Estado |
| -------- | ---- | --------- | ------ |
| Dashboard | `/superadmin` | ✅ | 🟡 |
| Reports | `/superadmin/reports` | ✅ | 🟡 |

### 🏢 Admin (Gimnasio)

| Pantalla | Ruta | Navegable | Estado |
| -------- | ---- | --------- | ------ |
| Dashboard | `/admin` | ✅ | 🟡 |
| Estudiantes | `/admin/students` | ✅ | 🟢 |
| Detalle Estudiante | `/admin/students/[id]` | ✅ | 🟡 |
| Clases | `/admin/classes` | ✅ | 🟡 |
| Nueva Clase | `/admin/classes/new` | ✅ | 🟡 |
| Editar Clase | `/admin/classes/[id]/edit` | ✅ | 🟡 |
| Pagos | `/admin/payments` | ✅ | 🟡 |
| Reportes | `/admin/reports` | ✅ | 🟡 |
| Analytics | `/admin/analytics` | ✅ | 🟡 |
| Roles | `/admin/roles` | ✅ | 🟡 |
| Notificaciones | `/admin/notifications` | ✅ | 🟡 |
| Email Settings | `/admin/email-settings` | ✅ | 🟡 |

### 🏋️ Coach (Entrenador)

| Pantalla | Ruta | Navegable | Estado |
| -------- | ---- | --------- | ------ |
| Dashboard | `/coach` | ✅ | 🟡 |
| Clase Detalle | `/coach/class/[id]` | ✅ | 🟡 |

### 📚 Student (Alumno)

| Pantalla | Ruta | Navegable | Estado |
| -------- | ---- | --------- | ------ |
| Home | `/student` | ✅ | 🟡 |
| Clases | `/student/classes` | ✅ | 🟡 |
| Mis Reservas | `/student/my-bookings` | ✅ | 🟡 |

---

## PROBLEMAS P0 (BLOQUEANTES)

| ID | Rol | Problema | Severidad | Causa | Acción |
| -- | --- | -------- | --------- | ----- | ------ |
| P0-1 | Admin | Sidebar solo en dashboard → usuario atrapado en /admin/students | CRÍTICO | Sidebar no reutilizable | Crear componente Sidebar |
| P0-2 | Admin/Coach/Student | No hay navegación en páginas secundarias | CRÍTICO | Arquitectura monolítica | Aplicar layout a todas páginas |
| P0-3 | RoleSelector | Va directo a /coach en lugar de mostrar selector | GRAVE | Lógica login incompleta | Revisar flujo role-selector |

---

## PROBLEMAS P1 (GRAVES)

| ID | Rol | Problema | Severidad | Causa | Acción |
| -- | --- | -------- | --------- | ----- | ------ |
| P1-1 | Admin | Métri

cas son mock (no datos reales) | MEDIA | TODO en código | Conectar a datos reales |
| P1-2 | Student | Experiencia muy compleja para alumno | MEDIA | No simplificada | Revisar flujos student |
| P1-3 | Admin | Falta "volver" en /admin/students/[id] | MEDIA | Navegación incompleta | Agregar breadcrumb/botón volver |
| P1-4 | Mobile | Sin navegación móvil específica | MEDIA | No responsiva | Crear hamburger menu |

---

## ACCIONES COMPLETADAS

### Componente Sidebar ✅
✅ Creado componente Sidebar.tsx reutilizable  
✅ Creados estilos sidebar.module.css responsivos  
✅ Soporta todos los roles (superadmin, admin, coach, student)  
✅ Mobile responsive con hamburger menu  

### Aplicación de Sidebar - ADMIN 🟡
✅ `/admin/students` - Sidebar aplicado
✅ `/admin/classes` - Sidebar aplicado
🟡 `/admin/payments` - En progreso
⏳ `/admin/reports` - Pendiente
⏳ `/admin/analytics` - Pendiente
⏳ `/admin/roles` - Pendiente
⏳ `/admin/notifications` - Pendiente
⏳ `/admin/email-settings` - Pendiente

### Próximos pasos
⏳ Completar aplicación a todas páginas admin
⏳ Aplicar Sidebar a coach y student
⏳ Build y deploy a Vercel
⏳ Conectar métricas a datos reales (P1)
⏳ Agregar breadcrumbs (P1)  

---

## RESUMEN DE AUDITORÍA

**Estado actual**: Aplicación funcional pero con navegación fragmentada

**Problemas críticos identificados**:
1. Sidebar solo en dashboard → usuarios atrapados en páginas secundarias
2. Métricas mock (no hay datos reales)
3. Falta breadcrumbs/botones "volver"
4. Mobile navigation inexistente
5. Inconsistencias en patrones de acciones

**Recomendación**: Implementar este plan de forma incremental

---

# 1. PRIMERA FASE: NO MODIFICAR

Antes de cambiar cualquier componente, inspecciona completamente:

* `admin`
* `admin-web`
* `coach`
* `mobile`
* `apps`
* componentes compartidos;
* layouts;
* navegación;
* routing;
* design system;
* componentes UI;
* estilos globales;
* iconografía;
* formularios;
* tablas;
* modales;
* drawers;
* menús;
* dashboards.

Determina cuál aplicación corresponde a cada rol.

Identifica componentes compartidos antes de crear nuevos.

No dupliques componentes existentes innecesariamente.

---

# 2. CREAR MAPA DE EXPERIENCIA

Actualiza `UI_UX_AUDIT.md` con un inventario de pantallas.

Para cada pantalla registra:

| App | Rol | Pantalla | Ruta | Objetivo | Navegable | Responsive | Estado |
| --- | --- | -------- | ---- | -------- | --------- | ---------- | ------ |

Estados:

* ⬜ Pendiente
* 🟡 En revisión
* 🟢 Correcto
* 🟠 Mejorable
* 🔴 Problema UX
* 🔵 Mejorado

---

# 3. AUDITAR NAVEGACIÓN

Esta es una prioridad crítica.

Para cada rol comprueba:

## ¿Puede llegar a todas las funcionalidades que debería utilizar?

No consideres que una página existe funcionalmente si:

* existe una ruta pero no hay acceso visible;
* solo puede abrirse escribiendo la URL;
* no existe botón para volver;
* no existe navegación contextual;
* la acción principal está escondida;
* el usuario queda atrapado en la pantalla.

Revisa:

* sidebar;
* navegación superior;
* navegación móvil;
* breadcrumbs;
* pestañas;
* menús secundarios;
* botones volver;
* enlaces entre módulos;
* accesos rápidos;
* menús de acciones;
* navegación después de crear/editar/eliminar.

---

# 4. AUDITAR ARQUITECTURA DE INFORMACIÓN

Para cada aplicación determina si la estructura de navegación tiene sentido.

Comprueba:

* agrupación de módulos;
* nombres de secciones;
* orden de navegación;
* profundidad de navegación;
* duplicación de opciones;
* opciones difíciles de encontrar;
* funcionalidades ubicadas en categorías incorrectas.

Reduce carga cognitiva.

No agregues elementos al menú solo porque existe una funcionalidad.

Agrupa funcionalidades relacionadas.

---

# 5. AUDITAR JERARQUÍA VISUAL

En cada pantalla responde:

1. ¿Qué es lo primero que debería mirar el usuario?
2. ¿Cuál es la acción principal?
3. ¿Cuáles son acciones secundarias?
4. ¿Qué información necesita primero?
5. ¿Qué información puede quedar en segundo nivel?

Comprueba:

* título de página;
* descripción contextual;
* CTA principal;
* acciones secundarias;
* tarjetas;
* métricas;
* tablas;
* filtros;
* jerarquía tipográfica;
* espaciado;
* agrupación visual.

No hagas todas las acciones visualmente equivalentes.

---

# 6. AUDITAR CONSISTENCIA

Busca inconsistencias entre pantallas.

Especialmente:

* botones;
* tamaños;
* radios;
* sombras;
* bordes;
* espaciado;
* tipografía;
* iconos;
* encabezados;
* formularios;
* tablas;
* cards;
* modales;
* dropdowns;
* tooltips;
* badges;
* tabs;
* filtros.

Acciones equivalentes deben usar patrones equivalentes.

Ejemplo:

`Crear alumno`

no debería aparecer como:

* botón azul en una pantalla;
* ícono sin texto en otra;
* opción dentro de tres puntos en otra.

Define y reutiliza patrones.

---

# 7. AUDITAR ACCIONES

Identifica controles que:

* parecen clickeables pero no funcionan;
* funcionan pero no parecen clickeables;
* no tienen feedback;
* no muestran estado loading;
* permiten doble envío;
* no confirman acciones destructivas;
* no comunican errores;
* no muestran éxito.

Revisa especialmente:

* crear;
* editar;
* eliminar;
* guardar;
* cancelar;
* reservar;
* confirmar;
* activar;
* desactivar;
* congelar;
* pagar;
* asignar;
* cambiar rol.

---

# 8. ESTADOS DE INTERFAZ

Cada pantalla que dependa de datos debería considerar al menos:

## Loading

Nunca mostrar una pantalla aparentemente rota mientras carga.

Usar:

* skeleton;
* loader;
* placeholder apropiado.

## Empty

No mostrar solamente:

`No hay datos`

Explicar:

* qué significa;
* por qué está vacío;
* cuál es la siguiente acción posible.

Ejemplo:

`Todavía no tienes clases creadas.`

CTA:

`Crear primera clase`

## Error

El usuario debe saber:

* qué ocurrió;
* qué puede hacer;
* si puede volver a intentarlo.

## Success

Después de acciones importantes debe existir feedback visible.

---

# 9. FORMULARIOS

Audita todos los formularios.

Comprueba:

* labels visibles;
* placeholders adecuados;
* campos requeridos;
* formatos;
* validaciones;
* mensajes de error;
* estados disabled;
* loading;
* guardado;
* cancelación;
* orden lógico;
* navegación con teclado.

No dependas únicamente del placeholder para explicar un campo.

Agrupa campos relacionados.

---

# 10. TABLAS Y LISTADOS

Para cada tabla revisa:

* búsqueda;
* filtros;
* orden;
* paginación;
* acciones;
* selección;
* estados;
* densidad;
* responsive;
* empty state;
* loading;
* error state.

Determina si en móvil una tabla debería transformarse en cards o una representación más apropiada.

No fuerces tablas de escritorio dentro de pantallas móviles estrechas.

---

# 11. RESPONSIVE

Revisa al menos:

* móvil pequeño;
* móvil;
* tablet;
* notebook;
* escritorio.

Comprueba:

* sidebar;
* menú móvil;
* tablas;
* modales;
* formularios;
* cards;
* dashboards;
* encabezados;
* botones;
* filtros.

No ocultes funcionalidades críticas en móvil sin ofrecer una alternativa.

---

# 12. ACCESIBILIDAD

Comprueba:

* contraste;
* tamaño de texto;
* foco visible;
* navegación por teclado;
* labels;
* estados disabled;
* aria-label cuando corresponda;
* botones reales para acciones;
* enlaces reales para navegación;
* zonas clickeables suficientemente grandes.

No conviertas `div` en botones si puede utilizarse un elemento semántico.

---

# 13. DASHBOARD

Audita específicamente los dashboards.

Cada dashboard debe responder rápidamente:

* ¿qué está pasando?
* ¿hay algo que requiera atención?
* ¿qué puedo hacer ahora?

Evita dashboards llenos de métricas sin utilidad.

Prioriza información accionable.

---

# 14. ROLES

Revisa individualmente la experiencia de:

## Superadministrador

Debe poder gestionar la plataforma global sin mezclarse con tareas operativas de un gimnasio.

## Administrador del gimnasio

Debe encontrar fácilmente:

* alumnos;
* coaches;
* clases;
* planes;
* reservas;
* pagos;
* asistencia;
* reportes;
* configuración.

## Coach

Debe priorizar:

* próximas clases;
* alumnos;
* asistencia;
* planificación;
* información necesaria para impartir la clase.

No debería ver administración innecesaria.

## Alumno

Debe priorizar:

* próximas clases;
* reservar;
* cancelar;
* plan;
* clases disponibles;
* historial;
* perfil.

Su experiencia debe ser mucho más simple que la administrativa.

---

# 15. NAVEGACIÓN POR ROL

Construye un sitemap propuesto para cada rol.

Registra en `UI_UX_AUDIT.md`:

## Superadmin

...

## Admin

...

## Coach

...

## Alumno

...

Compara el sitemap ideal con la navegación actual.

Marca funcionalidades:

* existentes y accesibles;
* existentes pero escondidas;
* duplicadas;
* sin acceso;
* innecesarias;
* faltantes.

---

# 16. FUNCIONALIDADES UX FALTANTES

Busca funcionalidades de interfaz que deberían existir para completar un flujo, aunque la lógica de negocio ya esté implementada.

Ejemplos:

* volver;
* cancelar;
* confirmar;
* buscar;
* filtrar;
* limpiar filtros;
* editar;
* archivar;
* deshacer;
* abrir detalle;
* navegación contextual;
* visualizar estado;
* mostrar historial;
* CTA en empty state.

No inventes nuevas reglas de negocio.

Si una funcionalidad requiere modificar lógica de negocio, regístrala como:

`REQUIERE DECISIÓN DE PRODUCTO`

y no la implementes automáticamente.

---

# 17. DESIGN SYSTEM

Antes de crear nuevos estilos determina qué sistema visual utiliza actualmente el proyecto.

Identifica:

* colores;
* tipografía;
* spacing;
* radius;
* sombras;
* tamaños;
* componentes;
* iconografía.

Consolida patrones repetidos.

Prioriza componentes reutilizables.

No hagas rediseños pantalla por pantalla con estilos independientes.

---

# 18. NO REDISEÑAR TODO SIN NECESIDAD

Preserva aquello que funciona correctamente.

Evita:

* refactor visual masivo;
* cambiar tecnologías UI;
* reemplazar librerías sin necesidad;
* modificar lógica de negocio;
* cambiar rutas arbitrariamente;
* crear componentes duplicados.

Las mejoras deben ser incrementales.

---

# 19. LOOP DE TRABAJO

Trabaja una experiencia o flujo a la vez.

Para cada iteración:

1. selecciona el problema UX de mayor prioridad;
2. comprende el flujo completo;
3. determina causa;
4. propone solución;
5. implementa;
6. revisa desktop;
7. revisa móvil;
8. comprueba navegación;
9. comprueba estados;
10. ejecuta tests;
11. ejecuta typecheck;
12. ejecuta lint;
13. ejecuta build;
14. actualiza `UI_UX_AUDIT.md`;
15. selecciona el siguiente problema.

Continúa automáticamente.

---

# 20. PRIORIZACIÓN

Trabaja en este orden:

## P0 — Bloqueante

* no se puede acceder a una funcionalidad;
* usuario queda atrapado;
* navegación rota;
* CTA principal inexistente;
* interacción principal imposible.

## P1 — Grave

* flujo confuso;
* falta feedback importante;
* funcionalidad escondida;
* responsive roto;
* acciones ambiguas.

## P2 — Importante

* jerarquía deficiente;
* inconsistencia;
* formularios poco claros;
* estados vacíos deficientes.

## P3 — Refinamiento

* spacing;
* detalles visuales;
* iconografía;
* microcopy;
* polish.

Primero P0.

Después P1.

No dediques tiempo a P3 mientras existan P0 o P1 pendientes.

---

# 21. REGISTRO DE AUDITORÍA

Mantén `UI_UX_AUDIT.md` actualizado.

Incluye:

## Resumen

## Sitemap actual

## Sitemap propuesto

## Problemas P0

## Problemas P1

## Problemas P2

## Problemas P3

## Pantallas revisadas

## Pantallas pendientes

## Cambios implementados

## Decisiones de producto pendientes

## Riesgos

Para cada problema utiliza:

| ID | App | Pantalla | Problema | Prioridad | Solución | Estado |
| -- | --- | -------- | -------- | --------- | -------- | ------ |

---

# 22. VALIDACIÓN POSTERIOR

Cuando creas que terminaste:

recorre nuevamente los principales flujos como usuario.

No revises solamente el código modificado.

Comprueba:

### Admin

Login
→ Dashboard
→ Alumnos
→ Alumno
→ Plan
→ Clases
→ Reservas
→ Pagos
→ Asistencia
→ Reportes

### Coach

Login
→ Dashboard
→ Próximas clases
→ Clase
→ Alumnos
→ Asistencia

### Alumno

Login
→ Inicio
→ Buscar clase
→ Ver clase
→ Reservar
→ Ver reserva
→ Cancelar

---

# CRITERIO DE FINALIZACIÓN

No declares completa la auditoría hasta que:

* todas las pantallas principales hayan sido revisadas;
* todas las funciones principales sean navegables;
* no existan rutas importantes sin acceso desde UI;
* no existan P0 pendientes;
* no existan P1 pendientes;
* navegación desktop funcione;
* navegación móvil funcione;
* formularios principales sean consistentes;
* acciones destructivas estén protegidas;
* existan estados loading;
* existan estados empty;
* existan estados error;
* exista feedback success donde corresponda;
* componentes principales sean consistentes;
* responsive esté revisado;
* accesibilidad básica esté revisada;
* typecheck pase;
* lint pase;
* build pase;
* `UI_UX_AUDIT.md` esté actualizado.

Cuando creas que terminaste, vuelve a revisar cada criterio.

Si alguno falla, continúa trabajando.

Máximo: 30 iteraciones.

Solo cuando se cumplan todos los criterios responde:

`UI/UX AUDIT COMPLETE`
