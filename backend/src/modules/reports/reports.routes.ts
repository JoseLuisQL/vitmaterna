import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as reportsController from './reports.controller.js';
import * as reportsSchema from './reports.schema.js';

const router = Router();

router.use(authenticate);

router.get(
  '/adherence',
  validate(reportsSchema.adherenceSchema),
  reportsController.getAdherence
);

router.get(
  '/attendance',
  validate(reportsSchema.attendanceSchema),
  reportsController.getAttendance
);

router.get(
  '/clinic',
  reportsController.getClinic
);

// Indicadores de la tesis (Objetivo 1 y 2) con filtro de periodo opcional.
router.get(
  '/indicadores',
  reportsController.getThesisIndicators
);

export default router;
