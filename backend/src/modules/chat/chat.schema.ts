import { z } from 'zod';

export const chatHistorySchema = {
  params: z.object({
    conversationId: z.string().uuid('Conversation ID no válido'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  }),
};

export const emergencyAlertSchema = {
  body: z.object({
    latitude: z.number({ required_error: 'La latitud es requerida' }),
    longitude: z.number({ required_error: 'La longitud es requerida' }),
  }),
};

export const broadcastSchema = {
  body: z.object({
    contenido: z.string().min(1, 'El mensaje es requerido').max(1000),
    trimestre: z.coerce.number().int().min(1).max(3).optional(),
    nivelRiesgo: z.enum(['verde', 'amarillo', 'rojo']).optional(),
  }),
};
