/**
 * Enrutado de RESPUESTAS por WhatsApp de la gestante a acciones del sistema
 * (interpretación de comandos cortos), para cerrar el ciclo sin que abra la app:
 *
 *  - Confirmación de cita (OPORTUNIDADES #4): tras el recordatorio "responde 1
 *    para confirmar, 2 para reprogramar", el "1"/"2" actualiza `Appointment.estado`.
 *  - Registro de toma de suplemento (#5): tras "¿ya tomaste tu hierro? responde
 *    SÍ", el "SÍ" crea el `SupplementLog` del día.
 *
 * Diseño: una respuesta solo se interpreta como comando si la gestante tiene un
 * contexto pendiente reciente (una cita por confirmar mañana, o un recordatorio
 * de suplemento de hoy). Si no hay contexto o el texto no encaja, NO se consume:
 * el mensaje cae al chat normal (`handled:false`) para no "tragar" mensajes reales.
 *
 * Best-effort y sin efectos colaterales si algo falla: nunca lanza.
 */
import { prisma } from '../../config/database.js';

export interface CommandResult {
  /** true si el texto se interpretó como un comando y ya se procesó. */
  handled: boolean;
  /** Respuesta a enviar de vuelta a la gestante por WhatsApp (si aplica). */
  reply?: string;
}

/** Normaliza el texto entrante: minúsculas, sin tildes ni espacios sobrantes. */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const AFFIRMATIVE = new Set(['si', 'sí', 'yes', 'ya', 'tomada', 'tomado', 'ok', 'okay', 'listo']);

/** Medianoche UTC del día de `d` (para comparar contra SupplementLog.fecha @db.Date). */
function midnightUTC(d: Date): Date {
  return new Date(`${d.toISOString().split('T')[0]}T00:00:00.000Z`);
}

/**
 * Intenta interpretar `body` como respuesta a un recordatorio de CITA de la
 * gestante. Solo actúa si tiene una cita programada/confirmada en las próximas
 * ~48 h con recordatorio de 1 día ya enviado (contexto vigente).
 *   "1" → confirma la cita.   "2" → solicita reprogramación.
 */
async function tryAppointmentReply(gestanteId: string, body: string): Promise<CommandResult> {
  const t = normalize(body);
  const isConfirm = t === '1' || t === 'confirmar' || t === 'confirmo' || t === 'si confirmo';
  const isReschedule = t === '2' || t === 'reprogramar' || t === 'cambiar';
  if (!isConfirm && !isReschedule) return { handled: false };

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const appt = await prisma.appointment.findFirst({
    where: {
      gestanteId,
      estado: { in: ['programada', 'confirmada'] },
      fecha: { gte: midnightUTC(now), lte: in48h },
      recordatorio1d: true,
    },
    orderBy: { fecha: 'asc' },
  });
  if (!appt) return { handled: false };

  if (isConfirm) {
    if (appt.estado !== 'confirmada') {
      await prisma.appointment.update({ where: { id: appt.id }, data: { estado: 'confirmada' } });
    }
    return { handled: true, reply: 'Gracias, tu cita quedó CONFIRMADA. Te esperamos. Si necesitas cambiarla, responde 2.' };
  }
  // Reprogramación: marca la solicitud y avisa al obstetra responsable.
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { estado: 'solicitud_reprogramacion', estadoPrevio: appt.estado },
  });
  try {
    const { findObstetraUserIdForGestante, notifyUser } = await import('./notification.service.js');
    const obstetraUserId = await findObstetraUserIdForGestante(gestanteId);
    if (obstetraUserId) {
      const g = await prisma.gestante.findUnique({ where: { id: gestanteId }, include: { user: true } });
      const nombre = g?.user ? `${g.user.firstName} ${g.user.lastName}`.trim() : 'Una gestante';
      await notifyUser(
        obstetraUserId,
        'solicitud_reprogramacion',
        'Solicitud de reprogramación',
        `${nombre} pidió reprogramar su cita del ${new Date(appt.fecha).toLocaleDateString()} (respondió por WhatsApp).`,
        { gestanteId, appointmentId: appt.id, via: 'whatsapp' },
      );
    }
  } catch {
    /* best-effort */
  }
  return { handled: true, reply: 'Entendido, registramos tu solicitud de REPROGRAMACIÓN. Tu obstetra te contactará para darte una nueva fecha.' };
}

/**
 * Intenta interpretar `body` como confirmación de TOMA DE SUPLEMENTO de hoy.
 * Solo actúa si la gestante tiene un tratamiento activo del que se le recordó
 * HOY (Notification `recordatorio_suplemento` del día) y aún no registró la toma.
 *   "SÍ" (y variantes) → crea/actualiza el SupplementLog del día (tomado=true).
 */
async function trySupplementReply(gestanteId: string, body: string): Promise<CommandResult> {
  const t = normalize(body);
  if (!AFFIRMATIVE.has(t)) return { handled: false };

  const now = new Date();
  const hoyMidnight = midnightUTC(now);

  // ¿Se le recordó HOY algún suplemento? (contexto que valida interpretar el "SÍ").
  const g = await prisma.gestante.findUnique({ where: { id: gestanteId }, select: { userId: true } });
  if (!g?.userId) return { handled: false };
  const recordatoriosHoy = await prisma.notification.findMany({
    where: { userId: g.userId, tipo: 'recordatorio_suplemento', createdAt: { gte: hoyMidnight } },
    select: { datos: true },
  });
  const treatmentIds = recordatoriosHoy
    .map((n) => (n.datos as Record<string, unknown> | null)?.treatmentId)
    .filter((id): id is string => typeof id === 'string');
  if (treatmentIds.length === 0) return { handled: false };

  // Registra la toma de hoy para esos tratamientos (idempotente por @@unique).
  let registrados = 0;
  for (const treatmentId of treatmentIds) {
    const treatment = await prisma.treatment.findFirst({
      where: { id: treatmentId, gestanteId, estado: 'activo' },
      select: { id: true },
    });
    if (!treatment) continue;
    await prisma.supplementLog.upsert({
      where: { treatmentId_fecha: { treatmentId, fecha: hoyMidnight } },
      create: { treatmentId, gestanteId, fecha: hoyMidnight, tomado: true, notas: 'Registrado por WhatsApp' },
      update: { tomado: true, horaRegistro: new Date() },
    });
    registrados++;
  }
  if (registrados === 0) return { handled: false };
  return { handled: true, reply: 'Excelente, registramos que ya tomaste tu suplemento de hoy. ¡Sigue así por tu salud y la de tu bebé!' };
}

/**
 * Interpreta una respuesta entrante de la gestante. Prueba primero la
 * confirmación de cita y luego el suplemento. Devuelve `handled:false` si no
 * encaja con ningún contexto pendiente (el mensaje irá al chat normal).
 */
export async function routeInboundCommand(gestanteId: string, body: string): Promise<CommandResult> {
  try {
    const appt = await tryAppointmentReply(gestanteId, body);
    if (appt.handled) return appt;
    const supp = await trySupplementReply(gestanteId, body);
    if (supp.handled) return supp;
  } catch (e) {
    console.error('[OPENWA CMD] Error interpretando la respuesta:', (e as Error).message);
  }
  return { handled: false };
}
