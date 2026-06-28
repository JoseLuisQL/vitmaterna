# Cómo aprovechar OpenWA al máximo en VitMaterna — oportunidades por funcionalidad

> Basado en una lectura real de tu código (no genérico). Tu sistema ya tiene:
> chat nativo gestante↔obstetra (Socket.io, tipos: texto/imagen/alerta_emergencia/educacion),
> botón de auxilio, signos de alarma clínicos, recordatorios de cita/suplementos, visitas
> domiciliarias, contenido educativo y notificaciones in-app+push. **El push es el eslabón
> débil**: depende de un `expoPushToken` que caduca, se borra al reinstalar o si la gestante
> apaga las notificaciones. OpenWA (WhatsApp) es un canal que la gestante **sí** mira siempre.

---

## El principio que lo ordena todo

```
Tiempo real (app abierta) ──► Socket.io   (ya lo tienes, gratis, instantáneo)
Respaldo (app cerrada)    ──► Push Expo    (frágil: token caduca/uninstall)
Respaldo del respaldo     ──► WhatsApp/OpenWA (gratis, self-hosted, SIEMPRE llega)
```

OpenWA no reemplaza tu chat ni tu push: es la **red de seguridad** para que un mensaje
**clínicamente importante nunca se pierda**, y —con webhooks— abre un **canal bidireccional**
para la gestante que no entra a la app.

---

## 1. CHAT NATIVO — el caso más jugoso (tu pregunta)

Hoy: obstetra y gestante chatean por Socket.io; si la otra parte está offline, solo hay push
(`chat.service.ts` → `notifyUser`). Si el push falla, **el mensaje del obstetra se queda sin leer**.

### 1.1 Puente WhatsApp del chat (bidireccional) — ★ alta prioridad
- **Saliente:** cuando el obstetra escribe y la gestante está **offline** (sin socket conectado y/o
  sin token push válido), el backend reenvía ese mensaje por WhatsApp vía OpenWA. La gestante lo
  recibe en WhatsApp aunque no abra la app.
- **Entrante (requiere fase webhooks):** si la gestante **responde por WhatsApp**, el webhook
  `message.received` de OpenWA entra a tu backend, se guarda como `Message` en la `Conversation`
  correcta (match por teléfono→gestante) y aparece en el chat nativo del obstetra **en tiempo real**
  por Socket.io. Resultado: **una sola conversación unificada**, la gestante usa WhatsApp, el obstetra
  usa tu app. Esto es exactamente lo que pediste para tu chat.
- Reusa lo que ya hay: `Message`, `Conversation`, `getIO().emit('receive_message')`, y el control de
  gasto/preferencias. Solo se añade el "salto a WhatsApp" cuando no hay presencia en socket.

### 1.2 Imagen del chat por WhatsApp
Tu `Message` ya soporta `tipo: 'imagen'` + `mediaUrl`. OpenWA tiene `sendImage` (por URL). Si el
obstetra manda una indicación con foto y la gestante está offline, llega por WhatsApp con `caption`.

### 1.3 Espejo de presencia
Marcar en el chat del obstetra "entregado por WhatsApp / leído en WhatsApp" usando los eventos
`message.ack` del webhook → el obstetra **sabe** si su mensaje llegó, no dispara a ciegas.

---

## 2. BOTÓN DE AUXILIO / EMERGENCIA — ★ máxima prioridad clínica

Hoy (`chat.service.ts`, alerta_emergencia): se notifica al obstetra **solo por push**
("Emergencia: botón de auxilio … toca para ver su ubicación"). **Si el token del obstetra falla,
la emergencia no llega.** En salud materna eso es inaceptable.

**Mejora:** ante una emergencia, enviar al obstetra (y, si aplica, al admin de guardia) un
**WhatsApp inmediato** con nombre de la gestante + **ubicación** (OpenWA `sendLocation`, lat/lng que
ya capturas en `domicilioLat/Lng`) además del push. WhatsApp con la pin de ubicación es
inmediatamente accionable desde el teléfono del obstetra. Es el mayor salto de seguridad del sistema.

---

## 3. SIGNOS DE ALARMA CLÍNICOS — ★ alta prioridad

Hoy (`clinical.service.ts`): un signo de alarma GRAVE notifica al obstetra (`notifyUser`) y a los
admins (`notifyAdmins`), in-app+push, y postea en el chat. **Mismo riesgo de push frágil.**

**Mejora:** los signos **graves** salen también por WhatsApp al obstetra responsable (y respaldo al
admin si nadie lo atiende en X minutos — ya tienes el patrón `alarma_sin_atender`). Texto corto y
accionable. Para los no graves, se mantiene solo push+in-app (control de gasto; aunque OpenWA es
gratis, conviene no saturar).

---

## 4. CITAS — confirmación interactiva por WhatsApp (no solo recordar)

Hoy: recordatorio de cita 1 día antes por WhatsApp (texto). Con **webhooks** puedes cerrar el ciclo:

- Enviar "Responde **1** para confirmar tu cita de mañana, **2** para reprogramar".
- El webhook `message.received` lee la respuesta y actualiza `Appointment.estado`
  (`confirmada`/`solicitud_reprogramacion`) automáticamente, sin que la gestante abra la app.
- Esto ataca directo la **inasistencia** (que ya rastreas con `scanMissedAppointments`): subes la
  tasa de confirmación con el canal que la gestante de verdad usa.

---

## 5. SUPLEMENTOS / ADHERENCIA — recordatorio accionable

Hoy: recordatorio diario de toma solo push+in-app (control de gasto). Con webhooks:
- "¿Ya tomaste tu hierro de hoy? Responde **SÍ** y lo registramos." → el webhook crea el
  `SupplementLog` del día. Sube adherencia (que ya mides en `scanLowAdherence`) sin fricción.
- Por gasto, esto puede limitarse a gestantes con **baja adherencia detectada** (intervención dirigida).

---

## 6. EDUCACIÓN — el contenido llega aunque no abra la app

Hoy: el obstetra recomienda contenido y se notifica in-app+push (`recommendContent`). Mejora:
enviar por WhatsApp el título + **enlace profundo** (o el `thumbnailUrl` con `sendImage`) al recurso.
El contenido educativo materno-perinatal llega al bolsillo de la gestante, no se pierde en la campana.

---

## 7. VISITAS DOMICILIARIAS — coordinación con quien está en campo

Hoy: al registrar el acta se notifica a la gestante (push). Mejora:
- Avisar a la gestante **el día previo** por WhatsApp que tendrá visita domiciliaria (con hora).
- Útil porque el personal de campo y muchas gestantes en zonas rurales **viven en WhatsApp**, no en push.

---

## 8. ACOMPAÑANTE — reactivarlo con un canal que sí llega

Hoy el acompañante **ya no** recibe SMS/WhatsApp (decisión de gasto con Twilio). Con OpenWA
**gratis**, tiene sentido reactivar avisos clave al `acompanantePhone` (recordatorio de cita,
emergencia) — sin coste por mensaje. Reduce inasistencia y suma una red de apoyo.

---

## Matriz de priorización

| # | Mejora | Impacto clínico | Requiere webhooks (F2)? | Esfuerzo |
|---|---|---|---|---|
| 2 | Emergencia → WhatsApp + ubicación al obstetra | 🔴 Crítico | No | Bajo |
| 3 | Signos de alarma graves → WhatsApp | 🔴 Alto | No | Bajo |
| 1.1 | Chat unificado gestante↔obstetra por WhatsApp | 🟠 Alto (engagement) | Sí (entrante) | Medio-Alto |
| 4 | Confirmación de cita interactiva (1/2) | 🟠 Alto (inasistencia) | Sí | Medio |
| 5 | Registro de toma de suplemento por WhatsApp | 🟡 Medio (adherencia) | Sí | Medio |
| 1.2 | Imagen del chat por WhatsApp (offline) | 🟡 Medio | No | Bajo |
| 6 | Contenido educativo por WhatsApp | 🟡 Medio | No | Bajo |
| 8 | Reactivar avisos al acompañante (gratis) | 🟡 Medio | No | Bajo |
| 7 | Aviso de visita domiciliaria | 🔵 Útil | No | Bajo |
| 1.3 | Acuses (entregado/leído) en el chat | 🔵 Útil | Sí (ack) | Bajo |

---

## Cómo encaja con lo ya planeado (F1/F2)

- Las mejoras **"No requiere webhooks"** (2, 3, 1.2, 6, 7, 8) se apoyan en el canal de **envío** que ya
  construimos: son básicamente decidir *qué eventos* también salen por WhatsApp. Rápidas y de alto valor.
- Las **bidireccionales** (1.1, 4, 5, 1.3) necesitan **F2 (webhooks de entrada)** — que ya era la
  "siguiente fase". Es decir: **F2 no solo trae acuses de entrega; es la llave de las mejoras más
  potentes** (chat unificado, confirmación de citas, registro por WhatsApp).

### Recomendación de hoja de ruta
1. **Quick wins sin webhooks:** #2 (emergencia) y #3 (alarma) primero — máximo valor clínico, bajo riesgo.
2. **F2 (webhooks)** — desbloquea lo bidireccional.
3. Sobre F2: **#1.1 (chat unificado)** y **#4 (confirmación de citas)**.
4. F1 (panel de gestión OpenWA) en paralelo, para operar/observar todo lo anterior.

---

## Diseño técnico común (para no romper nada)
- Un helper `deliverViaWhatsAppIfOffline(userId, mensaje, opts)` que: comprueba presencia en
  Socket.io y validez del token push; si la persona está **inaccesible**, encola el envío por
  OpenWA (reusa `enqueueDelivery` + `whatsappChannel`, ya con reintentos y log de entregas).
- Respeta **siempre** preferencias del usuario y el **kill-switch** de canales de pago (aunque OpenWA
  sea gratis, el admin manda).
- Lo bidireccional vive en el endpoint de webhooks (F2): verificar **HMAC**, deduplicar por
  `idempotencyKey`, mapear teléfono→`Gestante`, y enrutar a chat/citas/suplementos según el contexto.
- Cero cambios destructivos: todo es **aditivo** sobre la arquitectura de canales y el chat actuales.

---

### ¿Por dónde quieres que arranque?
- **(A)** Quick wins clínicos sin webhooks: **emergencia + signos de alarma por WhatsApp** (#2, #3).
- **(B)** **F2 webhooks** y, encima, el **chat unificado** (#1.1) — tu caso de interés.
- **(C)** El **panel de gestión (F1)** primero, para ver/operar todo.

Mi sugerencia: **A** (impacto clínico inmediato, sin dependencias) → luego **B** (chat unificado).
