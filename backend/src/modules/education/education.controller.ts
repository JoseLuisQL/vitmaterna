import type { Request, Response } from 'express';
import { successResponse } from '../../utils/responseHelper.js';
import * as educationService from './education.service.js';

export async function getEducation(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  
  const data = await educationService.getEducationalContentForGestante(userId);

  res.json(
    successResponse(data)
  );
}
