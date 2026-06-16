# Plan: eliminar redundancias entre Notificaciones, Alertas y Chat

> Objetivo del usuario: hoy hay **redundancia y confusión** entre los módulos de
> Notificaciones, Alertas y Chat. Pidió que **solo queden Chat y Notificaciones**.
> Este documento analiza el flujo actual, demuestra la redundancia y propone un
> plan claro de consolidación.

---

## 1. Diagnóstico: cómo funciona hoy (y por qué confunde)

### 1.1 Redundancia de DATOS — un mismo evento se guarda 3 veces

Cuando una gestante **reporta un signo de alarma GRAVE**, el backend
(`clinical.service.ts → createDangerSign`) genera **tres registros del mismo
hecho**:

| # | Qué se crea | Dónde aparece en la app del obstetra |
|---|---|---|
| 1 | `DangerSign` (registro clínico) | Pestaña **Alertas** |
| 2 | `Notification` (`notifyUser`, tipo `signo_alarma`) | Campana → **Notificaciones** |
| 3 | `Message` en el chat (`postSystemChatAlert`) | **Chat** (tarjeta de emergencia) |

Resultado: el obstetra ve **el mismo signo de alarma en 3 lugares distintos**.
No sabe cuál es "la fuente de verdad" ni dónde actuar.

Lo mismo, en menor grado, con la **emergencia (botón de pánico)**: crea un
`Message` en el chat + una `Notification` tipo `emergencia`.

### 1.2 Redundancia de UI / NAVEGACIÓN — 3 entradas para lo mismo

El obstetra tiene **tres caminos** que llevan a información solapada:

- **Tab "Alertas"** (barra inferior) → signos de alarma pendientes.
- **Campana (NotificationBell)** en CASI todos los headers → bandeja de Notificaciones (que **también** incluye `signo_alarma`).
- **Tab "Chat"** → donde además llegan alertas automáticas como mensajes.

Además, "Notificaciones" está **a la vez** en la campana de los headers **y** en
el sidebar → dos accesos al mismo sitio.

### 1.3 Inventario de tipos de notificación (hoy)

`cita_confirmada`, `solicitud_reprogramacion`, `reprogramacion_aprobada`,
`reprogramacion_rechazada`, `signo_alarma`, `inasistencia`, `baja_adherencia`,
`recordatorio_suplemento`, `fpp_proxima`, `examenes_pendientes`, `emergencia`.

De estos, **`signo_alarma` y `emergencia`** son los que se duplican en Alertas y
Chat. El resto (citas, recordatorios, adherencia) son avisos "normales" que solo
viven en Notificaciones — esos están bien.

---

## 2. Decisión de diseño (lo que pediste): solo Chat + Notificaciones

Consolidar a **dos canales con propósitos claros y sin solापe**:

### Chat (conversación)
- **Propósito:** comunicación bidireccional gestante ↔ obstetra (mensajes,
  fotos) **y** los eventos que requieren conversación inmediata:
  **emergencia (botón de pánico)** y **signo de alarma GRAVE**.
- Esos eventos siguen llegando como **tarjeta de emergencia** dentro del hilo de
  la gestante (ya rediseñada, profesional, con "Ver ubicación").
- Es donde el obstetra **actúa**: contacta a la paciente.

### Notificaciones (bandeja de avisos)
- **Propósito:** todos los avisos del sistema (citas, reprogramaciones,
  recordatorios, adherencia, exámenes, FPP) **y** un aviso-puntero de los
  eventos urgentes que dice "abre el chat de [paciente]".
- Es donde el obstetra **se entera**; desde aquí salta al Chat o a la pantalla
  correspondiente.

### Se ELIMINA: el módulo "Alertas"
- El tab "Alertas" desaparece de la barra del obstetra.
- Los **signos de alarma** dejan de ser una bandeja separada. La gestión
  (atender / derivar) se mueve a donde tiene sentido clínico: la **ficha de la
  gestante** (ya tiene tab de tamizajes/datos) o como acción dentro de la
  notificación/chat.

> Nota clínica importante: hoy "Alertas" permite **atender/derivar** un signo de
> alarma (cambia su estado). Esa acción NO se pierde: se reubica para no perder
> trazabilidad clínica (ver Fase 3).

---

## 3. Arquitectura objetivo

```
Evento: gestante reporta signo de alarma GRAVE / pulsa emergencia
        │
        ├─► Chat: mensaje (tarjeta de emergencia) en el hilo de la gestante  [ACTUAR]
        │
        └─► Notificación: 1 aviso "Signo de alarma de [paciente]"            [ENTERARSE]
                 al tocarla → abre el Chat de esa gestante

Evento: cita confirmada / reprogramación / recordatorio / adherencia / FPP / exámenes
        └─► Notificación normal → al tocar, abre la pantalla relacionada
```

- **Una sola fuente por evento** desde la perspectiva del usuario:
  - "Conversar / actuar" → **Chat**.
  - "Lista de avisos" → **Notificaciones**.
- El `DangerSign` sigue existiendo en la base de datos (registro clínico e
  indicadores MINSA), pero **deja de tener su propia pantalla**; se consume desde
  la ficha de la gestante.

---

## 4. Navegación final por rol (consistente)

### Obstetra
- **Tabs (5 → 4 clave):** Inicio · Gestantes · Agenda · Chat.
  - Se quita el tab **Alertas**.
  - El badge de pendientes se mueve al **Chat** (mensajes/alertas sin leer) o a
    la **campana** (notificaciones sin leer).
- **Campana (Notificaciones):** se mantiene en el header del Inicio (un único
  punto de acceso claro), no repetida en todas las pantallas.
- **Sidebar:** Reportes · Mi perfil · Mensaje masivo. (Se quita "Notificaciones"
  del sidebar porque ya está la campana → un solo acceso).

### Gestante
- **Tabs:** Inicio · Citas · Tratamiento · Chat · Perfil (sin cambios).
- **Campana (Notificaciones):** solo en el header del Inicio.
- **Sidebar:** Educación · Visitas · Signos de alarma (reportar). Se quita
  "Notificaciones" del sidebar (ya está la campana).

> Regla de consistencia: **un único punto de acceso por destino**. La campana
> abre Notificaciones; el tab Chat abre Chat. Nada duplicado.

---

## 5. Backend: una notificación por evento (sin triplicar)

En `clinical.service.ts → createDangerSign`:
- **Mantener:** crear el `DangerSign` (registro clínico) + 1 `Notification`
  (`signo_alarma`).
- **Mantener** el mensaje en el Chat **solo para GRAVE** (es donde se actúa), con
  la tarjeta profesional ya hecha.
- La notificación de `signo_alarma` debe **apuntar al Chat de esa gestante** (no
  a la pantalla Alertas, que se elimina), incluyendo `gestanteId` para navegar.

En `chat.service.ts → sendEmergencyAlert`: ya crea Message + Notification; la
notificación `emergencia` ya apunta al chat (hecho en commits previos). OK.

Acción clínica (atender/derivar signo): exponer el endpoint existente
(`PATCH /clinical/danger-signs/:id`) desde la **ficha de la gestante** (sección
"Signos de alarma" en su historia), no desde una bandeja aparte.

---

## 6. Plan de implementación por fases (verificable)

| Fase | Acción | Riesgo |
|---|---|---|
| N0 | Quitar el tab **Alertas** del obstetra; mover su badge al Chat. | Bajo |
| N1 | Backend: la notificación `signo_alarma` apunta al Chat (gestanteId); confirmar que emergencia ya apunta al Chat. | Bajo |
| N2 | Reubicar **atender/derivar signo** a la ficha de la gestante (sección Signos de alarma con estado y acciones). Reusa el endpoint actual. | Medio |
| N3 | **Campana única**: dejar la campana solo en el Inicio de cada rol; quitarla de las demás pantallas. Quitar "Notificaciones" del sidebar. | Bajo |
| N4 | Navegación de Notificaciones: `signo_alarma` y `emergencia` → Chat de la gestante (con deep-link por gestanteId). | Bajo |
| N5 | Limpieza: borrar `app/(obstetra)/(tabs)/alertas.tsx`, estilos/imports huérfanos; quitar `useObstetraDashboard().alerts` del tab si ya no se usa. | Bajo |
| N6 | QA por rol (gestante/obstetra): un evento de signo de alarma aparece en Chat + 1 notificación que lleva al Chat; sin pantalla Alertas; campana única. | — |

Cada fase: `tsc` + `jest` + bundle + walkthrough. Commits pequeños.

---

## 7. Resultado esperado

- **De 3 lugares a 2:** el obstetra "se entera" en **Notificaciones** y "actúa"
  en **Chat**. Ya no existe la pestaña Alertas que duplicaba todo.
- **Sin doble acceso:** una sola campana (en Inicio) para Notificaciones; el
  Chat en su tab. Nada repetido en sidebar.
- **Sin pérdida clínica:** los signos de alarma siguen registrados (BD,
  indicadores) y se atienden/derivan desde la ficha de la gestante.
- **Mental model claro:** "Notificaciones = mi lista de avisos", "Chat = donde
  hablo y atiendo urgencias". Fácil de entender para cualquier usuario.

---

## 8. Antes / Después

| | Antes | Después |
|---|---|---|
| Signo de alarma grave | Aparece en Alertas + Notificaciones + Chat | Chat (actuar) + 1 Notificación (avisar→Chat) |
| Tab obstetra | Inicio·Gestantes·Agenda·**Alertas**·Chat | Inicio·Gestantes·Agenda·Chat |
| Acceso a Notificaciones | Campana en ~9 pantallas + sidebar | Campana solo en Inicio |
| Atender/derivar signo | Pantalla Alertas | Ficha de la gestante (Signos de alarma) |
| Confusión | 3 bandejas solapadas | 2 canales con propósito claro |
