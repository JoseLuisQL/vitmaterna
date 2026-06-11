import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import type { RequestUser } from '../../types/index.js';
import { EstadoCita } from '@prisma/client';
import {
  computeAvailableSlots,
  isWithinWorkingHours,
  timeFromDate,
} from '../../utils/appointmentSlots.js';

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

    // Validar horario laboral.
    if (!isWithinWorkingHours(data.hora)) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'La hora está fuera del horario de atención (08:00–17:00, sin 13:00–14:00).',
      );
    }

    const fechaObj = new Date(`${data.fecha}T00:00:00.000Z`);
    const horaObj = new Date(`1970-01-01T${data.hora}:00.000Z`);

    // Evitar doble booking del mismo obstetra.
    await this.assertSlotAvailable(fechaObj, horaObj, obstetraIdToSave);

    return prisma.appointment.create({
      data: {
        gestanteId: data.gestanteId,
        obstetraId: obstetraIdToSave,
        motivo: data.motivo || 'Control prenatal',
        fecha: fechaObj,
        hora: horaObj,
        numeroControl: data.numeroControl,
        egSemanas: data.egSemanas,
        observaciones: data.observaciones,
        estado: EstadoCita.programada,
      },
    });
  }

  async findAll(
    filters: {
      gestanteId?: string;
      obstetraId?: string;
      fecha?: string;
      estado?: EstadoCita;
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

    return prisma.appointment.findMany({
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
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    });
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

    return prisma.appointment.update({
      where: { id },
      data: {
        estado: EstadoCita.reprogramada,
        fechaReprogramada,
        horaReprogramada,
        motivoReprogramacion: data.motivoReprogramacion,
      },
    });
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

    return prisma.appointment.update({
      where: { id },
      data: { estado },
    });
  }
}

export const appointmentService = new AppointmentService();
