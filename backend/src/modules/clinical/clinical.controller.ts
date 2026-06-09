import type { Request, Response, NextFunction } from 'express';
import { clinicalService } from './clinical.service.js';
import { successResponse } from '../../utils/responseHelper.js';
import { prisma } from '../../config/database.js';

export const createPrenatalControl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createPrenatalControl(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getPrenatalControls = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getPrenatalControls(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createTreatment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createTreatment(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getTreatments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getTreatments(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getMyTreatments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    
    if (!gestante) {
      return res.status(404).json({ success: false, error: { message: 'Gestante not found' } });
    }

    const data = await clinicalService.getTreatments(gestante.id);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createSupplementLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createSupplementLog(req.params.treatmentId as string, req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createDangerSign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Gestante is authenticated
    // Wait, let's assume body has gestanteId or we get it from auth. Wait, Gestante ID is different from User ID.
    // The previous endpoints seem to expect gestanteId in body or params, let's look at schema.
    // We'll extract gestanteId from the gestante record linked to the user, OR from body.
    // Usually gestante calls this endpoint.
    const userId = req.user!.userId;
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    
    if (!gestante) {
      return res.status(404).json({ success: false, error: { message: 'Gestante not found' } });
    }

    const data = await clinicalService.createDangerSign(gestante.id, req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};
