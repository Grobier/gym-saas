# LOOP DE AUDITORÍA FUNCIONAL

## Objetivo

Revisar de forma sistemática la funcionalidad completa de esta aplicación web, detectar errores, inconsistencias, funcionalidades incompletas y problemas en los flujos de usuario.

No asumas que una funcionalidad funciona solamente porque existe código para ella.

Debes verificar su comportamiento real y su integración con el resto del sistema.

---

## 1. Antes de modificar código

Primero inspecciona el proyecto completo.

Identifica:

* arquitectura del proyecto;
* frontend;
* backend;
* base de datos;
* autenticación;
* roles existentes;
* rutas;
* APIs;
* modelos y tablas;
* permisos;
* políticas de acceso;
* validaciones;
* funcionalidades disponibles;
* integraciones externas;
* tests existentes.

Luego crea o actualiza un archivo:

`FUNCTIONAL_AUDIT.md`

No comiences corrigiendo problemas hasta entender suficientemente la estructura y los flujos principales de la aplicación.

---

## 2. Construye un inventario funcional

Identifica todos los módulos existentes.

Para cada módulo registra:

* funcionalidad;
* usuarios que pueden utilizarla;
* acciones disponibles;
* reglas de negocio;
* frontend involucrado;
* endpoint/API relacionado;
* tablas involucradas;
* estado de revisión;
* problemas encontrados.

Estados posibles:

* ⬜ Pendiente
* 🟡 En revisión
* 🟢 Funciona
* 🔴 Error
* 🟠 Funciona parcialmente

---

## 3. Revisa la aplicación por flujos

No revises archivos aislados.

Revisa flujos completos de usuario.

Por ejemplo:

Usuario
→ interfaz
→ acción
→ validación
→ API
→ lógica de negocio
→ base de datos
→ respuesta
→ actualización de interfaz

Comprueba que toda la cadena funcione correctamente.

---

## 4. Para cada funcionalidad

Realiza este proceso:

### A. Comprender

Identifica qué debería hacer la funcionalidad según:

* código existente;
* interfaz;
* modelo de datos;
* reglas de negocio;
* documentación disponible.

### B. Verificar

Comprueba:

* flujo normal;
* estados vacíos;
* errores;
* datos inválidos;
* permisos;
* diferencias entre roles;
* datos duplicados;
* condiciones límite;
* navegación;
* persistencia;
* mensajes al usuario.

### C. Detectar

Clasifica cada problema como:

**CRÍTICO**
Impide utilizar una funcionalidad principal, genera pérdida de datos, vulnerabilidad o acceso incorrecto.

**ALTO**
Una funcionalidad importante no funciona correctamente.

**MEDIO**
La funcionalidad funciona parcialmente o presenta inconsistencias.

**BAJO**
Problema menor de UX, mensajes, validaciones o comportamiento secundario.

---

## 5. Antes de corregir un problema

Determina primero su causa raíz.

No soluciones solamente el síntoma visible.

Investiga si el problema está en:

* frontend;
* backend;
* API;
* esquema de base de datos;
* consultas;
* permisos;
* autenticación;
* estado;
* tipos;
* reglas de negocio;
* integración entre módulos.

---

## 6. Corrección

Corrige un problema o grupo estrechamente relacionado de problemas a la vez.

Evita grandes refactorizaciones que no sean necesarias para resolver el problema.

Después de cada corrección:

1. ejecuta tests relevantes;
2. ejecuta typecheck;
3. ejecuta lint;
4. ejecuta build;
5. vuelve a verificar el flujo funcional afectado;
6. comprueba que no hayas roto otras funcionalidades.

---

## 7. Regresión

Después de modificar una funcionalidad revisa también las funcionalidades directamente relacionadas.

Ejemplo:

Si modificas reservas:

Reserva
→ cupos
→ plan del alumno
→ asistencia
→ cancelaciones
→ lista de espera
→ calendario
→ notificaciones

No consideres solucionado un problema hasta comprobar sus dependencias.

---

## 8. Actualiza el registro

Después de cada revisión actualiza `FUNCTIONAL_AUDIT.md`.

Usa una tabla similar a:

| Módulo   | Flujo         | Estado | Severidad | Problema                  | Causa | Acción     |
| -------- | ------------- | ------ | --------- | ------------------------- | ----- | ---------- |
| Auth     | Login         | 🟢     | —         | —                         | —     | Verificado |
| Reservas | Crear reserva | 🔴     | Alta      | Permite reservar sin plan | API   | Corregir   |
| Usuarios | Editar perfil | 🟢     | —         | —                         | —     | Verificado |

Mantén además:

## Problemas pendientes

## Problemas solucionados

## Funcionalidades verificadas

## Riesgos encontrados

---

# LOOP

Después de completar una funcionalidad:

1. revisa `FUNCTIONAL_AUDIT.md`;
2. identifica la siguiente funcionalidad pendiente de mayor prioridad;
3. revísala completamente;
4. detecta problemas;
5. corrige los problemas necesarios;
6. ejecuta verificaciones;
7. actualiza el audit;
8. continúa con la siguiente.

Repite este proceso.

---

# Reglas importantes

No marques una funcionalidad como correcta solamente porque:

* compila;
* no genera errores visibles;
* existe un componente;
* existe un endpoint;
* existe una tabla;
* el happy path funciona.

Comprueba también permisos, reglas de negocio y casos límite.

No elimines funcionalidades existentes para hacer que los tests pasen.

No cambies reglas de negocio sin evidencia clara de que están incorrectas.

No inventes funcionalidades que no existen en los requisitos o en el sistema actual.

Si encuentras una ambigüedad de negocio, regístrala en:

`FUNCTIONAL_AUDIT.md → Decisiones pendientes`

y continúa revisando aquello que sí pueda verificarse.

---

# Criterio de finalización

Solo considera terminada la auditoría cuando:

* todos los módulos hayan sido identificados;
* todos los flujos principales hayan sido revisados;
* no existan errores críticos pendientes;
* no existan errores altos pendientes;
* autenticación haya sido revisada;
* permisos y roles hayan sido revisados;
* operaciones CRUD principales hayan sido revisadas;
* navegación haya sido revisada;
* persistencia de datos haya sido comprobada;
* estados vacíos y errores hayan sido comprobados;
* tests relevantes pasen;
* typecheck pase;
* lint pase;
* build de producción pase;
* `FUNCTIONAL_AUDIT.md` refleje el estado real del sistema.

Cuando creas que terminaste, vuelve a revisar estos criterios.

Si alguno no se cumple, continúa trabajando.

No declares la tarea terminada prematuramente.

Máximo de iteraciones del loop: 30.

Cuando todos los criterios se cumplan responde:

`FUNCTIONAL AUDIT COMPLETE`
