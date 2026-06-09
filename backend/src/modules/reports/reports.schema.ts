import { z } from 'zod';

export const adherenceSchema = {
  query: z.object({
    gestanteId: z.string().uuid('Gestante ID no válido').optional(),
    treatmentId: z.string().uuid('Treatment ID no válido').optional(),
  }),
};

export const attendanceSchema = {
  query: z.object({
    gestanteId: z.string().uuid('Gestante ID no válido').optional(),
    obstetraId: z.string().uuid('Obstetra ID no válido').optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};
