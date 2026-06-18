# VITMATERNA — Plan de mejora del sistema de Citas y Agenda

> Alcance: módulo **Citas (gestante)** y **Cronograma (obstetra)**, su backend de
> soporte y la actualización en **tiempo real**. Objetivo: un sistema más
> profesional, ordenado, preciso y en vivo, sin sobrecarga visual.
>
> Basado en una auditoría del código real (2026-06-18): `cronograma.tsx` (492 LOC),
> `citas.tsx` (759 LOC), `appointment.service.ts`, `api-queries.ts` y los sockets.

---

## 1. Diagnóstico — qué está mal hoy (verificado en código y BD)

### 🔴 Orden y carga de datos
- **El obstetra trae TODAS las citas y ordena/filtra en el cliente.**
  `cronograma.tsx` llama `useAppointments()` → `GET /appointments` sin parámetros,
  recibe todo y hace `.filter()` + `.sort()` en memoria. No escala y mezcla la
  lógica de negocio en la UI.
- **No hay prioridad clínica en el orden.** Se ordena solo por fecha
  (`new Date(a.date) - new Date(b.date)`). El usuario pide que **confirmadas y de
  mayor prioridad** salgan primero, y luego por fecha más cercana. Hoy no ocurre.
- **Datos sucios sin defensa.** En la BD hay una cita con fecha **2047-05-12**
  (seed corrupto). Sin validación, descuadra "próximas" y el orden.

### 🔴 Fecha y hora poco profesionales / con bug
- **Bug de zona horaria en el obstetra.** `combineDateTime` (api-queries) mezcla
  `setHours` (hora local) con `getUTCHours/Minutes` (UTC) → la hora mostrada puede
  salir corrida según el huso. Además `cronograma.tsx` formatea la hora con
  `toLocaleTimeString` (local) mientras el resto del sistema guarda `@db.Time` en
  UTC → inconsistencia entre pantallas.
- **Formato pobre.** La fecha se muestra como `dd/mm` o `toLocaleDateString()`
  crudo; falta un formato claro tipo "Vie 20 jun · 09:00 a. m." legible para
  cualquier gestante.

### 🔴 Sin tiempo real
- **Las citas NO usan WebSocket.** Solo el chat tiene sockets. Hoy, si el obstetra
  aprueba una reprogramación o marca asistida, la **gestante no se entera hasta
  recargar** (y viceversa). La "actualización" actual es solo `invalidateQueries`
  local del propio usuario que hizo la acción.
- **La gestante ni siquiera usa React Query.** `citas.tsx` usa `useState` +
  `api.get` + `useFocusEffect`: sin caché compartida, sin invalidación cruzada,
  recarga completa cada vez que entra a la pestaña.

### 🟠 Filtros pobres / imprecisos
- **Obstetra:** solo 3 pestañas (Hoy / Próximas / Todas). No se puede filtrar por
  **fecha concreta**, por **estado**, por **modalidad** (consultorio/domiciliaria),
  ni **buscar por paciente**.
- **Gestante:** solo 2 pestañas (Próximas / Historial). Sin filtro por fecha.

### 🟠 Sobrecarga visual e inconsistencia
- Headers con gradiente + margen negativo (riesgo de solape, como ya pasó en otros
  módulos). No usan `ScreenLayout`.
- Tarjetas densas con muchos elementos; estados con muchos colores.
- Dos pantallas que hacen lo mismo (listar citas) con **código y estilos
  duplicados** y criterios distintos de estado/orden.

---

## 2. Principios del rediseño

1. **El servidor manda**: filtra, ordena y prioriza en el backend; el cliente solo
   muestra. (Consistente con el resto de VITMATERNA.)
2. **Orden por prioridad + fecha**: un criterio único y clínicamente útil.
3. **Tiempo real de verdad**: un cambio de cita se refleja al instante en ambos
   roles vía Socket.IO (reutilizando la infraestructura del chat).
4. **Fecha/hora impecables**: una sola función de formato, en español, sin bug de
   huso.
5. **Claro y sin sobrecarga**: `ScreenLayout`, jerarquía simple, color solo donde
   informa (estado/riesgo).

---

## 3. Orden y priorización (el corazón del pedido)

### 3.1 Orden canónico (calculado en el backend)
Para la vista del **obstetra** (y reutilizable en gestante), ordenar por:

1. **Prioridad de estado** (peso, menor = más arriba):
   | Estado | Peso | Razón |
   |---|---|---|
   | `solicitud_reprogramacion` | 0 | Requiere acción del obstetra YA |
   | `confirmada` | 1 | La paciente viene seguro → preparar |
   | `programada` | 2 | Pendiente de confirmación |
   | `reprogramada` | 3 | Reagendada, pendiente |
   | `asistida` | 4 | Histórico |
   | `no_asistida` | 5 | Histórico (requiere seguimiento aparte) |
   | `cancelada` | 6 | Histórico |
2. **Cercanía de fecha+hora**: dentro del mismo grupo, la cita **más próxima
   primero** (ascendente para futuras).
3. **Riesgo de la gestante** como desempate (rojo > amarillo > verde) — opcional.

> Resultado: "me cargan primero las confirmadas y así sucesivamente, y por fecha
> más cercana", exactamente lo pedido. En **Próximas** el criterio es el mismo
> acotado a futuras pendientes.

### 3.2 Implementación backend
- `appointment.service.findAll` acepta y aplica server-side:
  `estado` (uno o varios), `fecha` exacta, rango `desde`/`hasta`, `modalidad`,
  `search` (nombre/DNI de gestante), `scope` (`hoy|proximas|historial|todas`),
  `orderBy` (`prioridad` por defecto, o `fecha`), `limit`.
- El orden por prioridad se hace con un `CASE` por estado (índice ya existe:
  `idx_appointments_estado_fecha`).
- Validación de cordura: ignorar/avisar fechas absurdas (> hoy + 2 años) para no
  romper "próximas".

---

## 4. Tiempo real (Socket.IO)

Reutilizar el `socketRegistry` ya existente (lo usa el chat):

- **Eventos del servidor** al mutar una cita (`appointment.service`):
  - `appointment:created`, `appointment:updated`, `appointment:status_changed`.
  - Se emiten a 2 salas: `user:<gestanteUserId>` y `user:<obstetraUserId>`.
- **Frontend**: un hook `useAppointmentRealtime()` que, al recibir cualquiera de
  esos eventos, hace `queryClient.invalidateQueries(['appointments'])` (y
  `['todayAppointments']`, `['gestanteDashboard']`). Así **ambos roles** ven el
  cambio al instante, sin recargar.
- Migrar `citas.tsx` (gestante) de `useState`+`api.get` a **React Query**
  (`useAppointments`) para que el tiempo real y la caché apliquen también ahí.

> Con esto: el obstetra aprueba una reprogramación → la gestante ve la nueva fecha
> en vivo; la gestante confirma → al obstetra le aparece "Confirmada" al instante.

---

## 5. Fecha y hora — formato profesional único

- Crear `src/utils/datetime.ts` con helpers únicos:
  - `formatFechaLarga(fecha)` → "vie 20 de junio".
  - `formatHora(horaIso)` → "09:00 a. m." (lee UTC consistentemente, sin el bug
    de `setHours`/`getUTCHours`).
  - `formatFechaHora(fecha, hora)` → "Vie 20 jun · 09:00 a. m.".
  - `etiquetaRelativa(fecha)` → "Hoy" / "Mañana" / "En 3 días" / "vie 20 jun".
- Reemplazar `combineDateTime` y todos los `toLocaleTimeString/DateString` sueltos
  por estos helpers (una sola fuente de verdad, sin desfases).

---

## 6. Filtros profesionales y precisos

### Obstetra (Cronograma)
- **Segmentos rápidos**: Hoy · Próximas · Historial · Todas (con contador).
- **Selector de fecha** (date picker) para saltar a un día concreto.
- **Filtro por estado** (chips: Confirmada, Programada, Solicita reprogramar…).
- **Filtro por modalidad** (Consultorio / Domiciliaria).
- **Búsqueda** por nombre o DNI de la paciente (con debounce, ya existe el hook).
- Todo enviado al backend (no filtrado en cliente).

### Gestante (Citas)
- Segmentos: Próximas · Historial.
- **Agrupación por fecha** con encabezados ("Hoy", "Mañana", "Esta semana",
  "Más adelante") para lectura clara.
- Selector de fecha opcional para ver un día.

---

## 7. Rediseño visual (sin sobrecarga, claro y ordenado)

- Migrar ambas pantallas a **`ScreenLayout`** (header consistente, sin solape) —
  como ya hicimos en dashboards.
- **Tarjeta de cita unificada** (un solo componente compartido
  `AppointmentCard`), con jerarquía clara:
  - Columna de **hora** + **fecha corta** a la izquierda (bien formateada).
  - Centro: **nombre de paciente** (obstetra) o **motivo** (gestante), tipo de
    control, modalidad con icono sobrio.
  - Derecha: **chip de estado** (un color por estado, sin saturar) y acciones.
- **Agrupación visual por día** con encabezados de sección (sticky headers en la
  lista). Esto ordena la lectura mucho mejor que una lista plana.
- Color solo en: chip de estado y punto de riesgo. Resto neutro.
- `numberOfLines` en todos los textos para que **no se corten** y se ajusten.
- Estados vacíos claros por filtro ("No tienes citas para este día").

---

## 8. Plan de ejecución por fases

### Fase 1 — Backend: orden, prioridad y filtros `(base de todo)`
- [ ] `findAll`: parámetros `scope`, `estado[]`, `desde/hasta`, `modalidad`,
      `search`, `orderBy=prioridad`, `limit`.
- [ ] Orden por prioridad de estado + fecha (CASE en Prisma/SQL).
- [ ] Guardas contra fechas corruptas; limpiar la cita de 2047 en el seed.
- [ ] Tests unitarios del ordenador de prioridad + integración de filtros.

### Fase 2 — Tiempo real
- [ ] Emitir `appointment:*` a las salas de gestante y obstetra en cada mutación.
- [ ] Hook `useAppointmentRealtime()` que invalida queries.
- [ ] Migrar `citas.tsx` (gestante) a React Query.

### Fase 3 — Fecha/hora y utilidades
- [ ] `utils/datetime.ts` (formato único, sin bug de huso) y reemplazos.

### Fase 4 — Rediseño UI (obstetra y gestante)
- [ ] `AppointmentCard` compartida + agrupación por día (sticky headers).
- [ ] `ScreenLayout` en ambas pantallas; filtros profesionales (fecha/estado/
      modalidad/búsqueda).
- [ ] Estados vacíos por filtro; `numberOfLines`; paleta sobria.

### Fase 5 — Validación
- [ ] typecheck back+front, tests, smoke; verificación en navegador de orden,
      filtros, formato y tiempo real (dos sesiones).

---

## 9. Resultado esperado
- El obstetra abre Cronograma y ve **primero las confirmadas/urgentes, ordenadas
  por fecha más cercana**, agrupadas por día, con fecha y hora claras.
- Filtros precisos (día, estado, modalidad, búsqueda) resueltos en el servidor.
- Cualquier cambio de cita se ve **en tiempo real** en ambos roles.
- UI limpia, sin sobrecarga, entendible por cualquier gestante.

---

*Plan generado tras auditoría del código real. Cada fase es incremental,
validable y de bajo riesgo; no requiere reescribir el dominio, solo ordenarlo.*
