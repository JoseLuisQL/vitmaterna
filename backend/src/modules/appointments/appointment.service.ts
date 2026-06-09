import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import { EstadoCita } from '@prisma/client';

export class AppointmentService {
  async create(data: {
    gestanteId: string;
    fecha: string;
    hora: string;
    motivo?: string;
    obstetraId?: string;
    numeroControl?: number;
    egSemanas?: number;
    observaciones?: string;
  }) {
    // Verificar si la gestante existe
    const gestante = await prisma.gestante.findUnique({
      where: { id: data.gestanteId },
    });
    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante no encontrada');
    }

    const fechaObj = new Date(`${data.fecha}T00:00:00.000Z`);
    const horaObj = new Date(`1970-01-01T${data.hora}:00.000Z`);

    return prisma.appointment.create({
      data: {
        gestanteId: data.gestanteId,
        obstetraId: data.obstetraId,
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

  async findAll(filters: {
    gestanteId?: string;
    obstetraId?: string;
    fecha?: string;
    estado?: EstadoCita;
  }) {
    const where: any = {};
    if (filters.gestanteId) where.gestanteId = filters.gestanteId;
    if (filters.obstetraId) where.obstetraId = filters.obstetraId;
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

  async reschedule(id: string, data: { fecha: string; hora: string; motivoReprogramacion: string }) {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    const fechaReprogramada = new Date(`${data.fecha}T00:00:00.000Z`);
    const horaReprogramada = new Date(`1970-01-01T${data.hora}:00.000Z`);

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

  async updateStatus(id: string, estado: EstadoCita) {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Cita no encontrada');
    }

    return prisma.appointment.update({
      where: { id },
      data: { estado },
    });
  }
}

export const appointmentService = new AppointmentService();
