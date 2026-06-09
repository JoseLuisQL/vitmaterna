import type { Request, Response, NextFunction } from 'express';
import { patientService } from './patient.service.js';
import { successResponse, buildPaginationMeta } from '../../utils/responseHelper.js';

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { total, gestantes, page, limit } = await patientService.findAll(req.query as any);
    const meta = buildPaginationMeta(total, page, limit);
    res.json(successResponse(gestantes, meta));
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const obstetraUserId = req.user!.userId;
    const data = await patientService.createPatient(obstetraUserId, req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await patientService.findById(req.params.id as string);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};
