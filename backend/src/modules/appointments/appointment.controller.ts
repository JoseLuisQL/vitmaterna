import type { Request, Response, NextFunction } from 'express';
import { appointmentService } from './appointment.service.js';
import { successResponse } from '../../utils/responseHelper.js';

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.create(req.body, req.user);
    res.status(201).json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.findAll(req.query as any, req.user);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const getAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.getAvailability(req.query as any, req.user);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.reschedule(req.params.id as string, req.body, req.user);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.updateStatus(
      req.params.id as string,
      req.body.estado,
      req.user,
    );
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const convertToHome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.convertToHome(
      req.params.id as string,
      req.body?.observaciones,
      req.user,
    );
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const confirmAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.confirm(req.params.id as string, req.user);
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const requestReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.requestReschedule(
      req.params.id as string,
      req.body,
      req.user,
    );
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

export const resolveReschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appointmentService.resolveReschedule(
      req.params.id as string,
      req.body,
      req.user,
    );
    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};
