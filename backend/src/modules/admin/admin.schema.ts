import { z } from 'zod';

// schemas for pagination and common
export const paginationSchema = {
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  })
};

// Admin System Config
export const updateConfigSchema = {
  params: z.object({
    clave: z.string(),
  }),
  body: z.object({
    valor: z.any(),
    descripcion: z.string().optional(),
  }),
};

const educationBody = z.object({
  titulo: z.string().min(1),
  contenido: z.string().min(1),
  tipo: z.enum(['articulo', 'infografia', 'video', 'audio', 'faq']).optional(),
  categoria: z.enum(['nutricion', 'suplementos', 'signos_alarma', 'parto', 'lactancia', 'cuidado_bebe', 'salud_mental', 'general']).optional(),
  trimestre: z.number().int().min(1).max(3).optional().nullable(),
  semanaInicio: z.number().int().min(1).max(42).optional().nullable(),
  semanaFin: z.number().int().min(1).max(42).optional().nullable(),
  idioma: z.string().default('es'),
  mediaUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  duracionMin: z.number().int().optional().nullable(),
  orden: z.number().int().default(0),
  activo: z.boolean().default(true),
});

// Educational Content
export const createEducationSchema = {
  body: educationBody,
};

export const updateEducationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: educationBody.partial(),
};

// approve user
export const approveUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};
