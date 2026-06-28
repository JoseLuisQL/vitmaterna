import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import type { RequestUser } from '../../types/index.js';
import { EstadoCita } from '@prisma/client';
import { notifyUser } from '../notifications/notification.service.js';

/** Resuelve el id de perfil de obstetra a partir del usuario autenticado. */
async function resolveObstetraId(userContext?: RequestUser): Promise<string | null> {
  if (!userContext) return null;
  if (userContext.role === 'obstetra') {
    const o = await prisma.obstetra.findUnique({ where: { userId: userContext.userId }, select: { id: true } });
    return o?.id ?? null;
  }
  return null;
}

export class HomeVisitService {
  /**
   * Registra el acta de una visita domiciliaria. El número de visita es un
   * correlativo automático por gestante. Si viene appointmentId, marca la cita
   * como asistida. Notifica a la gestante.
   */
  async create(
    data: {
      gestanteId: string;
      appointmentId?: string;
      fecha: string;
      horaLlegada?: string;
      duracionMin?: number;
      motivo: string;
      acciones: string;
      acuerdos?: string;
      lat?: number;
      lng?: number;
      firmaGestante?: boolean;
      firmaObstetra?: boolean;
    },
    userContext?: RequestUser,
  ) {
    const gestante = await prisma.gestante.findUnique({
      where: { id: data.gestanteId },
      include: { user: { select: { id: true, firstName: true } } },
      // acompanantePhone para el aviso opcional al acompañante (OPORTUNIDADES #8).
    });
    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante no encontrada');
    }

    // Resolver obstetra: del contexto o, si admin, del que envíe explícito.
    let obstetraId = await resolveObstetraId(userContext);
    if (!obstetraId) {
      // admin: usar el obstetra de la última cita/visita de la gestante o el primero.
      const lastAppt = await prisma.appointment.findFirst({
        where: { gestanteId: data.gestanteId, obstetraId: { not: null } },
        orderBy: { fecha: 'desc' },
        select: { obstetraId: true },
      });
      obstetraId = lastAppt?.obstetraId ?? (await prisma.obstetra.findFirst({ select: { id: true } }))?.id ?? null;
    }
    if (!obstetraId) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'No se pudo determinar el obstetra responsable');
    }

    // Correlativo automático por gestante.
    const count = await prisma.homeVisit.count({ where: { gestanteId: data.gestanteId } });
    const numeroVisita = count + 1;

    const visit = await prisma.homeVisit.create({
      data: {
        gestanteId: data.gestanteId,
        obstetraId,
        appointmentId: data.appointmentId ?? null,
        numeroVisita,
        fecha: new Date(`${data.fecha}T00:00:00.000Z`),
        horaLlegada: data.horaLlegada ? new Date(`1970-01-01T${data.horaLlegada}:00.000Z`) : null,
        duracionMin: data.duracionMin ?? null,
        motivo: data.motivo,
        acciones: data.acciones,
        acuerdos: data.acuerdos ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        firmaGestante: data.firmaGestante ?? false,
        firmaObstetra: data.firmaObstetra ?? false,
      },
    });

    // Si la visita proviene de una cita, marcarla como asistida.
    if (data.appointmentId) {
      await prisma.appointment.updateMany({
        where: { id: data.appointmentId, estado: { in: [EstadoCita.programada, EstadoCita.confirmada] } },
        data: { estado: EstadoCita.asistida },
      });
    }

    // ¿La visita es a FUTURO (programada) o ya ocurrió (acta del día)?
    const visitDate = new Date(`${data.fecha}T00:00:00.000Z`);
    const hoyMidnight = new Date(`${new Date().toISOString().split('T')[0]}T00:00:00.000Z`);
    const esFutura = visitDate.getTime() > hoyMidnight.getTime();

    // Notificar a la gestante.
    if (gestante.user?.id) {
      await notifyUser(
        gestante.user.id,
        'visita_domiciliaria',
        esFutura ? 'Visita domiciliaria programada' : 'Visita domiciliaria registrada',
        esFutura
          ? `Tu obstetra te visitará en tu domicilio el ${visitDate.toLocaleDateString()}.`
          : `Tu obstetra registró la visita domiciliaria N°${numeroVisita}.`,
        { homeVisitId: visit.id, numeroVisita },
      );

      // OPORTUNIDADES #7: si la visita es a futuro, avisar también por WhatsApp
      // (el personal de campo y muchas gestantes rurales viven en WhatsApp).
      // Best-effort, respeta gasto/preferencias.
      if (esFutura) {
        try {
          const { notifyUserViaWhatsApp } = await import('../notifications/channels.js');
          await notifyUserViaWhatsApp(
            gestante.user.id,
            `VitMaterna: tu obstetra realizará una visita domiciliaria el ${visitDate.toLocaleDateString()}. Por favor, mantente disponible. ¡Gracias!`,
          );
        } catch (e) {
          console.error('[VISITA WHATSAPP] No se pudo avisar por WhatsApp:', (e as Error).message);
        }
      }
    }

    // OPORTUNIDADES #8: reactivar avisos al ACOMPAÑANTE por WhatsApp (gratis con
    // OpenWA). Para una visita futura, se le avisa también (red de apoyo). El
    // acompañante no tiene cuenta: se envía por número, sin log de entrega.
    if (esFutura && gestante.acompanantePhone) {
      try {
        const { sendPaidNotification } = await import('../notifications/channels.js');
        await sendPaidNotification(
          gestante.acompanantePhone,
          `VitMaterna: el ${visitDate.toLocaleDateString()} habrá una visita domiciliaria para ${gestante.user?.firstName ?? 'la gestante'}. Tu apoyo es importante.`,
          null,
          null,
        );
      } catch (e) {
        console.error('[VISITA ACOMPAÑANTE] No se pudo avisar al acompañante:', (e as Error).message);
      }
    }

    return visit;
  }

  /** Historial de visitas de una gestante (con datos del obstetra para la firma). */
  async listByGestante(gestanteId: string, userContext?: RequestUser) {
    // La gestante solo puede ver las suyas.
    if (userContext?.role === 'gestante') {
      const g = await prisma.gestante.findUnique({ where: { userId: userContext.userId }, select: { id: true } });
      if (!g || g.id !== gestanteId) {
        throw new AppError(403, ErrorCodes.FORBIDDEN, 'No puedes ver estas visitas');
      }
    }

    return prisma.homeVisit.findMany({
      where: { gestanteId },
      orderBy: { numeroVisita: 'asc' },
      include: {
        obstetra: {
          select: { cop: true, user: { select: { firstName: true, lastName: true } } },
        },
      },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await prisma.homeVisit.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Visita no encontrada');
    }
    const payload: Record<string, unknown> = {};
    for (const k of ['motivo', 'acciones', 'acuerdos', 'duracionMin', 'lat', 'lng', 'firmaGestante', 'firmaObstetra']) {
      if (data[k] !== undefined) payload[k] = data[k];
    }
    if (data.fecha !== undefined) payload.fecha = new Date(`${data.fecha as string}T00:00:00.000Z`);
    if (data.horaLlegada !== undefined) {
      payload.horaLlegada = data.horaLlegada ? new Date(`1970-01-01T${data.horaLlegada as string}:00.000Z`) : null;
    }
    return prisma.homeVisit.update({ where: { id }, data: payload });
  }

  async remove(id: string) {
    const existing = await prisma.homeVisit.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Visita no encontrada');
    }
    await prisma.homeVisit.delete({ where: { id } });
    return { deleted: true };
  }
}

export const homeVisitService = new HomeVisitService();
