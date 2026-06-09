import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import * as schema from './patient.schema.js';
import * as controller from './patient.controller.js';

export const patientRoutes = Router();

patientRoutes.post(
  '/',
  validate(schema.createPatientSchema),
  controller.createPatient
);

patientRoutes.get(
  '/',
  validate(schema.getPatientsSchema),
  controller.getPatients
);

patientRoutes.get(
  '/:id',
  validate(schema.getPatientByIdSchema),
  controller.getPatientById
);
