/**
 * Manejo de mensajes ENTRANTES de WhatsApp (vía webhook de OpenWA): mapea el
 * número remitente a una gestante del sistema y vuelca el texto en su chat
 * nativo con el obstetra, emitiéndolo en tiempo real por Socket.IO.
 *
 * Así, una gestante que responde por WhatsApp aparece en el chat del obstetra
 * sin que ninguno de los dos cambie de herramienta (chat unificado).
 */
import { prisma } from '../../config/database.js';
import { toE164PE } from '../../utils/phone.js';
import { findObstetraUserIdForGestante } from './notification.service.js';

/**
 * Extrae los dígitos nacionales (9 dígitos peruanos) de un identificador de
 * WhatsApp entrante. OpenWA puede enviar `51950328511@c.us`, `51950328511` o un
 * `@lid` opaco. Normaliza a E.164 (Perú) y devuelve los 9 dígitos finales para
 * comparar con el teléfono guardado del usuario.
 */
export function nationalDigitsFromWhatsApp(from: string): string | null {
  const raw = from.split('@')[0].replace(/\D+/g, '');
  if (!raw) return null;
  const e164 = toE164PE(raw);
  if (e164) return e164.replace(/^\+51/, '');
  // Respaldo: si ya viene como 9 dígitos nacionales.
  if (/^9\d{8}$/.test(raw)) return raw;
  return null;
}

/**
 * Busca la gestante cuyo teléfono coincide con el número entrante. Compara por
 * los 9 dígitos nacionales para tolerar prefijos (+51 / 51 / nacional).
 * Devuelve la gestante (con su user) o null si no hay coincidencia.
 */
export async function findGestanteByPhone(from: string) {
  const nat = nationalDigitsFromWhatsApp(from);
  if (!nat) return null;

  // Candidatas: usuarios gestante cuyo teléfono contiene los 9 dígitos.
  const users = await prisma.user.findMany({
    where: { role: 'gestante', phone: { contains: nat } },
    select: { id: true },
  });
  if (users.length === 0) return null;

  // Confirmar por normalización exacta (evita falsos positivos por `contains`).
  for (const u of users) {
    const full = await prisma.user.findUnique({ where: { id: u.id }, select: { id: true, phone: true } });
    if (full && nationalDigitsFromWhatsApp(full.phone || '') === nat) {
      const gestante = await prisma.gestante.findUnique({
        where: { userId: full.id },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      });
      if (gestante) return gestante;
    }
  }
  return null;
}

/**
 * Vuelca un mensaje entrante de WhatsApp en el chat nativo. Crea/reutiliza la
 * conversación gestante↔obstetra, persiste el `Message` (emisor = la gestante),
 * lo emite por Socket.IO y notifica al obstetra (in-app + push). Best-effort.
 */
export async function handleInboundWhatsAppMessage(from: string, body: string): Promise<void> {
  const gestante = await findGestanteByPhone(from);
  if (!gestante || !gestante.userId) {
    console.log(`[OPENWA INBOUND] Sin gestante para el número entrante "${from}". Mensaje ignorado.`);
    return;
  }

  // 1) ¿Es una RESPUESTA a un recordatorio (confirmar cita 1/2, "SÍ" suplemento)?
  // Si encaja con un contexto pendiente, se procesa y se responde por WhatsApp,
  // SIN volcarlo al chat (es una acción, no un mensaje de conversación).
  try {
    const { routeInboundCommand } = await import('./openwa.commands.js');
    const result = await routeInboundCommand(gestante.id, body);
    if (result.handled) {
      console.log(`[OPENWA INBOUND] Comando de ${from} procesado (cita/suplemento).`);
      if (result.reply) {
        try {
          const { whatsappChannel } = await import('./channels.js');
          await whatsappChannel.send(from, result.reply);
        } catch {
          /* la acción ya se aplicó; el acuse es best-effort */
        }
      }
      return;
    }
  } catch (e) {
    console.error('[OPENWA INBOUND] Error en el enrutado de comandos:', (e as Error).message);
  }

  // Obstetra a cargo (último control/cita, o el primero disponible).
  const obstetraUserId = await findObstetraUserIdForGestante(gestante.id);
  const obstetra = obstetraUserId
    ? await prisma.obstetra.findUnique({ where: { userId: obstetraUserId } })
    : await prisma.obstetra.findFirst();
  if (!obstetra) {
    console.log('[OPENWA INBOUND] No hay obstetra disponible para asignar la conversación.');
    return;
  }

  // Conversación (crear si no existe).
  let conversation = await prisma.conversation.findFirst({
    where: { gestanteId: gestante.id, obstetraId: obstetra.id },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { gestanteId: gestante.id, obstetraId: obstetra.id },
    });
  }

  // Persistir el mensaje como enviado por la gestante (coherencia del hilo).
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: gestante.userId,
      contenido: body,
      tipo: 'texto',
    },
    include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { ultimoMensaje: new Date() },
  });

  // Tiempo real: entregar a la sala de la conversación y reordenar la bandeja
  // del obstetra aunque no tenga el chat abierto.
  try {
    const { getIO } = await import('../../config/socketRegistry.js');
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversation.id}`).emit('receive_message', message);
      if (obstetra.userId) {
        const nombre = gestante.user ? `${gestante.user.firstName} ${gestante.user.lastName}`.trim() : 'Gestante';
        io.to(`user:${obstetra.userId}`).emit('chat:new_message', {
          conversationId: conversation.id,
          senderId: gestante.userId,
          senderName: nombre,
          preview: body.slice(0, 80),
        });
      }
    }
  } catch {
    /* el mensaje ya quedó persistido; la emisión es best-effort */
  }

  // Notificación in-app + push al obstetra (por si no tiene el chat abierto).
  if (obstetra.userId) {
    try {
      const { notifyUser } = await import('./notification.service.js');
      const nombre = gestante.user ? `${gestante.user.firstName} ${gestante.user.lastName}`.trim() : 'Una gestante';
      await notifyUser(
        obstetra.userId,
        'chat',
        `Nuevo mensaje de ${nombre}`,
        body.slice(0, 120),
        { conversationId: conversation.id, tipo: 'chat', via: 'whatsapp' },
      );
    } catch {
      /* best-effort */
    }
  }

  console.log(`[OPENWA INBOUND] Mensaje de ${from} volcado al chat de la conversación ${conversation.id}.`);
}
