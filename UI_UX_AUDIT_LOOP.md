# LOOP DE AUDITORÍA UI/UX

## Objetivo

Revisar de forma sistemática la experiencia de usuario e interfaz visual de moveOS.

La aplicación debe sentirse como un producto SaaS terminado, coherente, intuitivo y profesional.

No te limites a corregir estilos. Identifica navegación faltante, acciones difíciles de encontrar, flujos incompletos, problemas responsive, feedback insuficiente y patrones inconsistentes.

---

## 1. Antes de modificar

Inspecciona completamente:

* estructura de apps (admin, coach, student, mobile);
* rutas y navegación;
* componentes compartidos;
* design system actual;
* layouts;
* sidebars;
* menús;
* formularios;
* tablas;
* modales;
* estilos globales.

Crea inventario en `UI_UX_AUDIT.md` sin cambiar nada.

---

## 2. Construye sitemap actual

Para cada rol (superadmin, admin, coach, student) documenta:

| Rol | Sección | Pantalla | Ruta | Navegable | Estado |
| --- | ------- | -------- | ---- | --------- | ------ |

Marca:
* ✅ Accesible desde UI
* ⚠️ Solo escribiendo URL
* ❌ No accesible

---

## 3. Priorización

Trabaja en este orden:

### P0 — BLOQUEANTE
* Usuario queda atrapado
* CTA principal inexistente
* Navegación rota
* No se puede acceder a funcionalidad

### P1 — GRAVE
* Flujo confuso
* Feedback falta
* Responsive roto
* Acciones ambiguas

### P2 — IMPORTANTE
* Jerarquía deficiente
* Inconsistencia
* Formularios poco claros

### P3 — REFINAMIENTO
* Spacing, tipografía, iconos

---

## 4. Para cada problema

1. **Entender**: ¿qué debería ocurrir?
2. **Verificar**: ¿qué ocurre realmente?
3. **Causa**: ¿por qué falla?
4. **Solución**: proponer arreglo
5. **Implementar**: código
6. **Validar**: desktop + móvil + estados

---

## 5. Después de cada problema

1. typecheck
2. lint
3. build
4. prueba en navegador
5. actualiza `UI_UX_AUDIT.md`
6. continúa con siguiente problema

---

## 6. Criterios de finalización

Solo cuando se cumplan todos:

* todas las pantallas principales revisadas
* no existan P0 pendientes
* no existan P1 pendientes
* navegación funcione en desktop
* navegación funcione en móvil
* formularios sean consistentes
* acciones destructivas protegidas
* estados loading, empty, error existan
* responsive revisado
* accesibilidad básica revisada
* typecheck pase
* lint pase
* build pase
* `UI_UX_AUDIT.md` actualizado

---

## COMIENZA AQUÍ

1. Inspecciona proyecto completo
2. Documenta sitemap actual
3. Identifica P0
4. Resuelve P0
5. Identifica P1
6. Resuelve P1
7. Continúa hasta completar
