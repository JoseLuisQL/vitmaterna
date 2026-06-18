/**
 * VITMATERNA — Emisión de notificaciones in-app en tiempo real (Socket.IO).
 *
 * Al crear una notificación, se avisa al dispositivo del usuario en su sala
 * personal `user:<userId>` (la misma que usan chat y citas) para que la campana
 * (badge) y la bandeja se refresquen al instante, sin esperar al polling.
 * Best-effort: nunca debe romper la creación de la notificación.
 */

export async function emitNotificationEvent(userId: string, notificationId: string): Promise<void> {
  try {
    const { getIO } = await import('../config/socketRegistry.js');
    const io = getIO();
    if (!io) return;
    io.to(`user:${userId}`).emit('notification:new', { id: notificationId });
  } catch {
    /* best-effort */
  }
}
