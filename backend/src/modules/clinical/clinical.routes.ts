import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import { requireFeature } from '../../middleware/featureFlag.middleware.js';
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

clinicalRoutes.patch(
  '/treatments/:treatmentId',
  rbac('obstetra', 'admin'),
  validate(schema.updateTreatmentSchema),
  controller.updateTreatment
);

// Antecedentes familiares/personales (RF-2.03)
clinicalRoutes.post(
  '/antecedentes',
  rbac('obstetra', 'admin'),
  validate(schema.createAntecedenteSchema),
  controller.createAntecedente
);

clinicalRoutes.get(
  '/antecedentes/:gestanteId',
  validate(schema.getAntecedentesSchema),
  controller.getAntecedentes
);

clinicalRoutes.delete(
  '/antecedentes/:id',
  rbac('obstetra', 'admin'),
  validate(schema.deleteAntecedenteSchema),
  controller.deleteAntecedente
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

clinicalRoutes.patch(
  '/danger-signs/:id',
  rbac('obstetra', 'admin'),
  validate(schema.updateDangerSignSchema),
  controller.updateDangerSign
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

// Ultrasounds (módulo opcional fuera del alcance de la tesis)
clinicalRoutes.post(
  '/ultrasounds',
  requireFeature('ecografias'),
  validate(schema.createUltrasoundSchema),
  controller.createUltrasound
);
clinicalRoutes.get(
  '/ultrasounds/:gestanteId',
  requireFeature('ecografias'),
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

// CIE-10 Pathologies — módulo opcional fuera de alcance
clinicalRoutes.post(
  '/pathologies',
  requireFeature('patologias'),
  validate(schema.createPathologySchema),
  controller.createPathology
);
clinicalRoutes.get(
  '/pathologies/:gestanteId',
  requireFeature('patologias'),
  validate(schema.getPathologiesSchema),
  controller.getPathologies
);

// Mental Health Screenings (SRQ-18) — módulo opcional fuera de alcance
clinicalRoutes.post(
  '/screenings/mental',
  requireFeature('tamizajeSaludMental'),
  validate(schema.createMentalHealthScreeningSchema),
  controller.createMentalHealthScreening
);
clinicalRoutes.get(
  '/screenings/mental/:gestanteId',
  requireFeature('tamizajeSaludMental'),
  validate(schema.getMentalHealthScreeningsSchema),
  controller.getMentalHealthScreenings
);

// Violence Screenings — módulo opcional fuera de alcance
clinicalRoutes.post(
  '/screenings/violence',
  requireFeature('tamizajeViolencia'),
  validate(schema.createViolenceScreeningSchema),
  controller.createViolenceScreening
);
clinicalRoutes.get(
  '/screenings/violence/:gestanteId',
  requireFeature('tamizajeViolencia'),
  validate(schema.getViolenceScreeningsSchema),
  controller.getViolenceScreenings
);

// Dental Records — módulo opcional fuera de alcance
clinicalRoutes.post(
  '/dental',
  requireFeature('odontograma'),
  validate(schema.createDentalRecordSchema),
  controller.createDentalRecord
);
clinicalRoutes.get(
  '/dental/:gestanteId',
  requireFeature('odontograma'),
  validate(schema.getDentalRecordsSchema),
  controller.getDentalRecords
);

// Nutritional Counseling — módulo opcional fuera de alcance
clinicalRoutes.post(
  '/nutritional-counseling',
  requireFeature('consejeriaNutricional'),
  validate(schema.createNutritionalCounselingSchema),
  controller.createNutritionalCounseling
);
clinicalRoutes.get(
  '/nutritional-counseling/:gestanteId',
  requireFeature('consejeriaNutricional'),
  validate(schema.getNutritionalCounselingSchema),
  controller.getNutritionalCounseling
);

// Weight Records — módulo opcional fuera de alcance
clinicalRoutes.post(
  '/weight-records',
  requireFeature('pesoRegistros'),
  validate(schema.createWeightRecordSchema),
  controller.createWeightRecord
);
clinicalRoutes.get(
  '/weight-records/:gestanteId',
  requireFeature('pesoRegistros'),
  validate(schema.getWeightRecordsSchema),
  controller.getWeightRecords
);
