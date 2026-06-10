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

clinicalRoutes.get(
  '/danger-signs',
  validate(schema.getDangerSignsSchema),
  controller.getDangerSigns
);

// Labs
clinicalRoutes.post(
  '/labs',
  validate(schema.createLabResultSchema),
  controller.createLabResult
);
clinicalRoutes.get(
  '/labs/:gestanteId',
  validate(schema.getLabResultsSchema),
  controller.getLabResults
);

// Ultrasounds
clinicalRoutes.post(
  '/ultrasounds',
  validate(schema.createUltrasoundSchema),
  controller.createUltrasound
);
clinicalRoutes.get(
  '/ultrasounds/:gestanteId',
  validate(schema.getUltrasoundsSchema),
  controller.getUltrasounds
);

// Vaccines
clinicalRoutes.post(
  '/vaccines',
  validate(schema.createVaccinationRecordSchema),
  controller.createVaccinationRecord
);
clinicalRoutes.get(
  '/vaccines/:gestanteId',
  validate(schema.getVaccinationRecordsSchema),
  controller.getVaccinationRecords
);

// CIE-10 Pathologies
clinicalRoutes.post(
  '/pathologies',
  validate(schema.createPathologySchema),
  controller.createPathology
);
clinicalRoutes.get(
  '/pathologies/:gestanteId',
  validate(schema.getPathologiesSchema),
  controller.getPathologies
);

// Mental Health Screenings (SRQ-18)
clinicalRoutes.post(
  '/screenings/mental',
  validate(schema.createMentalHealthScreeningSchema),
  controller.createMentalHealthScreening
);
clinicalRoutes.get(
  '/screenings/mental/:gestanteId',
  validate(schema.getMentalHealthScreeningsSchema),
  controller.getMentalHealthScreenings
);

// Violence Screenings
clinicalRoutes.post(
  '/screenings/violence',
  validate(schema.createViolenceScreeningSchema),
  controller.createViolenceScreening
);
clinicalRoutes.get(
  '/screenings/violence/:gestanteId',
  validate(schema.getViolenceScreeningsSchema),
  controller.getViolenceScreenings
);

// Dental Records
clinicalRoutes.post(
  '/dental',
  validate(schema.createDentalRecordSchema),
  controller.createDentalRecord
);
clinicalRoutes.get(
  '/dental/:gestanteId',
  validate(schema.getDentalRecordsSchema),
  controller.getDentalRecords
);

// Nutritional Counseling
clinicalRoutes.post(
  '/nutritional-counseling',
  validate(schema.createNutritionalCounselingSchema),
  controller.createNutritionalCounseling
);
clinicalRoutes.get(
  '/nutritional-counseling/:gestanteId',
  validate(schema.getNutritionalCounselingSchema),
  controller.getNutritionalCounseling
);

// Weight Records
clinicalRoutes.post(
  '/weight-records',
  validate(schema.createWeightRecordSchema),
  controller.createWeightRecord
);
clinicalRoutes.get(
  '/weight-records/:gestanteId',
  validate(schema.getWeightRecordsSchema),
  controller.getWeightRecords
);
