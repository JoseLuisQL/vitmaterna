import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import type { RequestUser } from '../../types/index.js';
import { EstadoCita } from '@prisma/client';
import {
  computeAvailableSlots,
  isWithinWorkingHours,
  timeFromDate,
} from '../../utils/appointmentSlots.js';
import {
  notifyUser,
  findObstetraUserIdForGestante,
} from '../notifications/notification.service.js';
import { ordenarPorPrioridad } from '../../utils/appointmentPriority.js';
import { emitAppointmentEvent } from '../../utils/appointmentEvents.js';

/** Formatea una fecha `Date` (UTC) a `dd/mm/aaaa` para mensajes. */
function fmtFecha(value: Date): string {
  const d = new Date(value);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/**
 * Resuelve los identificadores de dominio del usuario autenticado.
 * Devuelve el rol y, según corresponda, el id de gestante u obstetra.
 */
async function resolveActor(userContext?: RequestUser): Promise<{
  role: RequestUser['role'] | 'system';
  gestanteId?: string;
  obstetraId?: string;
}> {
  if (!userContext) return { role: 'system' };

  if (userContext.role === 'gestante') {
    const gestante = await prisma.gestante.findUnique({
      where: { userId: userContext.userId },
      select: { id: true },
    });
    return { role: 'gestante', gestanteId: gestante?.id };
  }

  if (userContext.role === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({
      where: { userId: userContext.userId },
      select: { id: true },
    });
    return { role: 'obstetra', obstetraId: obstetra?.id };
  }

  return { role: userContext.role };
}

/**
 * Verifica que el usuario tenga permiso sobre una cita concreta.
 * - gestante: debe ser la dueña de la cita.
 * - obstetra: la cita debe estar asignada a ella o no tener obstetra asignado.
 * - admin/system: acceso total.
 * Lanza 403/404 según corresponda.
 */
async function assertCanAccessAppointment(
  appointment: { gestanteId: string; obstetraId: string | null },
  actor: Awaited<ReturnType<typeof resolveActor>>,
): Promise<void> {
  if (actor.role === 'admin' || actor.role === 'system') return;

  if (actor.role === 'gestante') {
    if (!actor.gestanteId || appointment.gestanteId !== actor.gestanteId) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'No puedes acceder a esta cita');
    }
    return;
  }

  if (actor.role === 'obstetra') {
    if (appointment.obstetraId && appointment.obstetraId !== actor.obstetraId) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Esta cita pertenece a otro profesional');
    }
    return;
  }

  throw new AppError(403, ErrorCodes.FORBIDDEN, 'Acceso denegado');
}

/**
 * Transiciones de estado permitidas por rol (Fase 1).
 * Estructura: estadoDestino -> { from: estados origen válidos, roles: roles permitidos }.
 */
const STATUS_TRANSITIONS: Record<
  string,
  { from: EstadoCita[]; roles: Array<RequestUser['role']> }
> = {
  confirmada: {
    from: [EstadoCita.programada],
    roles: ['gestante', 'obstetra', 'admin'],
  },
  asistida: {
    from: [EstadoCita.programada, EstadoCita.confirmada],
    roles: ['obstetra', 'admin'],
  },
  no_asistida: {
    from: [EstadoCita.programada, EstadoCita.confirmada],
    roles: ['obstetra', 'admin'],
  },
  cancelada: {
    from: [EstadoCita.programada, EstadoCita.confirmada, EstadoCita.reprogramada],
    roles: ['gestante', 'obstetra', 'admin'],
  },
};

export class AppointmentService {
  /**
   * Comprueba si un horario (fecha + hora) está libre para un obstetra.
   * Considera ocupadas las citas en estado programada/confirmada/reprogramada.
   * Lanza 409 si hay choque.
   */
  private async assertSlotAvailable(
    fecha: Date,
    hora: Date,
    obstetraId?: string | null,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const conflict = await prisma.appointment.findFirst({
      where: {
        fecha,
        hora,
        obstetraId: obstetraId ?? undefined,
        estado: {
          in: [EstadoCita.programada, EstadoCita.confirmada, EstadoCita.reprogramada],
        },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        deletedAt: null,
      },
    });

    if (conflict) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        'Ese horario ya está ocupado. Elige otro horario disponible.',
      );
    }
  }

  async create(
    data: {
      gestanteId: string;
      fecha: string;
      hora: string;
      motivo?: string;
      obstetraId?: string;
      numeroControl?: number;
      egSemanas?: number;
      observaciones?: string;
      modalidad?: 'establecimiento' | 'domiciliaria';
    },
    userContext?: RequestUser,
  ) {
    // Verificar si la gestante existe
    const gestante = await prisma.gestante.findUnique({
      where: { id: data.gestanteId },
    });
    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante no encontrada');
    }

    let obstetraIdToSave = data.obstetraId;

    // Resolver el obstetra desde el contexto si no se especifica.
    if (!obstetraIdToSave && userContext?.role === 'obstetra') {
      const obstetra = await prisma.obstetra.findUnique({
        where: { userId: userContext.userId },
      });
      if (obstetra) {
        obstetraIdToSave = obstetra.id;
      }
    }

    const esDomiciliaria = data.modalidad === 'domiciliaria';

    // Validar horario laboral (también aplica a domiciliarias: el obstetra
    // trabaja en horario; pero no se valida disponibilidad de slot porque la
    // visita es en terreno y puede solaparse con la agenda del consultorio).
    if (!isWithinWorkingHours(data.hora)) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'La hora está fuera del horario de atención (08:00–17:00, sin 13:00–14:00).',
      );
    }

    const fechaObj = new Date(`${data.fecha}T00:00:00.000Z`);
    const horaObj = new Date(`1970-01-01T${data.hora}:00.000Z`);

    // Evitar doble booking del mismo obstetra SOLO en citas de establecimiento.
    if (!esDomiciliaria) {
      await this.assertSlotAvailable(fechaObj, horaObj, obstetraIdToSave);
    }

    const created = await prisma.appointment.create({
      data: {
        gestanteId: data.gestanteId,
        obstetraId: obstetraIdToSave,
        motivo: data.motivo || (esDomiciliaria ? 'Visita domiciliaria' : 'Control prenatal'),
        fecha: fechaObj,
        hora: horaObj,
        numeroControl: data.numeroControl,
        egSemanas: data.egSemanas,
        observaciones: data.observaciones,
        estado: EstadoCita.programada,
        modalidad: esDomiciliaria ? 'domiciliaria' : 'establecimiento',
      },
    });
    await emitAppointmentEvent('appointment:created', created);
    return created;
  }

  async findAll(
    filters: {
      gestanteId?: string;
      obstetraId?: string;
      fecha?: string;
      estado?: EstadoCita;
      modalidad?: 'establecimiento' | 'domiciliaria';
      future?: boolean | string;
      today?: boolean | string;
      sort?: 'asc' | 'desc';
      limit?: number;
      // Nuevos filtros profesionales (Fase 1):
      scope?: 'hoy' | 'proximas' | 'historial' | 'todas';
      desde?: string; // YYYY-MM-DD
      hasta?: string; // YYYY-MM-DD
      search?: string; // nombre o DNI de la gestante
      orderBy?: 'prioridad' | 'fecha';
    },
    userContext?: RequestUser,
  ) {
    const where: any = { deletedAt: null };

    if (userContext?.role === 'gestante') {
      const gestante = await prisma.gestante.findUnique({
        where: { userId: userContext.userId },
      });
      where.gestanteId = gestante?.id || 'non-existent-uuid';
    } else if (userContext?.role === 'obstetra') {
      const obstetra = await prisma.obstetra.findUnique({
        where: { userId: userContext.userId },
      });
      where.obstetraId = obstetra?.id || 'non-existent-uuid';
      if (filters.gestanteId) where.gestanteId = filters.gestanteId;
    } else {
      // Admin or system query
      if (filters.gestanteId) where.gestanteId = filters.gestanteId;
      if (filters.obstetraId) where.obstetraId = filters.obstetraId;
    }

    if (filters.fecha) where.fecha = new Date(`${filters.fecha}T00:00:00.000Z`);
    if (filters.estado) where.estado = filters.estado;
    if ((filters as any).modalidad) where.modalidad = (filters as any).modalidad;

    const isTrue = (v: unknown) => v === true || v === 'true';
    const hoy = new Date();
    const hoyMidnight = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
    // Cota de cordura: ignora fechas absurdas (> hoy + 2 años) por datos sucios.
    const cotaSuperior = new Date(hoyMidnight.getTime());
    cotaSuperior.setUTCFullYear(cotaSuperior.getUTCFullYear() + 2);

    const ESTADOS_PENDIENTES = ['programada', 'confirmada', 'reprogramada', 'solicitud_reprogramacion'];
    const ESTADOS_HISTORIAL = ['asistida', 'no_asistida', 'cancelada'];

    // Filtro por "scope" (segmentos rápidos). Tiene prioridad sobre future/today.
    switch (filters.scope) {
      case 'hoy': {
        const fin = new Date(hoyMidnight.getTime() + 24 * 60 * 60 * 1000);
        where.fecha = { gte: hoyMidnight, lt: fin };
        break;
      }
      case 'proximas':
        where.fecha = { gte: hoyMidnight, lte: cotaSuperior };
        where.estado = { in: ESTADOS_PENDIENTES };
        break;
      case 'historial':
        where.estado = { in: ESTADOS_HISTORIAL };
        break;
      case 'todas':
      default:
        break;
    }

    // Compatibilidad con los flags previos (future/today) si no se usó scope.
    if (!filters.scope && isTrue(filters.future)) {
      where.fecha = { gte: hoyMidnight, lte: cotaSuperior };
      where.estado = { in: ['programada', 'confirmada', 'reprogramada'] };
    }
    if (!filters.scope && isTrue(filters.today)) {
      const fin = new Date(hoyMidnight.getTime() + 24 * 60 * 60 * 1000);
      where.fecha = { gte: hoyMidnight, lt: fin };
    }

    // Rango de fechas explícito (desde/hasta) — se combina con lo anterior.
    if (filters.desde || filters.hasta) {
      where.fecha = {
        ...(typeof where.fecha === 'object' && where.fecha !== null ? where.fecha : {}),
        ...(filters.desde ? { gte: new Date(`${filters.desde}T00:00:00.000Z`) } : {}),
        ...(filters.hasta ? { lte: new Date(`${filters.hasta}T23:59:59.999Z`) } : {}),
      };
    }

    // Búsqueda por nombre o DNI de la gestante.
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.gestante = {
        is: {
          user: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { dni: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    const dir = filters.sort === 'desc' ? 'desc' : 'asc';

    // `limit` puede llegar como string desde la query: se normaliza a entero.
    const take = filters.limit != null ? Number(filters.limit) : undefined;

    const rows = await prisma.appointment.findMany({
      where,
      include: {
        gestante: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        obstetra: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ fecha: dir }, { hora: dir }],
    });

    // Orden por PRIORIDAD (default): primero confirmadas/urgentes, luego por fecha
    // más cercana. Se aplica en memoria sobre el conjunto ya filtrado (acotado por
    // rol/scope). Si se pide orderBy='fecha', se respeta el orden del query.
    const ordered =
      filters.orderBy === 'fecha' ? rows : ordenarPorPrioridad(rows as any) as typeof rows;

    // `limit` se aplica después del orden para devolver los más prioritarios.
    if (take && Number.isFinite(take) && take > 0) {
      return ordered.slice(0, take);
    }
    return ordered;
  }

  /**
   * Devuelve los horarios disponibles de un día para un obstetra.
   * Si no se especifica obstetraId y el usuario es obstetra, usa el suyo.
   */
  async getAvailability(
    params: { fecha: string; obstetraId?: string },
    userContext?: RequestUser,
  ) {
    let obstetraId = params.obstetraId;

    if (!obstetraId && userContext?.role === 'obstetra') {
      const obstetra = await prisma.obstetra.findUnique({
        where: { userId: userContext.userId },
        select: { id: true },
      });
      obstetraId = obstetra?.id;
    }

    const fechaObj = new Date(`${params.fecha}T00:00:00.000Z`);

    const citas = await prisma.appointment.findMany({
      where: {
        fecha: fechaObj,
        obstetraId: obstetraId ?? undefined,
        estado: {
          in: [EstadoCita.programada, EstadoCita.confirmada, EstadoCita.reprogramada],
        },
        deletedAt: null,
      },
      select: { hora: true },
    });

    const ocupados = citas.map((c) => timeFromDate(c.hora));
    const slots = computeAvailableSlots(ocupados);

    return {
      fecha: params.fecha,
      obstetraId: obstetraId ?? null,
      slots,
    };
  }

  async reschedule(
    id: string,
    data: { fecha: string; hora: string; motivoReprogramacion: string },
    userContext?: RequestUser,
  ) {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    const actor = await resolveActor(userContext);
    await assertCanAccessAppointment(appointment, actor);

    if (!isWithinWorkingHours(data.hora)) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'La hora está fuera del horario de atención (08:00–17:00, sin 13:00–14:00).',
      );
    }

    const fechaReprogramada = new Date(`${data.fecha}T00:00:00.000Z`);
    const horaReprogramada = new Date(`1970-01-01T${data.hora}:00.000Z`);

    // Evitar choque con otra cita del mismo obstetra (excluyendo esta).
    await this.assertSlotAvailable(
      fechaReprogramada,
      horaReprogramada,
      appointment.obstetraId,
      id,
    );

    const rescheduled = await prisma.appointment.update({
      where: { id },
      data: {
        estado: EstadoCita.reprogramada,
        fechaReprogramada,
        horaReprogramada,
        motivoReprogramacion: data.motivoReprogramacion,
      },
    });
    await emitAppointmentEvent('appointment:updated', rescheduled);
    return rescheduled;
  }

  async updateStatus(id: string, estado: EstadoCita, userContext?: RequestUser) {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment || appointment.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    const actor = await resolveActor(userContext);
    await assertCanAccessAppointment(appointment, actor);

    // Validar transición legal (estado origen + rol).
    const rule = STATUS_TRANSITIONS[estado];
    if (!rule) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, `Estado no permitido: ${estado}`);
    }

    const role = userContext?.role;
    if (role && !rule.roles.includes(role)) {
      throw new AppError(
        403,
        ErrorCodes.FORBIDDEN,
        `Tu rol (${role}) no puede cambiar la cita a "${estado}".`,
      );
    }

    if (!rule.from.includes(appointment.estado)) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        `No se puede pasar de "${appointment.estado}" a "${estado}".`,
      );
    }

    const statusUpdated = await prisma.appointment.update({
      where: { id },
      data: { estado },
    });
    await emitAppointmentEvent('appointment:status_changed', statusUpdated);
    return statusUpdated;
  }

  /**
   * Convierte una cita de establecimiento en VISITA DOMICILIARIA (cuando la
   * gestante no puede acudir). Solo obstetra/admin. Notifica a la gestante.
   */
  async convertToHome(id: string, observaciones: string | undefined, userContext?: RequestUser) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { gestante: { include: { user: true } } },
    });
    if (!appointment || appointment.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    const actor = await resolveActor(userContext);
    await assertCanAccessAppointment(appointment, actor);

    const convertibles: EstadoCita[] = [EstadoCita.programada, EstadoCita.confirmada];
    if (!convertibles.includes(appointment.estado)) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        `Solo se puede convertir a domiciliaria una cita programada o confirmada (estado: "${appointment.estado}").`,
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        modalidad: 'domiciliaria',
        motivo: appointment.motivo?.toLowerCase().includes('domicil') ? appointment.motivo : 'Visita domiciliaria',
        observaciones: observaciones ?? appointment.observaciones,
      },
    });

    // Notificar a la gestante.
    const gestanteUserId = appointment.gestante?.user?.id;
    if (gestanteUserId) {
      await notifyUser(
        gestanteUserId,
        'cita_domiciliaria',
        'Tu cita será domiciliaria',
        `Tu obstetra te visitará en tu domicilio el ${fmtFecha(appointment.fecha)} a las ${timeFromDate(appointment.hora)}. Coordina la visita.`,
        { appointmentId: id },
      );
    }

    await emitAppointmentEvent('appointment:updated', updated);
    return updated;
  }

  /**
   * RF-3.x: la gestante CONFIRMA su cita (programada -> confirmada) y se
   * notifica al obstetra responsable.
   */
  async confirm(id: string, userContext?: RequestUser) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { gestante: { include: { user: true } } },
    });
    if (!appointment || appointment.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    const actor = await resolveActor(userContext);
    await assertCanAccessAppointment(appointment, actor);

    if (appointment.estado !== EstadoCita.programada) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        `Solo puedes confirmar una cita programada (estado actual: "${appointment.estado}").`,
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { estado: EstadoCita.confirmada },
    });

    // Notificar al obstetra responsable.
    const obstetraUserId = await findObstetraUserIdForGestante(appointment.gestanteId);
    if (obstetraUserId) {
      const nombre = appointment.gestante?.user
        ? `${appointment.gestante.user.firstName} ${appointment.gestante.user.lastName}`
        : 'Una gestante';
      await notifyUser(
        obstetraUserId,
        'cita_confirmada',
        'Cita confirmada',
        `${nombre} aceptó su cita del ${fmtFecha(appointment.fecha)} a las ${timeFromDate(appointment.hora)}.`,
        { appointmentId: id, gestanteId: appointment.gestanteId },
      );
    }

    await emitAppointmentEvent('appointment:status_changed', updated);
    return updated;
  }

  /**
   * RF-3.08/3.09: la gestante SOLICITA una reprogramación. No cambia la cita
   * por sí misma: guarda la propuesta (fecha/hora/motivo) y la cita pasa a
   * "solicitud_reprogramacion" para que el obstetra la apruebe o rechace.
   */
  async requestReschedule(
    id: string,
    data: { fecha: string; hora: string; motivoReprogramacion: string },
    userContext?: RequestUser,
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { gestante: { include: { user: true } } },
    });
    if (!appointment || appointment.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    const actor = await resolveActor(userContext);
    await assertCanAccessAppointment(appointment, actor);

    if (
      appointment.estado !== EstadoCita.programada &&
      appointment.estado !== EstadoCita.confirmada
    ) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        `Solo puedes solicitar reprogramación de una cita programada o confirmada (estado actual: "${appointment.estado}").`,
      );
    }

    if (!isWithinWorkingHours(data.hora)) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'La hora propuesta está fuera del horario de atención (08:00–17:00, sin 13:00–14:00).',
      );
    }

    const fechaPropuesta = new Date(`${data.fecha}T00:00:00.000Z`);
    const horaPropuesta = new Date(`1970-01-01T${data.hora}:00.000Z`);

    // Avisar pronto si el horario propuesto ya está ocupado.
    await this.assertSlotAvailable(fechaPropuesta, horaPropuesta, appointment.obstetraId, id);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        estadoPrevio: appointment.estado,
        estado: EstadoCita.solicitud_reprogramacion,
        fechaReprogramada: fechaPropuesta,
        horaReprogramada: horaPropuesta,
        motivoReprogramacion: data.motivoReprogramacion,
      },
    });

    // Notificar al obstetra para que apruebe o rechace.
    const obstetraUserId = await findObstetraUserIdForGestante(appointment.gestanteId);
    if (obstetraUserId) {
      const nombre = appointment.gestante?.user
        ? `${appointment.gestante.user.firstName} ${appointment.gestante.user.lastName}`
        : 'Una gestante';
      await notifyUser(
        obstetraUserId,
        'solicitud_reprogramacion',
        'Solicitud de reprogramación',
        `${nombre} solicita reprogramar su cita para el ${fmtFecha(fechaPropuesta)} a las ${data.hora}. Motivo: ${data.motivoReprogramacion}`,
        { appointmentId: id, gestanteId: appointment.gestanteId },
      );
    }

    await emitAppointmentEvent('appointment:status_changed', updated);
    return updated;
  }

  /**
   * RF-3.08/3.09: el obstetra RESUELVE una solicitud de reprogramación.
   * - aprobar=true: aplica fecha/hora propuestas como nuevas, vuelve a
   *   "programada" y notifica a la gestante.
   * - aprobar=false: revierte al estado previo y notifica el rechazo.
   */
  async resolveReschedule(
    id: string,
    data: { aprobar: boolean; motivo?: string },
    userContext?: RequestUser,
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { gestante: { include: { user: true } } },
    });
    if (!appointment || appointment.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    const actor = await resolveActor(userContext);
    await assertCanAccessAppointment(appointment, actor);

    if (appointment.estado !== EstadoCita.solicitud_reprogramacion) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        'Esta cita no tiene una solicitud de reprogramación pendiente.',
      );
    }

    const gestanteUserId = appointment.gestante?.user?.id ?? null;

    if (data.aprobar) {
      const nuevaFecha = appointment.fechaReprogramada;
      const nuevaHora = appointment.horaReprogramada;
      if (!nuevaFecha || !nuevaHora) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'La solicitud no tiene fecha/hora propuestas.');
      }

      // Revalidar disponibilidad al aprobar (pudo ocuparse mientras tanto).
      await this.assertSlotAvailable(nuevaFecha, nuevaHora, appointment.obstetraId, id);

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          fecha: nuevaFecha,
          hora: nuevaHora,
          estado: EstadoCita.programada,
          estadoPrevio: null,
          fechaReprogramada: null,
          horaReprogramada: null,
        },
      });

      if (gestanteUserId) {
        await notifyUser(
          gestanteUserId,
          'reprogramacion_aprobada',
          'Reprogramación aprobada',
          `Tu cita fue reprogramada para el ${fmtFecha(nuevaFecha)} a las ${timeFromDate(nuevaHora)}.`,
          { appointmentId: id },
        );
      }

      await emitAppointmentEvent('appointment:status_changed', updated);
      return updated;
    }

    // Rechazo: volver al estado previo y limpiar la propuesta.
    const estadoPrevio = appointment.estadoPrevio ?? EstadoCita.programada;
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        estado: estadoPrevio,
        estadoPrevio: null,
        fechaReprogramada: null,
        horaReprogramada: null,
        motivoReprogramacion: null,
      },
    });

    if (gestanteUserId) {
      await notifyUser(
        gestanteUserId,
        'reprogramacion_rechazada',
        'Reprogramación no aprobada',
        `Tu solicitud de reprogramación no fue aprobada${data.motivo ? `: ${data.motivo}` : '.'} Tu cita del ${fmtFecha(appointment.fecha)} a las ${timeFromDate(appointment.hora)} se mantiene.`,
        { appointmentId: id },
      );
    }

    await emitAppointmentEvent('appointment:status_changed', updated);
    return updated;
  }
}

export const appointmentService = new AppointmentService();
