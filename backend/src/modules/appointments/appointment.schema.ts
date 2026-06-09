import { z } from 'zod';

export const createAppointmentSchema = {
  body: z.object({
    gestanteId: z.string().uuid('El ID de gestante debe ser un UUID válido'),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    hora: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:mm)'),
    motivo: z.string().min(3, 'El motivo debe tener al menos 3 caracteres').default('Control prenatal'),
    obstetraId: z.string().uuid('El ID de obstetra debe ser un UUID válido').optional(),
    numeroControl: z.number().int().positive().optional(),
    egSemanas: z.number().int().nonnegative().optional(),
    observaciones: z.string().optional(),
  }),
};

export const updateAppointmentSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la cita debe ser un UUID válido'),
  }),
  body: z.object({
    motivo: z.string().min(3).optional(),
    observaciones: z.string().optional(),
  }),
};

export const rescheduleAppointmentSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la cita debe ser un UUID válido'),
  }),
  body: z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    hora: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:mm)'),
    motivoReprogramacion: z.string().min(5, 'Debe especificar el motivo de reprogramación'),
  }),
};

export const updateStatusSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la cita debe ser un UUID válido'),
  }),
  body: z.object({
    estado: z.enum(['programada', 'confirmada', 'asistida', 'no_asistida', 'reprogramada', 'cancelada']),
  }),
};

export const getAppointmentsSchema = {
  query: z.object({
    gestanteId: z.string().uuid().optional(),
    obstetraId: z.string().uuid().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    estado: z.enum(['programada', 'confirmada', 'asistida', 'no_asistida', 'reprogramada', 'cancelada']).optional(),
  }),
};
