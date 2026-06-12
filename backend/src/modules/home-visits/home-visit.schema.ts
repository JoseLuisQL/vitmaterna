import { z } from 'zod';

export const createHomeVisitSchema = {
  body: z.object({
    gestanteId: z.string().uuid('El ID de gestante debe ser un UUID válido'),
    appointmentId: z.string().uuid().optional(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    horaLlegada: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:mm)').optional(),
    duracionMin: z.number().int().positive().max(600).optional(),
    motivo: z.string().min(3, 'El motivo es requerido'),
    acciones: z.string().min(3, 'Las acciones realizadas son requeridas'),
    acuerdos: z.string().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    firmaGestante: z.boolean().optional(),
    firmaObstetra: z.boolean().optional(),
  }),
};

export const gestanteIdParamSchema = {
  params: z.object({
    gestanteId: z.string().uuid('El ID de gestante debe ser un UUID válido'),
  }),
};

export const updateHomeVisitSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la visita debe ser un UUID válido'),
  }),
  body: z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    horaLlegada: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    duracionMin: z.number().int().positive().max(600).optional(),
    motivo: z.string().min(3).optional(),
    acciones: z.string().min(3).optional(),
    acuerdos: z.string().nullable().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    firmaGestante: z.boolean().optional(),
    firmaObstetra: z.boolean().optional(),
  }),
};

export const idParamSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la visita debe ser un UUID válido'),
  }),
};
