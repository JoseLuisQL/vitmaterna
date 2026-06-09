import type { Request, Response, NextFunction } from 'express';
import { appointmentService } from './appointment.service.js';
import { successResponse } from '../../utils/responseHelper.js';

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.create(req.body);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.findAll(req.query as any);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.reschedule(req.params.id as string, req.body);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.updateStatus(req.params.id as string, req.body.estado);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};
