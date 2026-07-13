/**
 * Stub de `expo-server-sdk` para las pruebas.
 *
 * El paquete real es ESM puro y rompe la carga bajo ts-jest. Los tests solo
 * necesitan la lógica de construcción del payload de push (issues #32/#34/#35),
 * no la red de Expo, así que reproducimos únicamente la superficie usada por el
 * código: `Expo.isExpoPushToken`, `chunkPushNotifications` y
 * `sendPushNotificationsAsync`.
 */

export type ExpoPushMessage = {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  priority?: string;
  badge?: number;
  channelId?: string;
};

export type ExpoPushTicket = { status: 'ok' | 'error'; id?: string; details?: { error?: string } };
export type ExpoPushReceipt = { status: 'ok' | 'error' };

export class Expo {
  /** Valida el formato de un token de Expo (ExponentPushToken[...] o ExpoPushToken[...]). */
  static isExpoPushToken(token: unknown): boolean {
    return (
      typeof token === 'string' &&
      (/^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token))
    );
  }

  /** Divide los mensajes en lotes de 100 (como el SDK real). */
  chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][] {
    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    return chunks;
  }

  chunkPushNotificationReceiptIds<T>(ids: T[]): T[][] {
    return ids.length ? [ids] : [];
  }

  async sendPushNotificationsAsync(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    return messages.map(() => ({ status: 'ok' as const, id: 'mock-ticket' }));
  }

  async getPushNotificationReceiptsAsync(): Promise<Record<string, ExpoPushReceipt>> {
    return {};
  }
}

export default { Expo };
