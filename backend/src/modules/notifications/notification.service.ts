import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/database.js';

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

export function sendSmsMock(phone: string, text: string): void {
  console.log(`[SMS MOCK] Sending SMS to ${phone}: ${text}`);
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
        sendSmsMock(user.phone, `Hola ${user.firstName}, recuerda que tienes tu control prenatal programado para el día ${apptDate.toLocaleDateString()} a las 9:00 AM.`);
        console.log(`[WHATSAPP MOCK] Sending 3D reminder to ${user.phone}: Hola ${user.firstName}, tienes un control programado.`);
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
        sendSmsMock(user.phone, `Hola ${user.firstName}, recuerda que tienes tu control prenatal mañana ${apptDate.toLocaleDateString()} a las 9:00 AM. ¡Tu asistencia es muy importante!`);
        console.log(`[WHATSAPP MOCK] Sending 1D reminder to ${user.phone}: Hola ${user.firstName}, recuerda asistir a tu cita de mañana.`);
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
  }
}

export function startReminderCron() {
  scanAndSendReminders().catch((err) => console.error('[REMINDER CRON ERROR]', err));

  setInterval(() => {
    scanAndSendReminders().catch((err) => console.error('[REMINDER CRON ERROR]', err));
  }, 24 * 60 * 60 * 1000);
}
