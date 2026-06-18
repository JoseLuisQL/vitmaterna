# VITMATERNA — Análisis del sistema de notificaciones y plan de mejora

> Auditoría + simulación en vivo del flujo de notificaciones en los 3 roles
> (admin, obstetra, gestante). Basado en el código real y pruebas ejecutadas el
> 2026-06-18 contra la API y la base de datos.

---

## 1. Cómo funciona hoy (entendimiento completo)

### Modelo de datos (`Notification`)
`id · userId · tipo · canal · titulo · mensaje · datos(JSONB) · estado
(pendiente/enviada/leida) · programadaPara · enviadaAt · leidaAt · errorDetalle ·
createdAt`. Índices por `(userId, createdAt)` y `(tipo, createdAt)`.

### Canales
1. **In-app** (tabla `notifications`): la bandeja persistente. Es el foco de este
   análisis.
2. **Push** (Expo): se envía si el usuario tiene `expoPushToken`.
3. **SMS / WhatsApp** (Twilio / WhatsApp Cloud): el admin configura credenciales;
   sin ellas operan en modo *mock* (log en consola).

### Generación (backend)
`notifyUser(userId, tipo, titulo, mensaje, datos)` crea la fila in-app + push.
Tipos que existen hoy (12): `cita_confirmada`, `solicitud_reprogramacion`,
`reprogramacion_aprobada`, `reprogramacion_rechazada`, `cita_domiciliaria`,
`visita_domiciliaria`, `inasistencia`, `signo_alarma`, `baja_adherencia`,
`recordatorio_suplemento`, `fpp_proxima`, `examenes_pendientes`. En BD además
aparece `resultado_laboratorio`.

### API (`/v1/notifications`)
`GET /` (lista, máx 100) · `GET /unread-count` · `PATCH /:id/read` ·
`PATCH /read-all` · `POST /token` · `DELETE /token` · `channels/*` (admin).

### Frontend
- **Bandeja** (`NotificationsScreen`, compartida): filtro Todas/No leídas,
  agrupación Hoy/Esta semana/Anteriores, tocar abre la pantalla relacionada y
  marca leída, "Leer todo", pull-to-refresh, iconos por tipo.
- **Campana** (`NotificationBell`): badge de no leídas, refresco cada 60 s.
- **Gestante y obstetra** usan la bandeja. **El admin NO** (su pantalla
  "Notificaciones" es solo configuración de canales SMS/WhatsApp).

### Resultado de la simulación en vivo
| Rol | Bandeja in-app | No leídas (prueba) | Observación |
|---|---|---|---|
| Gestante (33333333) | ✅ | **75** | Exceso acumulado de recordatorios |
| Obstetra (11111111) | ✅ | 2 | OK |
| Admin (99999999) | ❌ | 0 | Sin bandeja; no recibe in-app |

BD: **244 notificaciones** acumuladas, 33 sin leer globalmente.

---

## 2. BUGS Y FALLAS DETECTADAS (verificadas)

### 🔴 N-1 — No se pueden borrar/limpiar notificaciones `(P1, lo que pediste)`
No existe `DELETE /notifications/:id` ni `DELETE /notifications` (probado: ambos
**404**). El usuario solo puede marcar como leídas; la bandeja crece sin límite
(la gestante ya tiene 75 sin leer / cientos en total). Ninguna app real funciona
así.

### 🔴 N-2 — Inconsistencia conteo vs. lista `(P1)`
`GET /unread-count` devuelve **75**, pero `GET /` está topado en **50** (máx 100
con `take`). El usuario ve "75 sin leer" pero la lista nunca muestra todas →
"Leer todo" funciona, pero la lista miente y no hay paginación/scroll infinito.

### 🟠 N-3 — Las preferencias del usuario NO se respetan `(P1)`
El usuario tiene `notificationPreferences { push, sms, whatsapp }` (configurables
en su perfil), pero el backend **ignora esas banderas**: siempre envía push si
hay token y siempre SMS+WhatsApp. Apagar un canal en el perfil no tiene efecto.

### 🟠 N-4 — Push sin manejo de tickets/recibos `(P2)`
`sendPushNotification` envía y descarta los tickets ("We can handle receipts
later"). Los tokens inválidos (`DeviceNotRegistered`) nunca se limpian → se
acumulan envíos fallidos y se desperdician recursos.

### 🟠 N-5 — El admin queda fuera del sistema in-app `(P2)`
El admin no tiene bandeja ni recibe avisos in-app de eventos relevantes
(obstetra pendiente de aprobación, signo de alarma grave sin atender, fallo de
canal SMS/WhatsApp). Para un sistema "premium" el admin debería tener su propia
bandeja de eventos de sistema.

### 🟡 N-6 — Tipo sin icono → cae al genérico `(P3)`
`resultado_laboratorio` (30 en BD) no está en el mapa de iconos del frontend →
se muestra con la campana genérica. Faltan estilos por tipo.

### 🟡 N-7 — Sin "tiempo real" en notificaciones `(P2)`
La campana refresca por *polling* cada 60 s y la bandeja al enfocar. No usa
Socket.IO (que ya existe para chat/citas). Una notificación puede tardar hasta
1 min en aparecer.

### 🟡 N-8 — Sin agrupación/colapso de recordatorios repetidos `(P3)`
Los recordatorios diarios de suplemento generan una notificación por día →
saturan la bandeja (causa de las 75). No hay colapso ("Recordatorio de hierro ·
3 días").

### 🟡 N-9 — Borrado de usuario deja notificaciones huérfanas `(P3)`
La relación `Notification → User` no declara `onDelete: Cascade`. Si se elimina
(hard-delete) un usuario, sus notificaciones quedan colgadas.

### 🟢 N-10 — Detalles menores
- No hay categorías/prioridad (todo es una lista plana; las urgencias solo se
  distinguen por color).
- `estado` (pendiente/enviada/leida) existe pero no se explota (no hay reintentos
  de envío fallido ni cola visible).

---

## 3. Lo que SÍ está bien (no tocar)
- Modelo de datos sólido y bien indexado.
- Bandeja compartida con filtro, agrupación por antigüedad y *deep-link* por tipo.
- Optimistic updates en marcar leída / leer todo.
- Multicanal con credenciales en caliente (Twilio/WhatsApp) y modo mock.
- Badge con refresco automático.

---

## 4. PLAN DE MEJORA — hacia un módulo premium

### Fase 1 — Borrar/limpiar (tu pedido) + consistencia `(P1)`
- [ ] **Backend**: `DELETE /notifications/:id` (borra una, con verificación de
      propiedad) y `DELETE /notifications` con query opcional
      (`?soloLeidas=true` para "limpiar leídas", o todas).
- [ ] **Frontend**: deslizar para borrar (swipe) cada notificación + botón
      "Limpiar" en el header (con menú: "Borrar leídas" / "Borrar todas") con
      confirmación. Optimistic update.
- [ ] Arreglar **N-2**: paginación real (scroll infinito) o subir el `take`
      coherente con el conteo; el badge y la lista deben cuadrar.

### Fase 2 — Preferencias reales + tiempo real `(P1/P2)`
- [ ] Respetar `notificationPreferences { push, sms, whatsapp }` en `notifyUser`
      y en el cron (no enviar por un canal apagado).
- [ ] Emitir `notification:new` por Socket.IO a `user:<id>` al crear una
      notificación → la campana y la bandeja se actualizan al instante (reusar la
      infraestructura ya usada en chat/citas).

### Fase 3 — Robustez de push `(P2)`
- [ ] Procesar tickets/recibos de Expo; ante `DeviceNotRegistered`, eliminar el
      `expoPushToken` del usuario automáticamente.
- [ ] Soportar múltiples dispositivos por usuario (array de tokens) — opcional.

### Fase 4 — Bandeja del admin + categorías `(P2)`
- [ ] Dar al admin su propia bandeja in-app (eventos de sistema: obstetra por
      aprobar, alarma grave sin atender +X h, canal caído) además de la config de
      canales actual.
- [ ] Añadir **categoría** y **prioridad** al modelo (clínica / cita / sistema;
      alta / normal) para filtros ("Solo urgentes") y mejor orden.

### Fase 5 — Pulido premium `(P3)`
- [ ] Icono/estilo para `resultado_laboratorio` y cualquier tipo nuevo
      (catálogo único de tipos compartido back/front).
- [ ] Colapso de recordatorios repetidos ("Hierro · 3 recordatorios").
- [ ] `onDelete: Cascade` en la relación Notification→User.
- [ ] Auto-retención: borrar/archivar automáticamente notificaciones leídas con
      más de N días (job de limpieza), para mantener la bandeja sana.
- [ ] Centro de preferencias por tipo ("no quiero recordatorios de X").

---

## 5. Mejoras "del mundo real" (sistemas premium)
Inspirado en cómo lo hacen apps líderes (WhatsApp, Gmail, Slack, banca):
1. **Swipe-to-delete + deshacer** ("Notificación eliminada · Deshacer").
2. **Agrupación inteligente** por hilo/tipo (como Gmail) para no saturar.
3. **Centro de preferencias granular** por tipo y canal.
4. **Prioridad y silenciado** (urgentes siempre; recordatorios silenciables).
5. **Tiempo real** (sin esperar al polling).
6. **Limpieza automática** de antiguas leídas (retención configurable).
7. **Estado de entrega** visible para canales críticos (enviado/entregado/leído).
8. **Acciones rápidas** dentro de la notificación (confirmar cita desde el aviso).

---

## 6. Resultado esperado
Un módulo de notificaciones **completo y profesional**: el usuario puede limpiar
su bandeja (borrar una o todas), las preferencias se respetan, los avisos llegan
en tiempo real, el admin tiene su propio centro de eventos, el push se
auto-depura, y la bandeja se mantiene sana con retención automática — con una UX
pulida (swipe, deshacer, categorías) al nivel de una app comercial.

---

*Plan generado tras simulación en vivo. Cada fase es incremental y validable.
La Fase 1 (borrar/limpiar) cubre directamente lo solicitado y es el mejor punto
de arranque.*
