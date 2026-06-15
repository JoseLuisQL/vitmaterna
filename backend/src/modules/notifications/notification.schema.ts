import { z } from 'zod';

export const smsConfigSchema = {
  body: z.object({
    provider: z.enum(['twilio', 'mock']),
    accountSid: z.string().optional().nullable(),
    authToken: z.string().optional().nullable(),
    fromNumber: z.string().optional().nullable(),
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
  }),
};
