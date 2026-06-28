# Plan de integración — OpenWA (WhatsApp self-hosted) en VitMaterna

> **Objetivo:** añadir OpenWA como un **tercer proveedor de WhatsApp** (`provider: "openwa"`)
> junto a `whatsapp_cloud` (Meta) y `mock`, sin romper nada de lo existente. El admin
> podrá elegirlo desde el mismo panel de canales, guardar URL + API key + sesión, y
> probar la conexión. Los envíos de pago (recordatorio de cita 1d, OTP) saldrán por
> OpenWA cuando esté configurado, respetando el kill-switch y las preferencias del usuario.
>
> **Estado de la investigación:** documentación leída (Introduction, API conventions, SDK,
> Sending messages, Webhooks) y **API probada en vivo contra `https://openwa.qware.me`**.

---

## 0. Hechos verificados en vivo (no suposiciones)

| Hecho | Verificación |
|---|---|
| Instancia activa, OpenWA **v0.7.7** | `GET /api/health` → `{"status":"ok","version":"0.7.7"}` |
| Base de la API es **`/api`** (no `/v1`) | conventions + health |
| Auth = header **`X-API-Key`** (nunca query param) | docs + pruebas |
| La key de pruebas tiene rol **operator** (puede enviar) | probe webhook-test→404 (no 403) + envío real→201 |
| Sesión se direcciona por **ID, no por nombre** | `GET /api/sessions/vitmaterna`→404; `GET /api/sessions/e934e1c3-…`→200 |
| Sesión lista: id `e934e1c3-82c6-4b48-9226-c8ffaf9fc293`, phone `51950328511`, status `ready` | `GET /api/sessions` |
| `chatId` = `<número>@c.us` (dígitos, con código país, sin `+`) | docs + envío real |
| Envío de texto funciona | **`POST …/messages/send-text` → 201**, `{messageId,timestamp}` enviado a 51950328511 ✅ |
| `timestamp` de respuesta = epoch **segundos** | conventions |
| Comprobar número: `GET …/contacts/check/{number}` | → `{number:"51950328511",exists:true,whatsappId:"…@lid"}` |
| Sin envoltorio `{success,data}`; errores NestJS `{statusCode,message,error}` | conventions |
| Sesión no iniciada/inexistente en send → **400** (no 404); engine no listo → **409** | docs |
| Rate limit por IP: 10/s, 100/min, 1000/h → 429 con `Retry-After` | conventions |

**Endpoint de envío que usaremos (v1):**
```
POST https://openwa.qware.me/api/sessions/{SESSION_ID}/messages/send-text
Headers: X-API-Key: <key>, Content-Type: application/json
Body:    { "chatId": "51950328511@c.us", "text": "…" }   (text ≤ 4096)
→ 201  { "messageId": "true_…@lid_…_out", "timestamp": 1782663141 }
```

---

## 1. Cómo encaja en la arquitectura actual

El sistema ya tiene una abstracción limpia (ver `ANALISIS_NOTIFICACIONES_ACTUALIZADO.md`):

```
sendPaidNotification(phone,msg,prefs,userId)   ← kill-switch + canal único WA→SMS
        │
        ├─► whatsappChannel.send  ─►  resolveWhatsAppCredentials()  ─► provider:
        │                                                               • whatsapp_cloud (Meta)
        │                                                               • openwa        ← NUEVO
        │                                                               • mock
        └─► smsChannel.send (Twilio / mock)
```

La integración es **aditiva**: se amplía `whatsappChannel` para soportar un nuevo
`provider`. **No** se crea un canal nuevo ni se toca `sendPaidNotification`, la cola,
el cron ni el frontend de preferencias. El "canal" sigue siendo *WhatsApp*; solo cambia
*quién lo entrega*.

> **Decisión de diseño:** OpenWA es un **proveedor alternativo de WhatsApp**, no un canal
> separado. Así el kill-switch de gasto, las preferencias `prefs.whatsapp`, el log de
> entregas y el fallback a SMS siguen funcionando sin cambios. (OpenWA es *gratis* —
> self-hosted —, pero lo dejamos bajo el mismo control de gasto por coherencia; el admin
> puede dejar el kill-switch siempre activado ya que no cuesta créditos.)

---

## 2. Cambios — Backend

### 2.1 `config/env.ts` — nuevas variables (respaldo de entorno)
```
WHATSAPP_PROVIDER: z.enum(['mock','whatsapp_cloud','openwa']).default('mock')   // ← añadir 'openwa'
OPENWA_BASE_URL:   z.string().optional().default('')   // ej. https://openwa.qware.me
OPENWA_API_KEY:    z.string().optional().default('')
OPENWA_SESSION_ID: z.string().optional().default('')   // el ID (uuid) de la sesión
```
`.env.example`: documentar las 3 nuevas claves y el provider `openwa`.

### 2.2 `modules/notifications/channels.ts` — núcleo del cambio
- **`WhatsAppCredentials`**: ampliar `provider` a `'whatsapp_cloud' | 'openwa' | 'mock'` y
  añadir `baseUrl?`, `apiKey?`, `sessionId?`.
- **`resolveWhatsAppCredentials()`**: leer también `cfg.baseUrl/apiKey/sessionId` desde
  `SystemConfig['whatsappConfig']` con respaldo en las nuevas env. (El mismo patrón que ya existe.)
- **`whatsappConfigured(c)`**: ampliar para que sea `true` también si
  `provider==='openwa' && baseUrl && apiKey && sessionId`.
- **Nueva función `sendOpenWA(c, toDigits, message)`** (espejo de `sendWhatsAppCloud`):
  ```ts
  // chatId: dígitos sin '+', + '@c.us'. text ≤ 4096 → se trunca defensivamente.
  POST {baseUrl}/api/sessions/{sessionId}/messages/send-text
  Headers: X-API-Key, Content-Type: application/json
  Body: { chatId: `${toDigits}@c.us`, text }
  // 201 ok. Lanza Error con statusCode+message si !res.ok (para test de conexión).
  // Normaliza errores: 400 "no iniciada"/409 "no lista" → mensaje claro.
  ```
- **`whatsappChannel.send()`**: tras normalizar a E.164 con `toE164PE`, **bifurca por provider**:
  `whatsapp_cloud` → `sendWhatsAppCloud` (como hoy); `openwa` → `sendOpenWA`. El número va sin `+`
  (`e164.replace(/^\+/,'')`), igual que ya se hace para la Cloud API. El resto (DeliveryResult,
  logDelivery) **no cambia**.
- **`getChannelsStatus()`**: incluir `provider` openwa y exponer solo datos públicos
  (`provider`, `configured`, y `baseUrl`/`sessionId` que NO son secretos; **la apiKey nunca se devuelve**).

### 2.3 `notification.controller.ts` + `notification.schema.ts`
- `whatsappConfigSchema`: ampliar el enum de `provider` a incluir `'openwa'` y aceptar
  campos opcionales `baseUrl` (URL válida), `apiKey` (string), `sessionId` (string).
  Mantener `apiToken`/`phoneNumberId` para Meta (compatibilidad).
- `updateWhatsAppConfig`: ya guarda `req.body` tal cual en `SystemConfig['whatsappConfig']`
  → con el schema ampliado, soporta openwa sin cambios de lógica.
- `testChannel` (canal `whatsapp`): bifurcar — si provider `openwa`, validar baseUrl+apiKey+sessionId
  y llamar `sendOpenWA`; si `whatsapp_cloud`, como hoy. Devuelve el mismo `{ok:true}`.
- **Secretos:** la `apiKey` de OpenWA es bearer-equivalente → tratarla como `authToken` de Twilio
  (write-only, nunca en respuestas, `secureTextEntry` en el form).

### 2.4 Sin cambios en
`queue.ts`, `sendPaidNotification`, cron (`notification.service.ts`), `phone.ts`, Prisma
schema, migraciones. (OpenWA reusa toda la maquinaria existente.)

---

## 3. Cambios — Frontend (Expo / RN, respeta `frontend/AGENTS.md`)

### 3.1 `src/services/admin-queries.ts`
- `ChannelsStatus.whatsapp`: añadir `baseUrl?: string|null`, `sessionId?: string|null` y que
  `provider` pueda ser `'openwa'`.
- `useUpdateWhatsAppConfig`: ampliar el tipo del payload a la unión:
  `{provider:'whatsapp_cloud',apiToken?,phoneNumberId?}` **|** `{provider:'openwa',baseUrl?,apiKey?,sessionId?}` **|** `{provider:'mock'}`.

### 3.2 `app/(admin)/(tabs)/notificaciones.tsx`
- En la tarjeta **WhatsApp**, añadir un selector de proveedor: **Meta Cloud API** | **OpenWA (servidor propio)**.
  (Segmented control o dos opciones; usando primitivas del design system — sin `#hex`, sin `Alert.alert`,
  usar `useToast`, etc., según AGENTS.md.)
- Si `openwa`: mostrar campos **URL del servidor** (placeholder `https://openwa.qware.me`, validar URL),
  **API Key** (`secureTextEntry`), **Session ID** (placeholder con el uuid). Texto de ayuda explicando
  que es un gateway self-hosted gratuito.
- Si `whatsapp_cloud`: los campos actuales (API Token, Phone Number ID).
- `saveWa()`: enviar el payload según el proveedor elegido. La **prueba de conexión** (`runTest('whatsapp')`)
  ya funciona vía el backend ampliado — sin cambios de UI salvo habilitarla cuando `waConfigured`.
- Sin cambios en los switches de preferencia de gestante/obstetra (`perfil.tsx`): para el usuario
  sigue siendo "WhatsApp".

---

## 4. Validación / pruebas

1. **Backend typecheck**: `cd backend && npx tsc --noEmit` (debe pasar, hoy pasa).
2. **Unit test** de `sendOpenWA` (mock de `fetch`): 201→ok; 400/409→error tipado. (jest ya configurado.)
3. **Prueba en vivo end-to-end** (ya validada manualmente con curl → 201):
   - Guardar config openwa vía `PUT /v1/notifications/channels/whatsapp` (admin).
   - `POST /v1/notifications/channels/test {canal:'whatsapp',destino:'+51950328511'}` → debe enviar real.
   - `getChannelsStatus` → `whatsapp.provider:'openwa', configured:true`, **sin** exponer la apiKey.
4. **RBAC**: config sigue admin-only; disponibilidad (`channels/status`) sigue para todos.
5. **No-regresión**: con provider `mock` o `whatsapp_cloud`, comportamiento idéntico al actual.
6. **Frontend**: `cd frontend && npm run verify` (tsc + audit:design:strict + jest) debe pasar.

---

## 5. Seguridad y operación

- **API key de OpenWA**: se guarda en `SystemConfig` (BD), nunca se devuelve al cliente, `secureTextEntry`
  en el form. Recomendación: en producción usar una key con rol **operator** y, si OpenWA lo permite,
  *scoped* a la sesión `vitmaterna` + IP allow-list del backend.
- **TLS**: la instancia ya sirve HTTPS (`openwa.qware.me`) → la key viaja cifrada. ✅
- **Rate limit**: 10/s por IP. El cron envía de a uno y la cola BullMQ ya pacea; bajo riesgo. Si
  hiciera falta, BullMQ ya da reintentos con backoff ante un 429.
- **E.164 / chatId**: reusar `toE164PE` (ya valida celular peruano) y quitar el `+` para el `chatId`.
  Defensa extra: `contacts/check` antes de enviar es opcional (no en v1 para no duplicar latencia).
- **Truncado**: `send-text` admite 4096 chars; nuestros mensajes son cortos, pero truncaremos por si acaso.

---

## 6. Fuera de alcance (v1) — propuestas para después

- **Webhooks de entrada** (`message.received`, `message.ack`): permitirían registrar *acuses de entrega/lectura*
  reales y respuestas de la gestante. Requiere endpoint público en el backend + verificación HMAC
  (`X-OpenWA-Signature`) + dedup por `X-OpenWA-Idempotency-Key`. Alto valor, pero es una feature aparte.
- **Multimedia** (`send-image`/`send-document`): p. ej. enviar el carné prenatal o resultados como PDF.
- **Plantillas / bulk**: OpenWA no exige plantillas HSM (a diferencia de Meta), así que los recordatorios
  proactivos funcionan con texto libre — una ventaja real frente a la Cloud API.
- **Gestión de sesión desde el panel** (QR, start/stop) — el admin hoy la gestiona en el dashboard de OpenWA.

---

## 7. Lista de archivos a tocar

**Backend**
- `backend/src/config/env.ts` — +3 env, enum provider.
- `backend/.env.example` — documentar.
- `backend/src/modules/notifications/channels.ts` — credenciales, `sendOpenWA`, bifurcación en `whatsappChannel`, `getChannelsStatus`.
- `backend/src/modules/notifications/notification.schema.ts` — `whatsappConfigSchema` ampliado.
- `backend/src/modules/notifications/notification.controller.ts` — `testChannel` bifurcado.
- `backend/tests/unit/…` — test de `sendOpenWA` (nuevo).

**Frontend**
- `frontend/src/services/admin-queries.ts` — tipos + payload.
- `frontend/app/(admin)/(tabs)/notificaciones.tsx` — selector de proveedor + campos OpenWA.

**Sin tocar:** Prisma/migraciones, cron, cola, `sendPaidNotification`, `phone.ts`, preferencias de usuario.

---

## 8. Estimación

| Fase | Esfuerzo |
|---|---|
| Backend (env + channels + schema + controller + test) | ~45–60 min |
| Frontend (selector + campos + tipos) | ~30–45 min |
| Pruebas en vivo + no-regresión + verify | ~20 min |

Riesgo: **bajo** (cambio aditivo, API ya probada en vivo, sin migraciones).

---

### ¿Confirmas este plan?
Si dices "adelante", implemento Backend → prueba en vivo contra `openwa.qware.me` → Frontend → `verify`,
con commits pequeños. Si prefieres incluir **webhooks de entrega** desde ya (sección 6), dímelo y lo añado al alcance.
