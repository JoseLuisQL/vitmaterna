import type { Request, Response } from 'express';
import { successResponse } from '../../utils/responseHelper.js';
import { prisma } from '../../config/database.js';
import { z } from 'zod';
import { AppError, ErrorCodes } from '../../types/index.js';

const TokenSchema = z.object({
  expoPushToken: z.string().min(1, 'Expo push token is required')
});

export async function saveToken(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  
  const parsed = TokenSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid push token data', parsed.error.errors);
  }

  const { expoPushToken } = parsed.data;

  // Retrieve current preferences
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }

  const preferences = typeof user.notificationPreferences === 'object' && user.notificationPreferences !== null
    ? user.notificationPreferences
    : {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      notificationPreferences: {
        ...(preferences as object),
        expoPushToken
      }
    }
  });

  res.json(successResponse({ message: 'Push token saved successfully' }));
}
