import { z } from 'zod';

const changesSchema = z.object({
  created: z.array(z.any()),
  updated: z.array(z.any()),
  deleted: z.array(z.string()),
});

export const pullChangesQuerySchema = z.object({
  lastPulledAt: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
});

export const pushChangesBodySchema = z.object({
  changes: z.record(z.string(), changesSchema),
  lastPulledAt: z.number().optional(),
});
