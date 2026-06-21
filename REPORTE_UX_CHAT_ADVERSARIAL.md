# Test Adversarial de UX — Sistema de Chat y Notificaciones VITMATERNA

> Análisis profundo del flujo de chat (obstetra ↔ gestante) y notificaciones,
> ejecutado con dos personas "torpes" recorriendo la app en vivo (web), más
> auditoría del código backend + frontend. Incluye el filtro pragmático
> obligatorio y los tickets accionables que guían el refactor.

---

## Personas

### 1) Obst. Rosa Ñahui — 54 años, obstetra de C.S. Talavera
WhatsApp y nada más. Atiende 40 gestantes. "Si no veo de un vistazo quién me
escribió y qué necesita, vuelvo a mi cuaderno." Odia el texto chico, los menús
escondidos y tener que dar más de dos toques para responder un mensaje.

### 2) Ana Gómez — 27 años, gestante, zona rural de Andahuaylas
Usa el celular para WhatsApp y Facebook. Conexión que va y viene. "Yo escribo y
le doy Enter como en WhatsApp. Si no se manda, pienso que está malogrado."

---

## Step 2-3: El Despotrique (en personaje)

### Obst. Rosa — Reseña de la "Bandeja de Consultas"

**Overall: NO, así no. Maybe si lo arreglan.**

**LO BUENO (a regañadientes):**
- Cuando por fin abrí un chat, se ve quién está "en línea" y la última vez. Eso
  está bien, como WhatsApp.
- Los globos de mensaje se ven decentes y la foto de perfil con inicial ayuda.
- La tarjeta roja de emergencia adentro del chat sí se entiende.

**LO MALO (problemas de verdad):**
- "Tengo CUATRO gestantes y en la bandeja solo me salen DOS." Las que nunca me
  escribieron no aparecen. Para hablarle a las otras tengo que acordarme de un
  botón "Nueva conversación", buscarla por DNI y recién ahí escribir. En
  WhatsApp todos mis contactos están ahí. ¿Por qué aquí no?
- "El último mensaje me sale GIGANTE y con un dibujito de bomba 🚨 y una
  dirección de internet larguísima." En la bandeja debería decir cortito "Alerta
  de emergencia", no pegarme todo el texto con el link de Google Maps.
- "Todos los chats dicen la misma hora (03:25 AM)." No sé cuál me escribió
  primero ni cuál es más reciente. Yo necesito que el que me escribió HACE RATO
  y no le he contestado salga ARRIBA y resaltado.
- "No hay un buscador en la lista." Si tuviera 40 gestantes, ¿cómo encuentro a
  la señora Quispe? Bajando con el dedo como tonta.
- En la computadora grande: abro un chat y la lista de gestantes DESAPARECE.
  Tengo una pantalla enorme vacía a la izquierda y un chat al medio. WhatsApp Web
  me deja la lista al costado y el chat al lado. Aquí no.
- Le di a "Chat" en el menú de la izquierda estando dentro de un chat y NO PASÓ
  NADA, me quedé en el mismo chat. Tuve que buscar una flechita.

**LO FEO (me haría cerrar la app):**
- "Escribí 'Hola Ana, ¿cómo sigues?' y le di Enter. Se hizo para abajo el
  cursor, NO SE MANDÓ. Pensé que estaba malogrado." Tuve que buscar el botón
  azul. En WhatsApp Enter manda. Punto.

**QUEJAS ESPECÍFICAS:**
1. Bandeja: "¿Dónde están mis otras gestantes?" — solo aparecen las que tienen
   conversación creada; el resto requiere flujo aparte.
2. Bandeja: "el mensajito está hecho un choclo" — el preview muestra el texto
   crudo de la alerta con emoji y URL.
3. Bandeja: "no sé a quién contestar primero" — sin orden real por recencia ni
   resalte fuerte de no leídos.
4. Bandeja: "no hay lupa para buscar" — sin buscador en la lista del obstetra.
5. Escritorio: "se me va la lista" — en web no hay vista de dos columnas
   (lista + chat).
6. Mensaje: "Enter no manda" — el Enter hace salto de línea.

**VERDICT:** "Bonito pero me hace trabajar de más. Si no me ponen a TODAS mis
gestantes en una sola lista ordenada por quién me escribió último, y si Enter no
manda, me quedo con mi cuaderno."

### Ana (gestante) — Reseña de "Mi obstetra"

**Overall: Maybe.**

**LO BUENO:** Entro y ya está mi obstetra, no tengo que buscar nada. La foto y
"en línea" me gusta.

**LO MALO:**
- "Le di Enter para mandar y no se mandó, se bajó el renglón." Igual que se quejó
  todo el mundo.
- "Cuando hay mensajes de otro día no me sale ninguna rayita que diga 'ayer' u
  'hoy'." Se me mezclan los días.

**LO FEO:** Nada que me haga cerrarla, pero el Enter me desespera.

**VERDICT:** "Está bien para hablar con mi obstetra, pero háganlo que el Enter
mande como WhatsApp y que diga qué día es cada mensaje."

---

## Step 4: Filtro Pragmático (obligatorio)

| # | Queja | ¿35 años ocupado igual se queja? | Veredicto |
|---|---|---|---|
| 1 | Solo aparecen gestantes con conversación creada | Sí, rompe el modelo mental "lista de contactos" | **RED** |
| 2 | Preview del último mensaje crudo (emoji + URL larga, alerta sin resumir) | Sí, se ve roto/poco profesional | **RED** |
| 3 | Sin orden fiable por recencia + no leídos arriba | Sí, es el comportamiento esperado de toda app de mensajería | **RED** |
| 4 | Enter no envía (hace salto de línea) | Sí, expectativa universal estilo WhatsApp | **RED** |
| 5 | Web: sin vista lista+chat (master-detail) | Sí, WhatsApp Web es el estándar mental | **RED** |
| 6 | Sin buscador en la lista del obstetra | Sí, con 30+ gestantes es indispensable | **RED** |
| 7 | Separadores de fecha (Hoy/Ayer) en el hilo | Sí, mejora legibilidad, esfuerzo bajo | **GREEN/RED bajo** |
| 8 | Click en "Chat" del sidebar no vuelve a la lista estando en un hilo | Sí, navegación confusa | **RED** |
| 9 | Payload `/chat/conversations` trae TODO el objeto gestante (datos clínicos) | No lo ve el usuario, pero es bug real de rendimiento/seguridad | **RED (técnico)** |
| 10 | Dos sockets paralelos (`useSocket` + `useNotificationRealtime`) por usuario | No visible, pero duplica conexiones y eventos | **YELLOW** |
| 11 | `useChat` no escucha `chat:new_message` global → si tengo la lista abierta, no sube el chat nuevo sin refrescar | Sí, en lista del obstetra los mensajes nuevos no reordenan en vivo | **RED** |
| 12 | "Quiero que la app sea como mi cuaderno" | — | **WHITE** (ruido) |
| 13 | Reciclar avatar con color por riesgo en la lista | Mejora de identificación | **GREEN** |

**Hallazgos técnicos adicionales (auditoría de código, no vistos por el usuario):**
- `listConversations` ordena por `ultimoMensaje` pero las conversaciones nuevas
  tienen `ultimoMensaje = null` → quedan al fondo o en orden indefinido (RED #3).
- El broadcast y `recommendContent` actualizan `ultimoMensaje` pero **no emiten**
  `chat:new_message` al destinatario de forma consistente para reordenar la lista.
- `getOrCreateConversation` para obstetra sin `targetId` lanza error 400 en vez
  de devolver la primera conversación de forma robusta (fricción al entrar).
- El preview en la bandeja se calcula en el cliente con `messages[0].contenido`
  sin sanear tipo `imagen`/`educacion`/`alerta_emergencia`.

---

## Step 5: Tickets (RED + GREEN, máx 10) — etiqueta `ux-review`

**CHAT-01 (RED) — La bandeja del obstetra debe listar TODAS sus gestantes**
> "Tengo cuatro gestantes y solo me salen dos."
Mostrar todas las gestantes asignadas como conversaciones (creando placeholder si
no hay mensajes), ordenadas por último mensaje y luego alfabético. Fix: backend
`listConversations` hace `LEFT JOIN` desde gestantes del obstetra.

**CHAT-02 (RED) — Preview profesional del último mensaje**
> "El mensajito está hecho un choclo con un dibujo de bomba y un link."
Resumir por tipo: texto (recortado), `imagen`→"📷 Foto", `educacion`→"📚 Contenido
recomendado", `alerta_emergencia`→"🚨 Alerta de emergencia". Sin URLs crudas.
Utilidad compartida `chatPreview()`.

**CHAT-03 (RED) — Orden por recencia + no leídos arriba, resalte fuerte**
> "No sé a quién contestar primero."
Ordenar por `ultimoMensaje` real (placeholder al fondo), nombre en negrita +
badge contador + hora resaltada cuando hay no leídos.

**CHAT-04 (RED) — Enter envía (web), Shift+Enter = salto de línea**
> "Le di Enter y no se mandó."
En web, `onKeyPress` Enter sin Shift → enviar. En móvil se mantiene el botón.

**CHAT-05 (RED) — Vista master-detail en web (lista + chat lado a lado)**
> "Abro un chat y se me va la lista."
En `webShell`, lista a la izquierda (≈360px) + hilo a la derecha, como WhatsApp
Web. Selección resaltada.

**CHAT-06 (RED) — Buscador en la lista del obstetra**
> "No hay lupa para buscar."
Campo de búsqueda por nombre/DNI sobre la lista de conversaciones.

**CHAT-07 (RED) — Mensajes nuevos reordenan la lista en vivo**
Suscribir la lista a `chat:new_message`/`chat:unread_changed` para subir la
conversación y actualizar preview/badge sin recargar.

**CHAT-08 (RED) — Payload ligero y seguro de `/chat/conversations`**
Devolver solo lo que la lista necesita (id, nombre, dni, riesgo, lastSeen,
preview, hora, unread). No exponer el objeto clínico completo.

**CHAT-09 (GREEN) — Separadores de fecha en el hilo (Hoy/Ayer/fecha)**
Cabeceras de día entre mensajes, estilo WhatsApp.

**CHAT-10 (GREEN) — Avatar con color de riesgo en la lista del obstetra**
Inicial sobre color del semáforo (verde/ámbar/rojo) para identificar de un
vistazo a las gestantes de alto riesgo.

**YELLOW (catch-all):** unificar las dos conexiones socket en un proveedor
único; navegación "Chat" del sidebar debe volver a la lista; manejar
`getOrCreateConversation` del obstetra sin error 400.

**WHITE (solo reporte):** "quiero que sea como mi cuaderno de papel".

---

## Conclusión del test

Cero items WHITE relevantes = el chat tiene problemas reales de UX, no solo
personas gruñonas. Los 8 RED se concentran en **la bandeja del obstetra** (lo
que pediste explícitamente: cargar gestantes con diseño profesional, fácil de
identificar y con los últimos mensajes primero) y en **paridad con WhatsApp**
(Enter envía, master-detail web, separadores de fecha). El refactor que sigue
ataca todos los RED + los dos GREEN.

---

## Refactor implementado y VERIFICADO en navegador

### Backend (`backend/src/modules/chat/chat.service.ts`)
- **`listConversations` reescrito**: el obstetra ve **todas sus gestantes**
  (por cita / control / conversación) como contactos; payload **ligero y seguro**
  (`ConversationListItem`: id, nombre, dni, riesgo, lastSeen, preview, hora,
  unread, otherUserId) en vez del objeto clínico completo. [CHAT-01, CHAT-08]
- **`buildPreview()`**: resumen profesional por tipo (texto recortado, "Foto",
  "Contenido educativo recomendado", "Alerta de emergencia"); nunca URLs crudas.
  [CHAT-02]
- **`sortInbox()`**: orden por último mensaje desc, no leídos arriba, vacías al
  final alfabéticas (arregla `ultimoMensaje = null`). [CHAT-03]
- **`recommendContent` y `sendBroadcast`** emiten `chat:new_message` para
  reordenar la bandeja en vivo. [CHAT-07]
- **`getOrCreateConversation`** del obstetra ya no lanza 400 sin `targetId`.

### Frontend — componentes compartidos nuevos (una sola fuente de verdad)
- `src/utils/chatFormat.ts`: hora de bandeja/hilo, separadores de día, `chatPreview`, icono por tipo.
- `src/components/shared/ConversationListItem.tsx`: fila estilo WhatsApp (avatar
  con **color de riesgo** [CHAT-10], nombre, preview con icono, hora, badge, online).
- `src/components/shared/ChatInput.tsx`: barra de redacción con **Enter envía /
  Shift+Enter salto** en web. [CHAT-04]
- `src/components/shared/MessageThread.tsx`: hilo con **separadores de fecha**
  (Hoy/Ayer), burbujas (texto/imagen/educación/emergencia), recibos de lectura. [CHAT-09]

### Frontend — pantallas reescritas
- `app/(obstetra)/(tabs)/chat.tsx`: **buscador** [CHAT-06], **master-detail en
  web** (lista + hilo) [CHAT-05], reorden en vivo [CHAT-07], lista con todas las
  gestantes [CHAT-01].
- `app/(gestante)/(tabs)/chat.tsx`: reutiliza MessageThread + ChatInput
  (Enter envía, separadores de fecha), consistente con el obstetra.

### Verificación
- `tsc` backend ✅ · `tsc` frontend ✅ · `audit:design` 0 violaciones ✅
- Navegador (web): obstetra ve 3+ gestantes ordenadas por recencia, badges de no
  leídos, preview "Alerta de emergencia" limpio, master-detail, **Enter envía**;
  gestante con separador "Hoy" y **Enter envía**; al responder la gestante, su
  conversación **sube al tope con badge** en la lista del obstetra en tiempo real.

**Resultado: los 8 RED + 2 GREEN resueltos.** El chat es ahora consistente,
profesional y de uso tipo WhatsApp en web y móvil.
