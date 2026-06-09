import { z } from 'zod';

export const createPatientSchema = {
  body: z.object({
    dni: z.string().length(8, 'El DNI debe tener 8 dígitos'),
    firstName: z.string().min(2, 'El nombre es muy corto'),
    lastName: z.string().min(2, 'Los apellidos son muy cortos'),
    phone: z.string().optional(),
    fechaNacimiento: z.string().optional(),
  }),
};

export const getPatientsSchema = {
  query: z.object({
    search: z.string().optional(),
    obstetraId: z.string().uuid().optional(),
    estado: z.enum(['activa', 'parto', 'puerperio', 'inactiva']).optional(),
    nivelRiesgo: z.enum(['verde', 'amarillo', 'rojo']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
};

export const getPatientByIdSchema = {
  params: z.object({
    id: z.string().uuid('El ID de la gestante debe ser un UUID válido'),
  }),
};
