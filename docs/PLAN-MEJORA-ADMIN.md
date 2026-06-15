# Plan de Mejora — Rol Administrador (Control total + Usabilidad)

> **Objetivo:** que el administrador tenga **control total** del sistema y que su
> panel sea **fácil de usar, lógico y jerárquico**.
>
> **Metodología:** este plan no es teórico. Se **simularon todas las capacidades
> del admin contra la API real** (`/tmp/sim_admin.mjs`) y se auditó la navegación
> del frontend. Cada hueco listado abajo está respaldado por una respuesta HTTP.

---

## 1. Diagnóstico (simulación contra la API real)

### 1.1 Lo que el admin YA controla ✅ (15/15 verificado)
- **Usuarios:** listar, crear, activar/desactivar (aprobar obstetras).
- **Configuración del sistema** (parámetros).
- **Contenido educativo:** CRUD completo + portadas + estadísticas de lectura.
- **Canales de notificación:** SMS/WhatsApp configurables + prueba de conexión.
- **Sedes** (establecimientos): CRUD.
- **Auditoría** (ya corregida) y **backup** de la base.
- **Supervisión global:** el admin **ya puede** ver todas las gestantes
  (`GET /patients`), todas las citas (`GET /appointments`) y los reportes
  clínicos (`GET /reports/clinic`). *(Confirmado por la simulación.)*

### 1.2 Huecos de control detectados ⚠️ (5, todos HTTP 404)
| # | Capacidad que falta | Evidencia |
|---|---|---|
| 1 | **Editar datos de un usuario** (nombre, teléfono, email, COP) | `PUT /admin/users/:id` → 404 |
| 2 | **Resetear/establecer contraseña** de un usuario | `POST /admin/users/:id/reset-password` → 404 |
| 3 | **Eliminar / dar de baja** un usuario | `DELETE /admin/users/:id` → 404 |
| 4 | **Ver detalle completo** de un usuario | `GET /admin/users/:id` → 404 |
| 5 | **Dashboard con métricas globales** del sistema | `GET /admin/dashboard` → 404 |

### 1.3 Problemas de usabilidad / jerarquía (auditoría del frontend)
- **No hay pantalla de Inicio/Dashboard del admin.** Al entrar aterriza directo
  en "Usuarios" (`/(admin)/(tabs)/usuarios`). No hay una vista que resuma el
  estado del sistema ni un punto de partida claro.
- La pantalla de **Usuarios** solo permite ver/crear/activar; no editar, ni
  resetear clave, ni eliminar (coherente con los huecos del backend).
- La supervisión (gestantes, citas, reportes globales) **existe en la API pero
  no está expuesta en la UI del admin** — el admin no tiene forma de verla.
- El menú "Más" agrupa bien lo esporádico, pero falta una jerarquía superior que
  comunique "qué puedo hacer como admin".

> **Conclusión:** el backend está bien encaminado; faltan 5 endpoints de gestión
> de usuarios + un dashboard, y **exponer en la UI** capacidades que ya existen.

---

## 2. Principios del plan
1. **Control total real**, pero seguro: acciones destructivas con confirmación y
   auditadas; nunca exponer secretos/contraseñas.
2. **Jerarquía por importancia:** Inicio (resumen) → gestión frecuente → gestión
   esporádica.
3. **Máx. 2 taps** a cualquier acción de administración.
4. **Una pantalla, un propósito.** Acciones de un usuario agrupadas en su detalle.
5. **Validado estrictamente** (tsc + tests + simulación) por fase, commit + push.

---

## 3. Arquitectura de información propuesta (jerárquica)

### Barra inferior del admin (4 tabs)
| Pos | Tab | Contiene | Cambio |
|---|---|---|---|
| 1 | **Inicio** | Dashboard: KPIs globales, pendientes de aprobación, accesos rápidos | **NUEVO** |
| 2 | **Usuarios** | Lista + detalle con todas las acciones (editar, clave, activar, eliminar) | Ampliado |
| 3 | **Contenido** | Educación (ya completo) | Igual |
| 4 | **Más** | Supervisión + Sedes + Config + Notificaciones + Auditoría/Backup + Salir | Ampliado |

### "Más" reorganizado por secciones
- **Supervisión:** Gestantes (todas), Citas (todas), Reportes globales. *(expone lo que ya da la API)*
- **Sistema:** Sedes, Configuración, Notificaciones.
- **Seguridad:** Auditoría, Backup.
- **Cuenta:** Cerrar sesión.

---

## 4. Plan por fases

### FASE 0 — Baseline
- [ ] Confirmar tsc backend+frontend, tests y simulación admin actuales.
**Commit:** `chore(admin): baseline y plan de mejora del rol administrador`

---

### FASE 1 — Backend: completar la gestión de usuarios (control total)
Nuevos endpoints admin (todos `rbac('admin')`, validados y auditados):
1. `GET /admin/users/:id` — detalle completo (incluye perfil obstetra/gestante).
2. `PUT /admin/users/:id` — editar firstName, lastName, phone, email (+ COP/especialidad si obstetra).
3. `POST /admin/users/:id/reset-password` — establecer nueva contraseña (hash bcrypt; nunca se devuelve).
4. `DELETE /admin/users/:id` — baja **lógica** (soft delete: `deletedAt` + `isActive=false`), con guardas:
   no permitir auto-eliminarse ni eliminar al último admin activo.

**Validación:** simulación dedicada (crear → ver detalle → editar → reset clave →
baja → verificar que no aparece activo), + RBAC 403 para no-admin, + guardas.
**Commit:** `feat(admin): gestión completa de usuarios (detalle, editar, reset clave, baja)`

---

### FASE 2 — Backend: dashboard/resumen global del admin
- `GET /admin/dashboard` — métricas del sistema: totales por rol, obstetras
  pendientes de aprobación, gestantes activas, citas (hoy/semana), alertas
  abiertas, contenido publicado, total de vistas, estado de canales de
  notificación.

**Validación:** simulación que verifica forma y coherencia de los KPIs.
**Commit:** `feat(admin): endpoint de dashboard con métricas globales del sistema`

---

### FASE 3 — Frontend: pantalla de Inicio (Dashboard) del admin
- Nueva tab **Inicio** como landing del admin (cambia el redirect de login).
- Tarjetas KPI (AutoGrid responsive), bloque "Pendientes de aprobación" con
  acción directa, accesos rápidos a Usuarios/Contenido/Supervisión.

**Validación:** tsc + bundle + recorrido; KPIs se pintan desde el endpoint real.
**Commit:** `feat(admin): pantalla de inicio con dashboard de control`

---

### FASE 4 — Frontend: detalle de usuario con todas las acciones
- Al tocar un usuario: pantalla/modal de **detalle** con sus datos y acciones
  agrupadas: Editar, Resetear contraseña, Activar/Desactivar, Eliminar (con
  confirmación). Aprobación de obstetras destacada.

**Validación:** tsc + tests + recorrido; cada acción llama su endpoint y refresca.
**Commit:** `feat(admin): detalle de usuario con editar, reset de clave y baja`

---

### FASE 5 — Frontend: módulo de Supervisión en "Más"
- Exponer lo que la API ya ofrece: **Gestantes (todas)**, **Citas (todas)**,
  **Reportes globales** — en modo lectura para el admin.
- Reorganizar "Más" en secciones (Supervisión / Sistema / Seguridad / Cuenta).

**Validación:** tsc + bundle + recorrido; listas cargan datos reales.
**Commit:** `refactor(admin): módulo de supervisión y "Más" jerárquico por secciones`

---

### FASE 6 — Consistencia y pulido
- Estados loading/vacío/error en todas las pantallas nuevas.
- Confirmaciones en acciones destructivas; feedback por toast.
- Verificación de jerarquía (≤2 taps) y textos claros en español.

**Validación:** checklist + tsc + tests + **simulación integral del admin** sin huecos.
**Commit:** `refactor(admin): consistencia, confirmaciones y feedback`

---

## 5. Resumen de fases
| Fase | Tema | Capa | Commit |
|---|---|---|---|
| 1 | Gestión completa de usuarios | Backend | `feat(admin): gestión completa de usuarios` |
| 2 | Dashboard global (datos) | Backend | `feat(admin): endpoint de dashboard` |
| 3 | Pantalla Inicio | Frontend | `feat(admin): pantalla de inicio` |
| 4 | Detalle de usuario + acciones | Frontend | `feat(admin): detalle de usuario` |
| 5 | Supervisión + "Más" jerárquico | Frontend | `refactor(admin): supervisión` |
| 6 | Consistencia y pulido | Frontend | `refactor(admin): consistencia` |

## 6. Validación por fase (obligatoria)
```bash
# backend/ y frontend/
npx tsc --noEmit        # 0 errores
npm test                # backend 139+, frontend 44+
node /tmp/sim_admin.mjs # simulación de control total → 0 huecos al final
```
Cada fase: verde + sin bugs → **commit + push a GitHub** → siguiente.
