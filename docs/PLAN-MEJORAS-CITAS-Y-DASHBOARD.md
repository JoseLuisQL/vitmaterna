# VITMATERNA — Plan de Mejoras: Dashboard Gestante + Módulo de Citas

> Plan por fases para (1) completar funcionalidades faltantes, (2) corregir
> problemas reales de la lógica de negocio actual, y (3) elevar el diseño del
> dashboard de la gestante y todo el módulo de citas a un nivel profesional,
> minimalista y funcional.
>
> Metodología: **fases incrementales**. Cada fase deja el repo compilando y
> funcional, y termina con un **commit en español** empujado a GitHub.

---

## 0. Diagnóstico de la lógica de negocio actual (auditado en código)

Auditoría leyendo backend (`appointment.service.ts`, `appointment.routes.ts`,
`notification.service.ts`) y frontend (`(gestante)/(tabs)/index.tsx`,
`citas.tsx`, `tratamiento.tsx`, `(obstetra)/(tabs)/cronograma.tsx`,
`NuevaCitaModal.tsx`, `api-queries.ts`).

### 🔴 Problemas críticos (seguridad / integridad de negocio)

1. **Citas sin control de acceso (RBAC) ni verificación de propiedad.**
   `appointment.routes.ts` monta `PATCH /:id/status` y `/:id/reschedule` sin
   `rbac(...)` ni comprobación de dueño. Consecuencias reales:
   - Una gestante puede marcar su propia cita como `asistida` (debe poder solo
     el obstetra).
   - Cualquier usuario puede cambiar el estado o reprogramar **la cita de otra
     persona** (solo conociendo el `id`).
   - `updateStatus` y `reschedule` (service) no validan que la cita pertenezca a
     la gestante/obstetra que hace la petición.

2. **La reprogramación NO es un flujo de aprobación.** Hoy `reschedule()`
   escribe directamente `estado = reprogramada` + `fechaReprogramada`. No hay
   distinción entre "la gestante **solicita** reprogramar" y "el obstetra
   **aprueba/rechaza**". Resultado: la gestante reprograma sola, sin que el
   obstetra decida — justo lo contrario a la regla de negocio correcta.

3. **No se valida disponibilidad de horario.** `create()` y `reschedule()` no
   comprueban choques: se pueden agendar dos citas a la misma fecha/hora con el
   mismo obstetra (doble booking). No existe endpoint de "horarios disponibles".

4. **Las acciones de cita no notifican a la contraparte.**
   - Cuando la gestante **confirma** su cita, el obstetra **no se entera**.
   - Cuando la gestante **solicita reprogramación**, el obstetra **no recibe**
     una alerta para aprobar/rechazar.
   - Cuando el obstetra aprueba/rechaza, la gestante **no es notificada**.
   El servicio de notificaciones (`notification.service.ts`) tiene `notifyUser()`
   pero las acciones de cita nunca lo invocan.

### 🟡 Problemas de UX / consistencia

5. **Accesos directos del dashboard no navegan.** En
   `(gestante)/(tabs)/index.tsx` las tarjetas "Próxima Cita" y "Tratamiento del
   Día" muestran un `ChevronRight` (afordancia de "tocar") pero **no tienen
   `onPress`**. El usuario toca y no pasa nada.

6. **Reprogramar con inputs de texto crudos.** En `citas.tsx` la gestante
   escribe fecha y hora a mano (`YYYY-MM-DD`, `HH:MM`) en `TextInput`. Frágil,
   no intuitivo, propenso a error. Igual en `NuevaCitaModal.tsx` (obstetra).

7. **No hay vista de detalle de cita.** Tocar una cita no abre un `AppModal`
   con el detalle ordenado (la lista solo muestra una tarjeta estática).

8. **Mapeo de datos inconsistente.** `citas.tsx` espera campos en inglés
   (`appointmentDate`, `professional`, `clinic`) y los rellena con valores
   inventados (`'Consultorio Principal'`); ignora `fechaReprogramada`,
   `motivoReprogramacion` y `numeroControl` que sí existen en el backend.

9. **`alert()` del navegador** en `citas.tsx` (`handleConfirmAppointment`,
   `handleReschedule`) en lugar del `ToastProvider`/`AppModal` ya existentes.

10. **`getStatusColor` no cubre el estado "solicitud de reprogramación"**
    (porque aún no existe). El semáforo de estados quedará incompleto.

### Estados de cita (enum actual) y cómo deben transicionar

Enum en `schema.prisma`:
`programada · confirmada · asistida · no_asistida · reprogramada · cancelada`.

Falta un estado intermedio para el flujo de aprobación. Propuesta (Fase 2):
añadir **`solicitud_reprogramacion`** (la gestante pidió, falta que el obstetra
decida). Máquina de estados objetivo:

```
programada ──(gestante confirma)──────────────► confirmada
programada/confirmada ─(gestante solicita)────► solicitud_reprogramacion
solicitud_reprogramacion ─(obstetra aprueba)──► programada (nueva fecha/hora)
solicitud_reprogramacion ─(obstetra rechaza)──► vuelve al estado previo
programada/confirmada ─(obstetra marca)───────► asistida | no_asistida
programada/confirmada ─(cualquiera cancela)───► cancelada
(cron) cita vencida sin asistencia ───────────► no_asistida + alerta obstetra
```

---

## Fase 1 — Cimientos del backend de citas: RBAC, propiedad y disponibilidad

**Objetivo:** que el módulo de citas sea seguro y consistente antes de tocar UI.

- **1.1** Añadir `rbac()` y verificación de propiedad en `appointment.routes.ts`
  / `appointment.service.ts`:
  - `POST /` → solo `obstetra`, `admin`.
  - `GET /` → ya filtra por rol; reforzar.
  - `PATCH /:id/status` → reglas por rol (ver 1.2).
  - `reschedule` → reglas por rol (ver Fase 2).
  - El service recibe `userContext` y valida que la cita pertenezca al
    solicitante (gestante dueña u obstetra asignado).
- **1.2** Reglas de transición en `updateStatus`: validar transiciones legales
  (p. ej. una gestante solo puede pasar `programada → confirmada`; `asistida/
  no_asistida` solo obstetra). Rechazar transiciones inválidas con 400.
- **1.3** Validación de **disponibilidad de horario** en `create()`: si ya existe
  una cita activa (`programada/confirmada`) del mismo obstetra en esa
  fecha+hora, responder 409 con mensaje claro.
- **1.4** Nuevo endpoint `GET /appointments/availability?fecha=YYYY-MM-DD&obstetraId=`
  que devuelve la lista de **slots disponibles** del día (p. ej. 08:00–17:00
  cada 30 min, excluyendo los ya ocupados y horario de refrigerio). Pensado para
  alimentar el selector inteligente del frontend.
- **1.5** Pruebas de integración (`tests/integration/appointments.test.ts`):
  RBAC (403 a terceros), doble booking (409), disponibilidad, transiciones.

➡️ **Commit:** `feat(citas): RBAC, validación de propiedad y disponibilidad de horarios`

---

## Fase 2 — Flujo de confirmación y reprogramación con aprobación + notificaciones

**Objetivo:** implementar la regla de negocio correcta de confirmación y
reprogramación con aprobación del obstetra y avisos a ambas partes.

- **2.1** Migración Prisma: añadir estado `solicitud_reprogramacion` al enum
  `EstadoCita` y, si hace falta, campo `estadoPrevio` para poder revertir un
  rechazo. (`prisma migrate` / `db push`).
- **2.2** Endpoints nuevos/ajustados:
  - `PATCH /:id/confirm` (gestante): `programada → confirmada` + **notifica al
    obstetra** ("La gestante X aceptó su cita del …").
  - `PATCH /:id/request-reschedule` (gestante): guarda fecha/hora/motivo
    propuestos y pasa a `solicitud_reprogramacion` + **notifica al obstetra**
    para aprobar/rechazar. La gestante **no** cambia la cita por sí misma.
  - `PATCH /:id/resolve-reschedule` (obstetra): `{ aprobar: boolean, motivo? }`.
    Si aprueba → aplica `fechaReprogramada/horaReprogramada` como nuevas
    `fecha/hora`, vuelve a `programada`, valida disponibilidad (Fase 1.3) y
    **notifica a la gestante** (aceptada). Si rechaza → vuelve al estado previo
    y **notifica a la gestante** (rechazada, con motivo).
  - `PATCH /:id/status` (obstetra): `asistida/no_asistida/cancelada`.
- **2.3** Integrar `notifyUser()` (push + persistente) en cada acción anterior,
  reutilizando `findObstetraUserIdForGestante()` y el patrón ya existente.
- **2.4** Actualizar `api-queries.ts`: `useConfirmAppointment`,
  `useRequestReschedule`, `useResolveReschedule`, `useAppointmentAvailability`,
  con invalidaciones correctas (gestante y obstetra en tiempo real).
- **2.5** Pruebas de integración del flujo completo (solicitar → aprobar/
  rechazar → notificación creada).

➡️ **Commit:** `feat(citas): flujo de confirmación y reprogramación con aprobación del obstetra y notificaciones`

---

## Fase 3 — Rediseño del módulo de citas de la gestante (UI profesional)

**Objetivo:** `(gestante)/(tabs)/citas.tsx` minimalista, compacto, intuitivo,
con detalle en `AppModal` y selección de horario inteligente.

- **3.1** Reescribir el mapeo a los campos reales del backend (fecha, hora,
  estado, motivo, obstetra, numeroControl, fechaReprogramada, motivo de
  reprogramación). Eliminar campos inventados.
- **3.2** Tarjetas compactas, jerarquía visual clara (tokens de `src/theme`),
  badge de estado con etiqueta+icono (incluye `solicitud_reprogramacion`).
- **3.3** **Detalle en `AppModal`**: al tocar una cita se abre un modal
  profesional y ordenado (fecha/hora, profesional, motivo, n.º de control,
  estado, observaciones y, si aplica, la propuesta de reprogramación pendiente).
- **3.4** **Selector inteligente de fecha/hora** para reprogramar: date picker +
  chips de **horarios disponibles** consumiendo `GET /availability` (Fase 1.4).
  Adiós a los `TextInput` de texto crudo.
- **3.5** Acciones contextuales por estado: "Confirmar" y "Solicitar
  reprogramación" solo cuando corresponda; feedback con `ToastProvider` (no
  `alert()`).
- **3.6** Estados de carga/vacío/error pulidos y accesibles.

➡️ **Commit:** `feat(citas): rediseño profesional de citas de la gestante con detalle en modal y selección inteligente de horario`

---

## Fase 4 — Rediseño del Dashboard de la gestante (funcional + elegante)

**Objetivo:** `(gestante)/(tabs)/index.tsx` con accesos directos funcionales y
estética minimalista optimizada.

- **4.1** Hacer **funcionales los accesos directos**:
  - "Próxima Cita" → navega a `/(gestante)/(tabs)/citas` (o abre su detalle).
  - "Tratamiento del Día" → navega a `/(gestante)/(tabs)/tratamiento`.
- **4.2** Refinar la jerarquía visual (progreso de embarazo, próxima cita,
  adherencia del día) con tokens, espaciado consistente y micro-interacciones
  sutiles; quitar valores "hardcodeados".
- **4.3** Mostrar el estado real de la próxima cita (incluida una solicitud de
  reprogramación pendiente) y permitir confirmar desde el dashboard.
- **4.4** Optimización: memoización, evitar recalcular semanas en cada render,
  `StatusChip` coherente con el resto de la app.
- **4.5** Revisión de accesibilidad (roles, contraste, tamaños) acorde a
  `__tests__/theme.test.ts`.

➡️ **Commit:** `feat(dashboard): accesos directos funcionales y rediseño minimalista del panel de la gestante`

---

## Fase 5 — Lado del obstetra: gestión de solicitudes y nueva cita inteligente

**Objetivo:** cerrar el círculo en `(obstetra)`.

- **5.1** En `cronograma.tsx` / `alertas.tsx`: bandeja de **solicitudes de
  reprogramación** con acciones Aprobar / Rechazar (consumiendo
  `resolve-reschedule`).
- **5.2** Vista de **detalle de cita** del obstetra en `AppModal` (con datos de
  la gestante y acciones de estado).
- **5.3** `NuevaCitaModal.tsx`: reemplazar inputs de texto por date picker +
  chips de horarios disponibles (reusa `GET /availability`); evita doble
  booking desde el origen.
- **5.4** Notificación visible al obstetra cuando una gestante confirma o
  solicita reprogramación (badge/contador en alertas).

➡️ **Commit:** `feat(citas-obstetra): gestión de solicitudes de reprogramación y agenda sin choques de horario`

---

## Fase 6 — Verificación, pruebas y cierre de calidad

- **6.1** `npm run typecheck` (backend) y `npm run tsc` (frontend) → 0 errores.
- **6.2** `npm test` backend (unit + integración de citas) y `npm test`
  frontend; añadir/ajustar pruebas de los flujos nuevos.
- **6.3** `npm run smoke` (endpoints) y prueba manual del flujo E2E en web.
- **6.4** Actualizar `docs/ANALISIS-FUNCIONES-FALTANTES.md` e `ISO-25010.md`
  marcando lo cerrado (RF-3.05/3.08/3.09/3.11, RF-7.04/7.07…).

➡️ **Commit:** `test(citas): cobertura del flujo de citas y actualización de documentación de estado`

---

## Resumen de entregables por fase

| Fase | Foco | Commit (es) |
|------|------|-------------|
| 1 | Backend citas: RBAC + propiedad + disponibilidad | `feat(citas): RBAC, validación de propiedad y disponibilidad de horarios` |
| 2 | Flujo confirmación/reprogramación + notificaciones | `feat(citas): flujo de confirmación y reprogramación con aprobación del obstetra y notificaciones` |
| 3 | UI citas gestante (modal + horarios) | `feat(citas): rediseño profesional de citas de la gestante…` |
| 4 | Dashboard gestante funcional + elegante | `feat(dashboard): accesos directos funcionales y rediseño minimalista…` |
| 5 | Obstetra: solicitudes + agenda sin choques | `feat(citas-obstetra): gestión de solicitudes…` |
| 6 | QA, pruebas y docs | `test(citas): cobertura del flujo de citas…` |

> **Orden de ejecución:** 1 → 2 → 3 → 4 → 5 → 6. Las fases 1 y 2 (backend) son
> prerrequisito de las de UI. Tras cada fase: typecheck + commit en español +
> push a `origin/main` (o rama de trabajo, según se prefiera).

---

## Estado de ejecución (todas las fases completadas ✅)

| Fase | Estado | Commit |
|------|--------|--------|
| 1 | ✅ | `feat(citas): RBAC, validacion de propiedad y disponibilidad de horarios` |
| 2 | ✅ | `feat(citas): flujo de confirmacion y reprogramacion con aprobacion del obstetra y notificaciones` |
| 3 | ✅ | `feat(citas): rediseno profesional de citas de la gestante con detalle en modal y seleccion inteligente de horario` |
| 4 | ✅ | `feat(dashboard): accesos directos funcionales y rediseno minimalista del panel de la gestante` |
| 5 | ✅ | `feat(citas-obstetra): gestion de solicitudes de reprogramacion y agenda sin choques de horario` |
| 6 | ✅ | `test(citas): cobertura del flujo de citas y actualizacion de documentacion de estado` |

**Resultados de calidad (Fase 6):**
- Backend: typecheck 0 errores · **90 pruebas** (unit + integración) · smoke 30/30.
- Frontend: typecheck 0 errores · **30 pruebas** · bundle web compila.

**Problemas del diagnóstico (sección 0) resueltos:**
1. ✅ Citas con RBAC + verificación de propiedad.
2. ✅ Reprogramación convertida en flujo de aprobación del obstetra.
3. ✅ Validación de disponibilidad / anti doble-booking + `GET /availability`.
4. ✅ Notificaciones a la contraparte en confirmar/solicitar/aprobar/rechazar.
5. ✅ Accesos directos del dashboard ahora navegan y permiten confirmar.
6. ✅ Reprogramación con selector de fecha + horarios disponibles (sin texto crudo).
7. ✅ Detalle de cita en `AppModal` profesional y ordenado.
8. ✅ Mapeo a campos reales del backend (sin valores inventados).
9. ✅ Feedback con `ToastProvider` (sin `alert()` del navegador).
10. ✅ Estados de cita completos, incluido `solicitud_reprogramacion`.
