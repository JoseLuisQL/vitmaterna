import { Request, Response, NextFunction } from 'express';
import { pullChanges, pushChanges } from './sync.service.js';
import { pullChangesQuerySchema, pushChangesBodySchema } from './sync.schema.js';
import { AppError, ErrorCodes } from '../../types/index.js';

export const syncPull = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedQuery = pullChangesQuerySchema.parse(req.query);
    const { lastPulledAt } = validatedQuery;
    
    // Require user
    if (!req.user || !req.user.userId) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Unauthorized');
    }

    const changes = await pullChanges(lastPulledAt, req.user.userId);
    const timestamp = Date.now();

    res.status(200).json({
      changes,
      timestamp,
    });
  } catch (error) {
    next(error);
  }
};

export const syncPush = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedBody = pushChangesBodySchema.parse(req.body);
    const { changes } = validatedBody;

    if (!req.user || !req.user.userId) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Unauthorized');
    }

    await pushChanges(changes, req.user.userId);

    res.status(200).send();
  } catch (error) {
    next(error);
  }
};
