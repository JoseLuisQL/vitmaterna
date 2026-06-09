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
