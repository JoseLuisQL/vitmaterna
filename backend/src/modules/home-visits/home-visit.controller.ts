import type { Request, Response, NextFunction } from 'express';
import { homeVisitService } from './home-visit.service.js';
import { successResponse } from '../../utils/responseHelper.js';

export const createHomeVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await homeVisitService.create(req.body, req.user);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const listHomeVisits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await homeVisitService.listByGestante(req.params.gestanteId as string, req.user);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const updateHomeVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await homeVisitService.update(req.params.id as string, req.body);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const deleteHomeVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await homeVisitService.remove(req.params.id as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};
