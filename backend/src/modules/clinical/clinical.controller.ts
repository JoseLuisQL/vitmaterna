import type { Request, Response, NextFunction } from 'express';
import { clinicalService } from './clinical.service.js';
import { successResponse } from '../../utils/responseHelper.js';
import { prisma } from '../../config/database.js';

export const createPrenatalControl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createPrenatalControl(req.body, req.user?.userId);
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

export const createAntecedente = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createAntecedente(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getAntecedentes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getAntecedentes(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const deleteAntecedente = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.deleteAntecedente(req.params.id as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const updateTreatment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.updateTreatment(req.params.treatmentId as string, req.body);
    res.json(successResponse(data));
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
    const data = await clinicalService.createSupplementLog(
      req.params.treatmentId as string,
      req.body,
      req.user?.userId
    );
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

export const getDangerSigns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const estado = req.query.estado as string;
    const data = await clinicalService.getDangerSigns(estado);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const updateDangerSign = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.updateDangerSign(
      req.params.id as string,
      req.body,
      req.user!.userId
    );
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createLabResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createLabResult(req.body, req.user?.userId);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getLabResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getLabResults(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createUltrasound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createUltrasound(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getUltrasounds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getUltrasounds(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createVaccinationRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createVaccinationRecord(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getVaccinationRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getVaccinationRecords(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createPathology = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createPathology(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getPathologies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getPathologies(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createMentalHealthScreening = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createMentalHealthScreening(req.body, req.user?.userId);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getMentalHealthScreenings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getMentalHealthScreenings(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createViolenceScreening = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createViolenceScreening(req.body, req.user?.userId);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getViolenceScreenings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getViolenceScreenings(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createDentalRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createDentalRecord(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getDentalRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getDentalRecords(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createNutritionalCounseling = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createNutritionalCounseling(req.body, req.user?.userId);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getNutritionalCounseling = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getNutritionalCounseling(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const createWeightRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.createWeightRecord(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getWeightRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await clinicalService.getWeightRecords(req.params.gestanteId as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};
