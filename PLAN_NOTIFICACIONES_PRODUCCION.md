# Plan — Sistema de notificaciones SMS y WhatsApp listo para producción

> Objetivo: corregir todos los problemas detectados en el análisis, dejar el sistema **robusto, auditable y production-ready**, mejorar la **UX del panel admin** (pruebas y configuración cómodas) y **bloquear los switches** de SMS/WhatsApp en las preferencias de gestantes y obstetras cuando el canal no está configurado.

---

## A. Backend — robustez y producción

### A1. Normalización de teléfonos a E.164 🔴 (raíz del fallo en producción)
- **Nuevo** `src/utils/phone.ts`:
  - `toE164PE(raw): string | null` — convierte `987654321`, `+51987654321`, `51987...`, `0051987...`, con espacios/guiones, a `+51987654321`. Devuelve `null` si es inválido.
  - `isValidE164(v)` helper.
- Aplicar en `channels.ts` dentro de `smsChannel.send` y `whatsappChannel.send` (punto único → cubre cron, OTP, acompañante). Si el número no normaliza → marcar envío como `fallida` con motivo "número inválido" (no lanzar).
- Tests unitarios `tests/unit/phone.test.ts`.

### A2. Persistencia y auditoría de cada envío SMS/WhatsApp 🔴/🟠
- **Refactor de `channels.ts`** para que `send()` devuelva un resultado tipado: `{ channel, to, status: 'sent'|'failed'|'mock'|'invalid', error? }` en vez de `void`.
- `sendSmsAndWhatsApp` registra cada intento real en la tabla `Notification` (ya tiene `canal` sms/whatsapp, `estado` enviada/fallida, `errorDetalle`, `enviadaAt`). 
  - Para no inflar la bandeja in-app del usuario, los registros de SMS/WhatsApp se guardan con un `tipo` técnico (p. ej. `entrega_sms`/`entrega_whatsapp`) **excluidos** del listado de bandeja (filtro en `listNotifications`). Sirven como **log de entregas** consultable por el admin.
- Helper `logDelivery(userId|null, canal, estado, mensaje, errorDetalle?)`.

### A3. Manejo de errores real (no “tragar” fallos) 🟠
- Quitar el patrón `void sendSmsMock(...)` fire-and-forget en `notification.service.ts`; usar `await sendSmsAndWhatsApp(...)` (ya está en casi todos; arreglar `forgotPassword` que usa 2 llamadas sueltas).
- `channels.ts`: el `catch` ya no silencia; devuelve `status: 'failed'` + `error`, que A2 persiste.

### A4. Reintentos con cola (BullMQ + Redis 7) 🟠
- Reactivar `remindersQueue` (hoy `= null` por comentario obsoleto “Redis 3.x Windows”; el proyecto usa Redis 7 + ioredis).
- Cola `notifications` con worker que ejecuta el envío real; reintentos exponenciales (`attempts: 3`, backoff). Si Redis no está disponible al arrancar → **fallback** a envío directo (degradación elegante, no romper).
- Encapsular en `src/modules/notifications/queue.ts` para aislar la dependencia.

### A5. Endpoint de estado de canales para TODOS los roles autenticados 🟠 (habilita el bloqueo de switches)
- **Nuevo** `GET /v1/notifications/channels/status` (solo `authenticate`, sin `rbac('admin')`): devuelve `{ sms: { configured }, whatsapp: { configured } }` SIN secretos.
- El endpoint admin existente `/channels/config` se mantiene (incluye datos de gestión).

### A6. Merge seguro de `notificationPreferences` 🔴 (bug nuevo detectado)
- `auth.service.updateMe` hoy **reemplaza** todo el objeto `notificationPreferences` → al guardar prefs de canal se **borra `expoPushToken`** (rompe push). 
- Fix: **merge** con las preferencias actuales (`{ ...actual, ...input }`), preservando `expoPushToken`.

### A7. Control de longitud de SMS y plantillas WhatsApp 🟡
- Util `smsSegments(msg)` + advertencia en logs si >160; mensajes del cron revisados para ser concisos.
- Documentar en código la limitación de ventana 24h de WhatsApp (plantillas HSM) y dejar `WHATSAPP_API_VERSION` configurable (hoy `v21.0` hardcodeado).

### A8. Validación de credenciales más estricta 🟡
- `fromNumber` debe ser E.164; `phoneNumberId` no vacío. Validar en el schema y en `getChannelsStatus`/`testChannel` con mensajes claros.

---

## B. Frontend — UX de configuración y pruebas (admin)

Rediseño de `app/(admin)/(tabs)/notificaciones.tsx` para que probar y configurar sea cómodo y profesional:
- **Resumen superior**: dos tarjetas-estado (SMS / WhatsApp) con chip Activo/Modo prueba y “última prueba”.
- **Flujo guiado por pasos** en cada canal: 1) activar proveedor, 2) credenciales (con ayuda contextual de dónde obtenerlas), 3) guardar, 4) probar. El botón **Probar** se deshabilita hasta que el canal esté `configured`.
- **Validación en vivo** del número de prueba (E.164) con hint.
- **Feedback claro**: estados de carga, éxito y error específicos; mostrar el error del proveedor de forma legible.
- Mantener el patrón visual del design system (tarjetas, AppButton, tokens). Sin secretos precargados en inputs (placeholder “dejar vacío para no cambiar”).

## C. Frontend — bloqueo de switches según disponibilidad del canal 🟠 (pedido explícito)
- **Hook nuevo** `useChannelsStatus()` en `api-queries.ts` → consume `GET /channels/status` (B/A5), cacheado.
- **Gestante** (`app/(gestante)/(tabs)/perfil.tsx`, modal de preferencias): los switches **SMS** y **WhatsApp** quedan **deshabilitados** (atenuados) si el canal no está `configured`, con leyenda “No disponible — el administrador no ha configurado este canal”. El switch **push/app** siempre disponible.
- **Obstetra** (`app/(obstetra)/(tabs)/perfil.tsx`): hoy “Notificaciones” es solo un modal informativo. Se añade un **modal de preferencias real** (igual que gestante) con los mismos switches y el mismo bloqueo.
- Al deshabilitar, el valor efectivo no se fuerza a OFF en BD (se respeta lo guardado), pero la UI deja claro que el canal no operará hasta que se configure.

---

## D. Verificación
- `npm run tsc` backend y frontend sin errores.
- Tests unitarios de `phone.ts` (y de segmentos SMS).
- Prueba en navegador (admin): configurar mock→activar→guardar→probar; ver estado.
- Prueba en navegador (gestante/obstetra): con canal sin credenciales, switches SMS/WhatsApp bloqueados; con credenciales, habilitados.
- Smoke test del backend (`npm run smoke` si aplica) y arranque del cron sin errores.

## E. Entrega
- Commits pequeños y coherentes (backend core → endpoint → frontend admin → frontend prefs).
- Push a `main`.

---

### Resumen de archivos a tocar/crear
**Backend**
- `src/utils/phone.ts` (nuevo) + test
- `src/modules/notifications/channels.ts` (refactor envío + E.164 + resultado tipado + log)
- `src/modules/notifications/queue.ts` (nuevo, BullMQ con fallback)
- `src/modules/notifications/notification.service.ts` (await + persistencia + usar cola)
- `src/modules/notifications/notification.controller.ts` + `.routes.ts` (endpoint `/channels/status`)
- `src/modules/notifications/notification.schema.ts` (validación credenciales)
- `src/modules/auth/auth.service.ts` (merge de preferencias) + `auth.controller.ts` (forgotPassword)
- `src/config/env.ts` (`WHATSAPP_API_VERSION`)

**Frontend**
- `src/services/api-queries.ts` (`useChannelsStatus`, merge de prefs preservando push)
- `app/(admin)/(tabs)/notificaciones.tsx` (rediseño)
- `app/(gestante)/(tabs)/perfil.tsx` (bloqueo de switches)
- `app/(obstetra)/(tabs)/perfil.tsx` (modal de preferencias real + bloqueo)
