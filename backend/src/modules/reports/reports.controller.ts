import { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service.js';

export const getAdherence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gestanteId, treatmentId } = req.query;
    const stats = await reportsService.getAdherenceStats(
      gestanteId as string | undefined,
      treatmentId as string | undefined,
      req.user, // permite resolver la gestante autenticada
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gestanteId, obstetraId, startDate, endDate } = req.query;
    const stats = await reportsService.getAttendanceStats({
      gestanteId: gestanteId as string | undefined,
      obstetraId: obstetraId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getClinic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await reportsService.getClinicReport();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
