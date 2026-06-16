import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/database.js';
import { smsChannel, whatsappChannel, sendSmsAndWhatsApp } from './channels.js';
import { calculateEG } from '../../utils/dateCalc.js';
import { calcularAdherencia } from '../../utils/adherence.js';

const expo = new Expo();

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const messages: ExpoPushMessage[] = [];

  for (const pushToken of tokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notification chunk', error);
    }
  }

  // Optional: We can handle receipts later.
}

/**
 * Envía un SMS por el canal configurado (Twilio o mock según el entorno).
 * Se mantiene el nombre por compatibilidad con llamadas existentes.
 */
export function sendSmsMock(phone: string, text: string): void {
  void smsChannel.send(phone, text);
}

/** Envía un WhatsApp por el canal configurado (Cloud API o mock). */
export function sendWhatsApp(phone: string, text: string): void {
  void whatsappChannel.send(phone, text);
}

// BullMQ is disabled due to Redis 3.x on Windows not supporting it.
export const remindersQueue = null;

export async function scheduleReminder(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
  delayMs: number
) {
  console.log(`[MOCK SCHEDULE] Reminder for ${userId} in ${delayMs}ms: ${title}`);
}

export async function scanAndSendReminders() {
  console.log('[REMINDER CRON] Scanning database for appointments needing reminders...');
  const now = new Date();
  
  const appointments = await prisma.appointment.findMany({
    where: {
      estado: { in: ['programada', 'confirmada'] },
      fecha: { gte: now }
    },
    include: {
      gestante: { include: { user: true } }
    }
  });

  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const appt of appointments) {
    const apptDate = new Date(appt.fecha);
    const diffTime = apptDate.getTime() - now.getTime();
    const diffDays = diffTime / oneDayMs;

    const user = appt.gestante?.user;
    if (!user) continue;

    if (diffDays <= 3 && diffDays > 2 && !appt.recordatorio3d) {
      console.log(`[REMINDER 3D] Sending 3-day reminder for appointment ${appt.id} to user ${user.id}`);
      
      if (user.phone) {
        await sendSmsAndWhatsApp(
          user.phone,
          `Hola ${user.firstName}, recuerda que tienes tu control prenatal programado para el día ${apptDate.toLocaleDateString()} a las 9:00 AM.`
        );
      }

      // Notificar también al acompañante/familiar registrado (RF-7.14)
      const acompPhone3d = appt.gestante?.acompanantePhone;
      if (acompPhone3d) {
        await sendSmsAndWhatsApp(
          acompPhone3d,
          `VITMATERNA: ${user.firstName} ${user.lastName} tiene un control prenatal el día ${apptDate.toLocaleDateString()} a las 9:00 AM. Apóyala para que asista.`
        );
      }

      const prefs = user.notificationPreferences as Record<string, any>;
      if (prefs?.expoPushToken) {
        await sendPushNotification(
          [prefs.expoPushToken],
          'Próxima Cita Prenatal',
          `Hola ${user.firstName}, recuerda tu cita prenatal en 3 días.`,
          { appointmentId: appt.id }
        );
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { recordatorio3d: true }
      });
    }

    if (diffDays <= 1 && diffDays > 0 && !appt.recordatorio1d) {
      console.log(`[REMINDER 1D] Sending 1-day reminder for appointment ${appt.id} to user ${user.id}`);
      
      if (user.phone) {
        await sendSmsAndWhatsApp(
          user.phone,
          `Hola ${user.firstName}, recuerda que tienes tu control prenatal mañana ${apptDate.toLocaleDateString()} a las 9:00 AM. ¡Tu asistencia es muy importante!`
        );
      }

      // Notificar también al acompañante/familiar registrado (RF-7.14)
      const acompPhone1d = appt.gestante?.acompanantePhone;
      if (acompPhone1d) {
        await sendSmsAndWhatsApp(
          acompPhone1d,
          `VITMATERNA: Mañana ${apptDate.toLocaleDateString()} ${user.firstName} ${user.lastName} tiene su control prenatal a las 9:00 AM. Recuérdale y acompáñala.`
        );
      }

      const prefs = user.notificationPreferences as Record<string, any>;
      if (prefs?.expoPushToken) {
        await sendPushNotification(
          [prefs.expoPushToken],
          'Cita Prenatal Mañana',
          `Hola ${user.firstName}, recuerda tu cita prenatal de mañana.`,
          { appointmentId: appt.id }
        );
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { recordatorio1d: true }
      });
    }

    // Recordatorio 2 horas antes (RF-7.04). fecha es @db.Date y hora @db.Time;
    // se combinan para obtener el instante exacto de la cita.
    if (!appt.recordatorio2h) {
      const h = new Date(appt.hora);
      const apptDateTime = new Date(apptDate);
      apptDateTime.setUTCHours(h.getUTCHours(), h.getUTCMinutes(), 0, 0);
      const diffHours = (apptDateTime.getTime() - now.getTime()) / (60 * 60 * 1000);

      if (diffHours <= 2 && diffHours > 0) {
        const horaTxt = `${String(h.getUTCHours()).padStart(2, '0')}:${String(h.getUTCMinutes()).padStart(2, '0')}`;
        if (user.phone) {
          await sendSmsAndWhatsApp(
            user.phone,
            `Hola ${user.firstName}, tu control prenatal es hoy a las ${horaTxt}. Acude con tiempo. ¡Te esperamos!`
          );
        }
        const prefs = user.notificationPreferences as Record<string, any>;
        if (prefs?.expoPushToken) {
          await sendPushNotification(
            [prefs.expoPushToken],
            'Tu cita es en 2 horas',
            `Hola ${user.firstName}, tu control prenatal es hoy a las ${horaTxt}.`,
            { appointmentId: appt.id }
          );
        }
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { recordatorio2h: true },
        });
      }
    }
  }
}

/**
 * RF-4.06 / RF-7.05: recordatorio diario de toma de suplementos.
 * Para cada tratamiento activo con hora de toma definida, si ya pasó la hora
 * del día y la gestante aún no registró el consumo de hoy, envía un
 * recordatorio (una vez al día, deduplicado por Notification).
 */
export async function scanSupplementReminders() {
  const now = new Date();
  const hoyStr = now.toISOString().split('T')[0];
  const hoyMidnight = new Date(`${hoyStr}T00:00:00.000Z`);

  const tratamientos = await prisma.treatment.findMany({
    where: { estado: 'activo', horaToma: { not: null } },
    include: {
      gestante: { include: { user: true } },
      supplementLogs: { where: { fecha: hoyMidnight } },
    },
  });

  for (const t of tratamientos) {
    const user = t.gestante?.user;
    if (!user || !t.horaToma) continue;

    // ¿ya pasó la hora de toma de hoy?
    const ht = new Date(t.horaToma);
    const horaToday = new Date(now);
    horaToday.setUTCHours(ht.getUTCHours(), ht.getUTCMinutes(), 0, 0);
    if (now.getTime() < horaToday.getTime()) continue;

    // ¿ya registró el consumo de hoy?
    const yaTomadoHoy = t.supplementLogs.some((l) => l.tomado);
    if (yaTomadoHoy) continue;

    // ¿ya se le recordó hoy?
    const yaRecordado = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        tipo: 'recordatorio_suplemento',
        datos: { path: ['treatmentId'], equals: t.id },
        createdAt: { gte: hoyMidnight },
      },
    });
    if (yaRecordado) continue;

    const horaTxt = `${String(ht.getUTCHours()).padStart(2, '0')}:${String(ht.getUTCMinutes()).padStart(2, '0')}`;
    const mensaje = `Hola ${user.firstName}, no olvides tomar tu ${t.nombre} (${t.dosis}) de las ${horaTxt}. Registra tu consumo en la app.`;
    if (user.phone) {
      await sendSmsAndWhatsApp(user.phone, mensaje);
    }
    await notifyUser(user.id, 'recordatorio_suplemento', 'Recordatorio de medicamento', mensaje, {
      treatmentId: t.id,
    });
  }
}

/** Crea una notificación persistente para un usuario y le envía push si tiene token. */
export async function notifyUser(
  userId: string,
  tipo: string,
  titulo: string,
  mensaje: string,
  datos?: Record<string, unknown>,
) {
  await prisma.notification.create({
    data: { userId, tipo, canal: 'push', titulo, mensaje, datos: (datos ?? {}) as object, estado: 'enviada', enviadaAt: new Date() },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const prefs = user?.notificationPreferences as Record<string, any> | null;
  if (prefs?.expoPushToken) {
    // Se incluye `tipo` en los datos del push para el deep-link en el cliente.
    await sendPushNotification([prefs.expoPushToken], titulo, mensaje, { tipo, ...(datos ?? {}) });
  }
}

/** Devuelve el userId del obstetra asociado a una gestante (último control o cita). */
export async function findObstetraUserIdForGestante(gestanteId: string): Promise<string | null> {
  const lastControl = await prisma.prenatalControl.findFirst({
    where: { gestanteId },
    orderBy: { fecha: 'desc' },
    include: { obstetra: true },
  });
  if (lastControl?.obstetra?.userId) return lastControl.obstetra.userId;
  const lastAppt = await prisma.appointment.findFirst({
    where: { gestanteId, obstetraId: { not: null } },
    orderBy: { fecha: 'desc' },
    include: { obstetra: true },
  });
  if (lastAppt?.obstetra?.userId) return lastAppt.obstetra.userId;
  const anyObs = await prisma.obstetra.findFirst();
  return anyObs?.userId ?? null;
}

/**
 * RF-3.13 / RF-7.07: marca como no_asistida toda cita programada/confirmada
 * cuya fecha ya pasó (más de 1 día) sin registro de asistencia, y alerta al
 * obstetra responsable para seguimiento (visita domiciliaria o llamada).
 */
export async function scanMissedAppointments() {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000); // pasó hace +24h
  const vencidas = await prisma.appointment.findMany({
    where: { estado: { in: ['programada', 'confirmada'] }, fecha: { lt: limite } },
    include: { gestante: { include: { user: true } } },
  });

  for (const appt of vencidas) {
    await prisma.appointment.update({ where: { id: appt.id }, data: { estado: 'no_asistida' } });
    const obstetraUserId = await findObstetraUserIdForGestante(appt.gestanteId);
    if (obstetraUserId) {
      const nombre = appt.gestante?.user
        ? `${appt.gestante.user.firstName} ${appt.gestante.user.lastName}`
        : 'una gestante';
      await notifyUser(
        obstetraUserId,
        'inasistencia',
        'Cita perdida',
        `${nombre} no asistió a su control del ${new Date(appt.fecha).toLocaleDateString()}. Considera una visita domiciliaria o llamada.`,
        { gestanteId: appt.gestanteId, appointmentId: appt.id },
      );
    }
  }
  if (vencidas.length) {
    console.log(`[CRON] ${vencidas.length} cita(s) marcada(s) como no asistida + alerta a obstetra`);
  }
}

/**
 * RF-7.08: detecta gestantes con adherencia < 50% en algún tratamiento activo
 * (con al menos 7 días de tratamiento) y alerta al obstetra una vez al día.
 */
export async function scanLowAdherence() {
  const tratamientos = await prisma.treatment.findMany({
    where: { estado: 'activo' },
    include: { supplementLogs: true, gestante: { include: { user: true } } },
  });

  const hoy = new Date().toISOString().split('T')[0];

  for (const t of tratamientos) {
    const inicio = new Date(t.fechaInicio);
    const diasTranscurridos = Math.max(1, Math.floor((Date.now() - inicio.getTime()) / (24 * 60 * 60 * 1000)));
    if (diasTranscurridos < 7) continue; // necesita historial mínimo

    // Fórmula ÚNICA de adherencia (utils/adherence.ts).
    const { porcentaje: adherencia } = calcularAdherencia({
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      duracionDias: t.duracionDias,
      logs: t.supplementLogs,
    });
    if (adherencia >= 50) continue;

    // Evitar alertas repetidas el mismo día (busca una previa de hoy).
    const yaAlertado = await prisma.notification.findFirst({
      where: {
        tipo: 'baja_adherencia',
        datos: { path: ['treatmentId'], equals: t.id },
        createdAt: { gte: new Date(`${hoy}T00:00:00.000Z`) },
      },
    });
    if (yaAlertado) continue;

    const obstetraUserId = await findObstetraUserIdForGestante(t.gestanteId);
    if (obstetraUserId) {
      const nombre = t.gestante?.user
        ? `${t.gestante.user.firstName} ${t.gestante.user.lastName}`
        : 'una gestante';
      await notifyUser(
        obstetraUserId,
        'baja_adherencia',
        'Baja adherencia al tratamiento',
        `${nombre} tiene ${adherencia}% de adherencia en "${t.nombre}". Recomienda intervención/seguimiento.`,
        { gestanteId: t.gestanteId, treatmentId: t.id, adherencia },
      );
    }
  }
}

/**
 * RF-7.12: alerta de FPP próxima en hitos (30, 15, 7 y 3 días antes).
 * Envía a la gestante (y al acompañante) un aviso por cada hito alcanzado,
 * una sola vez por hito (deduplicado por Notification).
 */
export async function scanUpcomingFPP() {
  const now = new Date();
  const hitos = [30, 15, 7, 3];

  const gestantes = await prisma.gestante.findMany({
    where: { estado: 'activa', OR: [{ fppFum: { not: null } }, { fppEco: { not: null } }] },
    include: { user: true },
  });

  for (const g of gestantes) {
    const fpp = g.fppEco || g.fppFum;
    if (!fpp || !g.user) continue;
    const diasRestantes = Math.ceil((new Date(fpp).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (diasRestantes < 0) continue;

    // Hito más cercano alcanzado (el menor hito >= diasRestantes).
    const hito = hitos.find((h) => diasRestantes <= h && diasRestantes > (hitos[hitos.indexOf(h) + 1] ?? -1));
    if (hito === undefined) continue;

    const yaAvisado = await prisma.notification.findFirst({
      where: {
        userId: g.user.id,
        tipo: 'fpp_proxima',
        datos: { path: ['hito'], equals: hito },
      },
    });
    if (yaAvisado) continue;

    const mensaje = `Hola ${g.user.firstName}, tu fecha probable de parto se acerca (faltan ~${diasRestantes} días). Prepara tu plan de parto y tus cosas para el bebé.`;
    if (g.user.phone) {
      await sendSmsAndWhatsApp(g.user.phone, mensaje);
    }
    if (g.acompanantePhone) {
      await sendSmsAndWhatsApp(
        g.acompanantePhone,
        `VITMATERNA: la fecha probable de parto de ${g.user.firstName} ${g.user.lastName} se acerca (faltan ~${diasRestantes} días). Mantente atento(a).`,
      );
    }
    await notifyUser(g.user.id, 'fpp_proxima', 'Tu parto se acerca', mensaje, { hito, diasRestantes });
  }
}

/**
 * RF-7.11: detecta exámenes de laboratorio obligatorios (MINSA) pendientes.
 *
 * Para cada gestante activa con EG conocida, revisa qué exámenes del tamizaje
 * básico no tienen ningún `LabResult` registrado una vez superada la semana en
 * que deberían haberse tomado. Alerta al obstetra a cargo, una vez al día por
 * gestante (deduplicado por Notification del día).
 */
const EXAMENES_OBLIGATORIOS: { nombre: string; alias: string[]; desdeSemana: number }[] = [
  { nombre: 'Hemoglobina', alias: ['hemoglobina', 'hb'], desdeSemana: 12 },
  { nombre: 'VIH', alias: ['vih'], desdeSemana: 12 },
  { nombre: 'Sífilis (VDRL/RPR)', alias: ['vdrl', 'rpr', 'sifilis', 'sífilis'], desdeSemana: 12 },
  { nombre: 'Glucosa', alias: ['glucosa', 'glucemia'], desdeSemana: 12 },
  { nombre: 'Examen de orina', alias: ['orina', 'urocultivo', 'examen de orina'], desdeSemana: 12 },
];

export async function scanPendingExams() {
  const now = new Date();

  const gestantes = await prisma.gestante.findMany({
    where: { estado: 'activa', OR: [{ fum: { not: null } }, { fppEco: { not: null } }] },
    include: { user: true, labResults: { select: { tipoExamen: true } } },
  });

  const hoy = now.toISOString().split('T')[0];

  for (const g of gestantes) {
    if (!g.user) continue;

    // EG aproximada a partir de la FUM (si no hay FUM, derivar de FPP por eco).
    let egWeeks: number | null = null;
    if (g.fum) {
      egWeeks = calculateEG(new Date(g.fum), now).weeks;
    } else if (g.fppEco) {
      const diasParaFpp = Math.ceil((new Date(g.fppEco).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      egWeeks = Math.max(0, 40 - Math.ceil(diasParaFpp / 7));
    }
    if (egWeeks == null || egWeeks < 12) continue;

    const registrados = g.labResults.map((l) => (l.tipoExamen || '').toLowerCase());
    const faltantes = EXAMENES_OBLIGATORIOS.filter(
      (ex) =>
        egWeeks! >= ex.desdeSemana &&
        !registrados.some((r) => ex.alias.some((a) => r.includes(a))),
    );
    if (faltantes.length === 0) continue;

    // Una alerta por gestante por día.
    const yaAlertado = await prisma.notification.findFirst({
      where: {
        tipo: 'examenes_pendientes',
        datos: { path: ['gestanteId'], equals: g.id },
        createdAt: { gte: new Date(`${hoy}T00:00:00.000Z`) },
      },
    });
    if (yaAlertado) continue;

    const nombres = faltantes.map((f) => f.nombre).join(', ');
    const obstetraUserId = await findObstetraUserIdForGestante(g.id);
    if (obstetraUserId) {
      const nombreGestante = `${g.user.firstName} ${g.user.lastName}`;
      await notifyUser(
        obstetraUserId,
        'examenes_pendientes',
        'Exámenes pendientes',
        `${nombreGestante} (sem. ${egWeeks}) tiene exámenes del tamizaje básico sin registrar: ${nombres}.`,
        { gestanteId: g.id, egWeeks, faltantes: faltantes.map((f) => f.nombre) },
      );
    }
  }
}

export function startReminderCron() {
  const runAll = async () => {
    await scanAndSendReminders();
    await scanSupplementReminders();
    await scanMissedAppointments();
    await scanLowAdherence();
    await scanUpcomingFPP();
    await scanPendingExams();
  };
  runAll().catch((err) => console.error('[REMINDER CRON ERROR]', err));

  // Ejecutar cada hora para acercarse a tiempo real en recordatorios y alertas.
  setInterval(() => {
    runAll().catch((err) => console.error('[REMINDER CRON ERROR]', err));
  }, 60 * 60 * 1000);
}
