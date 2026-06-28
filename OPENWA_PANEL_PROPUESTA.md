# Propuesta — Panel de gestión OpenWA en el admin de VitMaterna

> Pregunta: *¿se puede integrar un panel en mi admin para gestionar todo usando el SDK de OpenWA?*
> **Respuesta corta: sí, y conviene hacerlo.** Pero con una decisión de arquitectura clave (abajo).
> Verificado en vivo contra `https://openwa.qware.me` con tu key (rol **operator**): stats, chats e
> historial de mensajes son legibles; envío y gestión de sesión funcionan.

---

## 0. La decisión de arquitectura (importante)

El **SDK `@rmyndharis/openwa` es de Node** — corre en el **backend**, no en React Native/Expo. Y la
**API key de OpenWA es bearer-equivalente** (quien la tiene actúa como tú). Por eso:

```
   App admin (Expo/RN)                Backend VitMaterna (Node)             OpenWA gateway
   ───────────────────                ─────────────────────────             ──────────────
   pantalla del panel  ──HTTPS+JWT──►  /v1/admin/openwa/*  ──SDK+X-API-Key──►  openwa.qware.me
   (NUNCA ve la apiKey)               (guarda la key en SystemConfig)         (sesión vitmaterna)
```

- El **panel del admin habla con TU backend** (con el JWT de admin que ya usas), no con OpenWA directo.
- TU backend usa el **SDK** y le pone la `X-API-Key` (que vive cifrada en `SystemConfig`, como ya hicimos).
- Así la key **nunca** viaja al móvil/navegador, respetas el RBAC que ya tienes, y todo queda auditable.

> Alternativa descartada: llamar a OpenWA desde la app. Expondría la apiKey en el cliente y rompería
> el modelo de seguridad. No se hace.

**¿Usamos el SDK o `fetch`?** Hoy el envío usa `fetch` nativo (cero dependencias). Para el panel —que
toca muchos endpoints (sesiones, QR, chats, mensajes, webhooks)— **sí recomiendo añadir el SDK
`@rmyndharis/openwa` en el backend**: da tipos, errores tipados (`OpenWAConflictError`, etc.) y timeout.
Encapsulamos el SDK en un único servicio `openwa.client.ts` para no acoplar el resto del código.

---

## 1. Qué podría gestionar el panel (capacidades reales del SDK)

| Bloque | Qué muestra/hace | Endpoints SDK | Rol |
|---|---|---|---|
| **Estado / salud** | Estado de la sesión (`ready`/`disconnected`/…), teléfono, pushName, última actividad, uso de memoria del gateway, versión | `sessions.get`, `sessions.stats`, `health` | viewer |
| **Conexión (QR / pairing)** | Si la sesión se cae: mostrar **QR** para re-vincular (PNG data-URL → `<img>`), o **código de 8 díg.**; botones start / stop / reconectar | `sessions.getQrCode`, `requestPairingCode`, `start`, `stop` | operator |
| **Envío de prueba** | Lo que ya existe, integrado aquí (texto + número destino) | `messages.sendText` | operator |
| **Historial de entregas** | Mensajes salientes recientes con su estado (enviado/entregado/leído/fallido) — cruzado con el log `entrega_whatsapp` que ya guardamos en `Notification` | `messages` (list) + tabla `Notification` | viewer |
| **Bandeja de entrada** *(requiere fase webhooks)* | Mensajes que las gestantes responden por WhatsApp; responder desde el panel | webhook `message.received` + `messages.sendText` | operator |
| **Difusión / bulk** *(opcional)* | Enviar un aviso a N gestantes (campaña), con pacing y seguimiento de lote | `messages.sendBulk`, `batchStatus`, `cancelBatch` | operator |
| **Webhooks** | Ver/crear/probar el webhook de entrega (para acuses y respuestas) | `webhooks.*` | operator |

> Nota: el envío real de notificaciones (recordatorios, OTP) **ya está resuelto** por el canal que
> implementamos. El panel **no** lo reemplaza: lo *observa y opera* (salud, re-vinculación, pruebas,
> historial), que es justo lo que hoy te falta y solo puedes ver en el dashboard de OpenWA.

---

## 2. Propuesta de UI (dentro de tu admin actual)

Reusar la pantalla `app/(admin)/(tabs)/notificaciones.tsx` (ya es "Canales de notificación") y, cuando
el proveedor de WhatsApp es **OpenWA**, mostrar una sección extra **"Gestión del servidor OpenWA"** con
tarjetas (mismo sistema de diseño, `ScreenLayout`/`AppCard`/`useToast`, sin romper el audit):

1. **Tarjeta Estado** — chip de estado en vivo (verde `ready` / ámbar `disconnected` / rojo `failed`),
   teléfono vinculado, pushName, "última actividad", memoria del gateway y versión. Botón *Actualizar*.
2. **Tarjeta Conexión** — si `status !== 'ready'`: botón **Reconectar** → muestra el **QR** (imagen) o el
   **código de vinculación**; si `ready`: botón **Desconectar** (con `ConfirmSheet`). Poll cada ~3 s
   mientras se vincula (o por webhook `session.status` en la fase 2).
3. **Tarjeta Prueba de envío** — la actual (texto + número), ya enchufada al backend.
4. **Tarjeta Entregas recientes** — lista de los últimos WhatsApp enviados con su estado (de `Notification`
   + opcionalmente el `message.ack` de webhooks).
5. *(Fase 2)* **Bandeja de respuestas** — conversaciones entrantes; responder inline.

Para móvil: tarjetas apiladas; para web (`webShell`): grilla de 2 columnas, como ya hace la pantalla.

---

## 3. Cambios necesarios (resumen, por fases)

### Backend (nuevo módulo fino sobre el SDK)
- `npm i @rmyndharis/openwa` (solo backend).
- `modules/notifications/openwa.client.ts` — fábrica del `OpenWAClient` leyendo baseUrl/apiKey/sessionId
  desde `resolveWhatsAppCredentials()` (ya existe). Un único punto de acceso al SDK.
- `modules/admin/openwa.controller.ts` + rutas `rbac('admin')`:
  - `GET  /v1/admin/openwa/status` → estado + stats (mapea SDK → JSON propio, sin secretos).
  - `POST /v1/admin/openwa/connect` → start + devuelve QR/pairing.
  - `POST /v1/admin/openwa/disconnect` → stop.
  - `GET  /v1/admin/openwa/messages` → historial saliente (paginado).
- Manejo de errores tipados del SDK → `AppError` con mensajes claros (409 engine no listo, 401 key, etc.).

### Frontend
- `src/services/admin-queries.ts` — hooks `useOpenWAStatus` (poll), `useOpenWAConnect`, `useOpenWADisconnect`,
  `useOpenWAMessages`.
- `notificaciones.tsx` — render condicional de la sección "Gestión del servidor OpenWA" cuando provider=openwa.

### Sin tocar
Prisma/migraciones (salvo que la fase 2 de bandeja de entrada quiera persistir entrantes), cron, cola.

---

## 4. Plan por fases (incremental, cada una entregable y testeable)

| Fase | Alcance | Valor | Esfuerzo |
|---|---|---|---|
| **F1 · Observabilidad + Conexión** | Tarjetas Estado, Conexión (QR/pairing, start/stop) y Prueba. Backend con SDK. | Operas y re-vinculas la sesión **sin entrar al dashboard de OpenWA**. Lo más útil ya. | Medio |
| **F2 · Webhooks de entrega** | Endpoint público en backend + verificación HMAC + dedup; registra `message.ack`/`failed` como estado real de entrega; tarjeta "Entregas". | Sabes **si el recordatorio llegó/se leyó** (auditoría clínica real). | Medio |
| **F3 · Bandeja de respuestas** | `message.received` → conversaciones entrantes; responder desde el panel. | Atención bidireccional a la gestante por WhatsApp. | Alto |
| **F4 · Difusión (bulk)** | Campañas a N gestantes con pacing y seguimiento de lote. | Avisos masivos (jornadas, campañas MINSA). | Medio |

**Recomendación:** empezar por **F1** (gestión/observabilidad de la sesión vía SDK) y, como ya estaba en
el plan original, seguir con **F2 (webhooks)** — que era "la siguiente fase" que mencionaste. F1 y F2 juntas
te dan el panel "gestiono y veo todo" sin depender del dashboard externo.

---

## 5. Seguridad (no negociable)
- La apiKey de OpenWA **solo** en backend (`SystemConfig`, cifrada/oculta, ya implementado). El panel
  nunca la recibe ni la envía.
- Todas las rutas del panel bajo `rbac('admin')` + JWT actual.
- El endpoint de webhooks (F2) verifica **HMAC `X-OpenWA-Signature`** y deduplica por
  `X-OpenWA-Idempotency-Key` antes de procesar (como exige la doc).
- Recomendado: en producción, key de OpenWA *scoped* a la sesión `vitmaterna` + IP allow-list del backend.

---

## 6. ¿Cómo seguimos?
Dos opciones, dime cuál:
- **(A)** Implemento **F1 (panel de gestión OpenWA: estado + QR/reconexión + prueba)** ahora, y luego F2.
- **(B)** Sigo con **F2 (webhooks de entrega)** primero —la "siguiente fase" del plan original— y dejo el
  panel de gestión para después.

Mi sugerencia: **A → luego B**, porque el panel hace visible y operable lo que ya construimos, y F2 se
apoya en él (la tarjeta de Entregas muestra justo los `ack` que F2 captura).
