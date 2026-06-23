import { z } from 'zod';

// Número remitente en formato E.164 (ej. +15550001111). Se permite vacío/nulo
// (para "no cambiar" o modo mock); si viene, debe ser E.164 válido.
const e164Optional = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'El número remitente debe estar en formato E.164 (ej. +15550001111)')
  .optional()
  .nullable()
  .or(z.literal(''));

export const smsConfigSchema = {
  body: z.object({
    provider: z.enum(['twilio', 'mock']),
    accountSid: z.string().optional().nullable(),
    authToken: z.string().optional().nullable(),
    fromNumber: e164Optional,
  }),
};

export const whatsappConfigSchema = {
  body: z.object({
    provider: z.enum(['whatsapp_cloud', 'mock']),
    apiToken: z.string().optional().nullable(),
    phoneNumberId: z.string().optional().nullable(),
  }),
};

export const testChannelSchema = {
  body: z.object({
    canal: z.enum(['sms', 'whatsapp']),
    destino: z.string().min(6, 'Número de destino requerido'),
    // Mensaje de prueba opcional (personalizable por el admin).
    mensaje: z.string().trim().min(1).max(500).optional(),
  }),
};
