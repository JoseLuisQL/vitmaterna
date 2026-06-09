import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import * as schema from './clinical.schema.js';
import * as controller from './clinical.controller.js';

export const clinicalRoutes = Router();

clinicalRoutes.post(
  '/controls',
  validate(schema.createPrenatalControlSchema),
  controller.createPrenatalControl
);

clinicalRoutes.get(
  '/controls/:gestanteId',
  validate(schema.getPrenatalControlsSchema),
  controller.getPrenatalControls
);

clinicalRoutes.post(
  '/treatments',
  validate(schema.createTreatmentSchema),
  controller.createTreatment
);

clinicalRoutes.get(
  '/treatments',
  controller.getMyTreatments
);

clinicalRoutes.get(
  '/treatments/:gestanteId',
  validate(schema.getTreatmentsSchema),
  controller.getTreatments
);

clinicalRoutes.post(
  '/treatments/:treatmentId/log',
  validate(schema.createSupplementLogSchema),
  controller.createSupplementLog
);

clinicalRoutes.post(
  '/danger-signs',
  validate(schema.createDangerSignSchema),
  controller.createDangerSign
);
