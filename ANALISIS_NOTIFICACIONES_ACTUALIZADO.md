# Análisis del módulo de notificaciones SMS / WhatsApp — VitMaterna (estado actual)

> Generado tras clonar el repo, **levantar el backend** (Postgres 16 + Redis 7 + API
> Express) y ejercitar los endpoints en vivo. Alcance: canales **SMS (Twilio)** y
> **WhatsApp (Cloud API)**, frontend + backend. El push (Expo) solo se menciona donde se cruza.
>
> Nota: el doc `ANALISIS_NOTIFICACIONES_SMS_WHATSAPP.md` del repo está **desactualizado**;
> varios de sus hallazgos críticos ya están corregidos en el código actual (ver §5).

---

## 1. Cómo se levantó (verificado)

| Pieza | Estado |
|---|---|
| PostgreSQL 16 + migraciones Prisma + seed | ✅ 40 gestantes, 4 obstetras, admin demo |
| Redis 7 | ✅ conectado |
| API Express (`npm run dev`) | ✅ boot limpio, cron horario corriendo |
| BullMQ (cola de notificaciones) | ✅ `Cola de notificaciones (BullMQ) inicializada` |
| `backend tsc --noEmit` | ✅ sin errores |
| `frontend tsc --noEmit` | ✅ sin errores |

Credenciales seed: admin `99999999/Admin@2026` · obstetra `11111111/Test@1234` · gestante `33333333/Test@1234`.

Pruebas en vivo de la API (todas pasan):
- `GET /v1/notifications/channels/config` → `sms/whatsapp: mock, configured:false, paidEnabled:true`.
- `POST /v1/notifications/channels/test` en modo mock → `400` "Configura las credenciales…".
- `PUT /channels/sms {provider:twilio,…}` → `configured:true`. Toggle a `mock` y `paid-enabled` ✅.
- RBAC: gestante en `/channels/config` → `403`; en `/channels/status` (disponibilidad) → `200`.

---

## 2. Arquitectura actual

```
Cron horario / eventos                channels.ts                       Proveedor
──────────────────────        ──────────────────────────────     ───────────────────
scanAndSendReminders(1d) ─┐
auth.forgotPassword(OTP) ─┼─► enqueueDelivery() ─► BullMQ ─┐
                          │                                ▼
                          └──(fallback si Redis cae)──► sendPaidNotification()
                                                         │  kill-switch paidChannelsEnabled
                                                         │  prefs.whatsapp / prefs.sms
                                                         ├─► whatsappChannel.send ─► Graph Cloud API
                                                         └─► smsChannel.send       ─► Twilio API
                                                              (UN solo canal: WA→SMS)
                                                                       │
                                          credenciales por envío:      ▼
                                          SystemConfig(admin) → env → mock
                                                       + logDelivery → tabla Notification (auditoría)
```

**Archivos clave (backend):**
- `modules/notifications/channels.ts` — núcleo: `smsChannel`, `whatsappChannel`, resolución de
  credenciales en runtime, `sendPaidNotification` (canal único WA→SMS), kill-switch, `logDelivery`, `getChannelsStatus`.
- `modules/notifications/queue.ts` — BullMQ (3 intentos, backoff exponencial) con **fallback** a envío directo.
- `modules/notifications/notification.service.ts` — escáneres del cron (citas 3d/1d/2h, suplementos, FPP, inasistencia, baja adherencia, exámenes), push Expo, `notifyUser`/`notifyAdmins`, retención.
- `notification.controller.ts` / `notification.routes.ts` / `notification.schema.ts` — endpoints + RBAC + validación Zod.
- `utils/phone.ts` — normalización a **E.164** (Perú `+51` + 9 dígitos).

**Frontend:**
- `app/(admin)/(tabs)/notificaciones.tsx` — panel admin: activar Twilio/WhatsApp, guardar credenciales,
  interruptor global de gasto, envío de prueba. Valida E.164 en cliente.
- `src/services/admin-queries.ts` — hooks `useChannelsConfig / useUpdateSmsConfig / useUpdateWhatsAppConfig / useTestChannel / useSetPaidChannelsEnabled`.
- `app/(gestante|obstetra)/(tabs)/perfil.tsx` — switches de preferencia SMS/WhatsApp/push, **bloqueados** si el admin no configuró el canal (`useChannelsStatus`).

---

## 3. Fortalezas (lo que está muy bien resuelto)

1. **Abstracción limpia** por canal (`NotificationChannel`) + función única de envío.
2. **Credenciales en runtime** (SystemConfig editable por admin, respaldo en env) → activar proveedores sin reiniciar ni tocar código.
3. **Modo mock** automático sin credenciales (no rompe dev; loguea en consola; no ensucia BD).
4. **E.164** centralizado en `toE164PE`, aplicado antes de todo envío (cron, OTP).
5. **Resultados tipados** (`DeliveryResult`) en vez de tragar errores; **persistencia de entregas**
   (`entrega_sms`/`entrega_whatsapp`) para auditoría, ocultas de la bandeja in-app.
6. **Cola con reintentos** (BullMQ) y degradación elegante a envío directo si Redis no está.
7. **Control de gasto** de primer nivel: kill-switch global + envío por **un solo canal** (WhatsApp→SMS),
   y la mayoría de eventos del cron movidos a push+in-app (gratis). Solo cuestan créditos: recordatorio de cita a 1 día y OTP de recuperación.
8. **No expone secretos** al cliente (`getChannelsStatus` solo `provider/configured/número público`).
9. **RBAC** correcto: config solo admin; disponibilidad para cualquier usuario (habilita los switches de preferencia).
10. **Limpieza de push tokens** inválidos (Expo `DeviceNotRegistered`) y **retención** de notificaciones leídas.

---

## 4. Hallazgos abiertos (por severidad)

### 🟠 ALTO

**A1. WhatsApp proactivo fuera de la ventana de 24 h requiere plantilla (HSM).**
`whatsappChannel.send` envía `type:'text'` libre. La Cloud API **solo** permite texto libre dentro de
la ventana de 24 h tras el último mensaje del usuario. Los recordatorios son justamente *proactivos*
(el usuario no escribió primero) → **Meta los rechazará** salvo que se usen *message templates* aprobadas.
Hoy WhatsApp es el canal preferido en `sendPaidNotification`, así que en producción muchos envíos
fallarían y caerían a SMS (o se perderían si SMS no está configurado). *Fix:* soportar plantillas
(`type:'template'`, nombre + variables) para mensajes proactivos.

**A2. El recordatorio de 2 h depende de un cron horario sin recuperación.**
`startReminderCron` corre cada 60 min y `runAll()` también al boot. La ventana de 2 h (`diffHours<=2 && >0`)
puede saltarse si una corrida se pierde (reinicio/caída) en el minuto justo. Con un solo proceso es tolerable,
pero conviene un margen mayor (p. ej. `<=2.5h`) o programar el recordatorio como job retrasado en BullMQ.

### 🟡 MEDIO

**M1. Longitud de SMS no controlada.** Mensajes de cita/OTP superan 160 caracteres → **multi-segmento**
en Twilio (más costo) y posible truncado. No hay aviso ni conteo. *Fix:* contar segmentos / acortar copy.

**M2. Sin tope de costo/rate por usuario o global.** Un pico (muchas citas el mismo día) puede disparar
muchos envíos de pago. El kill-switch es binario (todo/nada); falta un **tope diario** o presupuesto.

**M3. Validación de credenciales superficial.** `smsConfigured`/`whatsappConfigured` solo comprueban que
los campos existan; el primer error real (token inválido, número no verificado) aparece recién en el envío.
El endpoint `test` mitiga esto, pero guardar credenciales malas no avisa hasta probar.

**M4. OTP impreso en consola en modo mock.** `forgotPassword` → `sendPaidNotification` con mock loguea
`[PAID MOCK] … código …`. Aceptable en dev, riesgo en entornos compartidos/logs persistentes.

### 🔵 BAJO / mejora

- **B1.** Versión de Graph API por env (`WHATSAPP_API_VERSION=v21.0`) — bien, pero conviene mantenerla al día (Meta deprecia versiones).
- **B2.** Datos sensibles (nombre, EG, lugar) viajan por SMS/WhatsApp; revisar contra la política de privacidad declarada.
- **B3.** `notification.service.ts` mantiene comentarios/exports legacy (`remindersQueue = null`, "Redis 3.x on Windows", `sendSmsMock`/`sendWhatsApp` como alias) que ya no reflejan el diseño; conviene limpiar para evitar confusión.
- **B4.** El acompañante ya **no** recibe SMS/WhatsApp (decisión de control de gasto). Está implícito; documentarlo evita sorpresas si alguien espera notificarlo.

---

## 5. Qué ya estaba corregido respecto al doc previo del repo

El `ANALISIS_NOTIFICACIONES_SMS_WHATSAPP.md` listaba como críticos/altos varios puntos **ya resueltos**:

| Hallazgo antiguo | Estado actual |
|---|---|
| H1 Teléfonos no E.164 | ✅ `utils/phone.ts` (`toE164PE`) aplicado en `channels.ts` |
| H2 Errores tragados | ✅ `DeliveryResult` tipado + `logDelivery` persiste fallos |
| H3 SMS/WhatsApp sin persistir | ✅ tipos `entrega_sms`/`entrega_whatsapp` en `Notification` |
| H4 Sin cola/reintentos | ✅ BullMQ activo en `queue.ts` con fallback |
| H8 `forgotPassword` doble envío | ✅ ahora `sendPaidNotification` (canal único, respeta prefs) |

Además se añadió un eje nuevo no contemplado antes: **control de gasto** (kill-switch + canal único + migración de eventos a push gratis).

---

## 6. Recomendación priorizada

| # | Acción | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 1 | **Plantillas de WhatsApp (HSM)** para mensajes proactivos | 🟠 Entregabilidad real | Medio-Alto |
| 2 | **Tope diario / presupuesto** de envíos de pago | 🟡 Costo/abuso | Medio |
| 3 | Margen del recordatorio 2 h o job retrasado en BullMQ | 🟠 No perder recordatorios | Bajo-Medio |
| 4 | Control de longitud/segmentos de SMS | 🟡 Costo | Bajo |
| 5 | Limpiar código legacy y documentar acompañante | 🔵 Mantenibilidad | Bajo |

**Conclusión:** el módulo está **maduro y funcional** — abstracción sólida, credenciales en runtime,
auditoría, cola con reintentos y un buen control de gasto. El riesgo #1 para producción real es la
**entregabilidad de WhatsApp proactivo** (plantillas HSM); lo demás son optimizaciones de costo y robustez.
