# Análisis del sistema de notificaciones SMS y WhatsApp — VITMATERNA

> Alcance: canales **SMS (Twilio)** y **WhatsApp (Cloud API)**. No cubre push (Expo) salvo donde se cruza.

## 1. Arquitectura actual (cómo funciona hoy)

```
Cron horario / eventos          channels.ts                 Proveedor externo
─────────────────────    ─────────────────────────    ──────────────────────
scanAndSendReminders ─┐
scanSupplementRemind ─┤
scanUpcomingFPP      ─┼─► sendSmsAndWhatsApp(phone,  ─► smsChannel.send ─► Twilio API
auth.forgotPassword  ─┤       msg, prefs)              └► whatsappChannel.send ─► WhatsApp Cloud
(otros)              ─┘                                       │
                                                             ▼
                          resuelve credenciales por envío:
                          SystemConfig (admin) → env → mock
```

**Piezas:**
- `src/modules/notifications/channels.ts` — núcleo: define `smsChannel`, `whatsappChannel`, `sendSmsAndWhatsApp()`, resolución de credenciales y `getChannelsStatus()`.
- `src/modules/notifications/notification.service.ts` — los *escáneres* del cron que generan los mensajes (recordatorios de cita 3d/1d/2h, suplementos, FPP próxima, etc.).
- `notification.controller.ts` + `notification.routes.ts` — endpoints admin para configurar/probar canales.
- `notification.schema.ts` — validación Zod de la config y la prueba.
- Frontend: `app/(admin)/(tabs)/notificaciones.tsx` + `src/services/admin-queries.ts` — panel del administrador.

**Lo que está bien hecho (fortalezas):**
- ✅ **Abstracción limpia** por canal (`NotificationChannel`) y función única `sendSmsAndWhatsApp`.
- ✅ **Credenciales en runtime**: `SystemConfig` (editable por admin desde la app) con respaldo en variables de entorno → activar Twilio/WhatsApp sin reiniciar ni tocar código.
- ✅ **Modo mock** automático si no hay credenciales (no rompe en desarrollo; loguea en consola).
- ✅ **Respeta preferencias de canal** del usuario (`prefs.sms` / `prefs.whatsapp`).
- ✅ **Prueba de conexión** real (`POST /channels/test`) antes de producción.
- ✅ **No expone secretos** al cliente: `getChannelsStatus` solo devuelve `provider`, `configured` y el número público; nunca `authToken`/`apiToken`.
- ✅ **Dedup** de envíos en el cron (flags `recordatorio3d/1d/2h`, y `Notification` para suplementos/FPP).

---

## 2. Hallazgos (problemas, ordenados por severidad)

### 🔴 CRÍTICO

**H1. Los teléfonos no están en formato E.164 → los envíos reales fallarán.**
Los números se guardan con 9 dígitos sin código de país (verificado en BD: `999888777`, `951753456`). Twilio y WhatsApp Cloud API **exigen E.164** (`+51999888777`). El schema de registro (`auth.schema.ts`) acepta `+51`/`51`/`0051`/9 dígitos pero **no normaliza** antes de guardar. Resultado: en modo mock "funciona", pero al configurar credenciales reales **Twilio devolverá error 21211** y WhatsApp fallará silenciosamente (el error solo se loguea en consola, ver H2). Afecta también a `acompanantePhone`.
→ *Fix:* normalizar a E.164 (`+51` + 9 dígitos) en una sola utilidad, aplicada al guardar y/o justo antes de enviar en `channels.ts`.

**H2. Los fallos de envío se "tragan" (se ignoran) → no hay forma de saber si algo no llegó.**
En `smsChannel.send`/`whatsappChannel.send`, el `catch` solo hace `console.error` y retorna. Además los escáneres llaman con `void sendSmsMock(...)` (fire-and-forget). Consecuencia: **ningún registro de entrega/fallo**, ni reintento, ni visibilidad para el admin. En un sistema de salud materna, un recordatorio de cita que no llega es un riesgo clínico no auditable.
→ *Fix:* persistir el resultado por canal en `Notification` (`canal`, `estado`, `errorDetalle`, `enviadaAt`) y/o un log de entregas.

### 🟠 ALTO

**H3. SMS/WhatsApp NO se persisten en la tabla `Notification` (solo push).**
`notifyUser()` crea fila en `Notification` (canal `push`). Pero `sendSmsAndWhatsApp` envía SMS/WhatsApp **sin crear ningún registro**. El modelo `Notification` ya tiene los campos ideales (`canal` con enum SMS/WhatsApp, `estado`, `enviadaAt`, `errorDetalle`) pero **no se usan para estos canales**. Hay una infraestructura desaprovechada.

**H4. Sin reintentos / cola.** `remindersQueue = null` (BullMQ deshabilitado por "Redis 3.x en Windows"), aunque el proyecto **sí usa Redis 7** (docker-compose) e `ioredis`. Un fallo transitorio de red a Twilio = mensaje perdido para siempre. La librería BullMQ ya está instalada.

**H5. El cron horario puede duplicar/segmentar mal los recordatorios de 2h.** `scanAndSendReminders` corre **cada 60 min**, pero el recordatorio de 2h usa ventana `diffHours <= 2 && > 0`. Según el minuto de arranque, una cita puede caer fuera de la ventana entre dos corridas (p. ej. corre a las 10:00 para una cita a las 11:30 → faltan 1.5h, ya marca; pero una cita a las 12:05 a las 10:00 da 2.08h → no entra, y a las 11:00 da 1.08h → entra; ok) — el riesgo real es que **una corrida perdida** (caída del server) saltee la ventana sin recuperación. Acoplado a H4.

### 🟡 MEDIO

**H6. Longitud de SMS no controlada.** Mensajes como el de FPP o suplementos superan fácilmente 160 caracteres → **multi-segmento** en Twilio (más costo) y posible truncado. No hay aviso ni control de longitud.

**H7. Inconsistencia de notificación al acompañante.** Al acompañante se le envía SMS/WhatsApp **sin pasar sus preferencias** (siempre ambos canales), mientras a la gestante sí se le respetan. Es razonable (el acompañante no tiene cuenta), pero conviene documentarlo/explicitarlo.

**H8. `forgotPassword` envía el OTP por dos llamadas separadas** (`sendSmsMock` + `sendWhatsApp`) en vez de `sendSmsAndWhatsApp`, y **sin** respetar preferencias (correcto para recuperación, pero inconsistente con el resto del código). El código de reseteo viaja por SMS/WhatsApp en texto plano — aceptable, pero el `console.log` del mock imprime el OTP (riesgo en entornos compartidos).

**H9. Sin rate limiting / control de costo por usuario.** Nada impide que un pico (muchas citas el mismo día) dispare cientos de SMS. No hay tope diario por número ni presupuesto.

**H10. Validación de credenciales superficial.** `smsConfigured` solo checa que los campos existan; no valida formato de `fromNumber` (E.164) ni de `phoneNumberId`. El primer error real aparece recién en el envío.

### 🔵 BAJO / mejora

- **H11.** Versión de Graph API fija (`v21.0`) hardcodeada → conviene a env/config para futuras migraciones.
- **H12.** No hay soporte de **plantillas de WhatsApp** (HSM). La Cloud API solo permite texto libre dentro de la ventana de 24h; fuera de ella, los mensajes proactivos (¡que es justo el caso de recordatorios!) **requieren plantilla aprobada**. Esto puede hacer que recordatorios fuera de ventana sean rechazados por Meta.
- **H13.** Mensajes y datos sensibles (nombre, EG, ubicación de emergencia) viajan por SMS/WhatsApp; revisar contra la política de privacidad declarada.
- **H14.** `nodemon`/cron arranca el escaneo inmediatamente al boot (`runAll()`), lo que en cada reinicio re-evalúa todo; con dedup está cubierto, pero conviene tenerlo presente.

---

## 3. Recomendaciones priorizadas

| # | Acción | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 1 | **Normalizar teléfonos a E.164** (`utils/phone.ts`), aplicar en `channels.ts` antes de enviar y al registrar | 🔴 Desbloquea envíos reales | Bajo |
| 2 | **Persistir cada envío SMS/WhatsApp** en `Notification` con `estado`/`errorDetalle`/`enviadaAt` | 🔴 Auditoría + visibilidad | Medio |
| 3 | **Propagar errores** de envío (no solo `console.error`) y exponer estado al admin | 🟠 Confiabilidad | Bajo-Medio |
| 4 | **Reactivar BullMQ** (Redis 7 ya disponible) con reintentos exponenciales | 🟠 No perder mensajes | Medio |
| 5 | **Controlar longitud de SMS** (avisar/segmentar conscientemente) | 🟡 Costo | Bajo |
| 6 | **Plantillas de WhatsApp** para mensajes proactivos fuera de ventana 24h | 🟡 Entregabilidad | Medio-Alto |
| 7 | Rate limit / tope diario por número | 🟡 Costo/abuso | Medio |

---

## 4. Quick win sugerido para esta sesión

Si quieres que **implemente** ahora, propongo el **#1 (normalización E.164)** porque es el bug que impide que el sistema funcione de verdad en producción y es de bajo riesgo:
- Nueva utilidad `src/utils/phone.ts` → `toE164PE(phone)` (`+51` + 9 dígitos; respeta números ya con prefijo).
- Aplicarla dentro de `smsChannel.send` / `whatsappChannel.send` (un solo punto, cubre todos los orígenes: cron, OTP, acompañante).
- Opcional: test unitario de la normalización.

(Marcando aquí que esto es **análisis**; no se ha modificado código todavía.)
