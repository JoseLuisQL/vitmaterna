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
  '/buscar',
  validate(schema.buscarPatientSchema),
  controller.buscarPatient
);

// Estadísticas agregadas (dashboard del obstetra). Debe ir ANTES de '/:id'
// para que 'stats' no se interprete como un id de gestante.
patientRoutes.get(
  '/stats',
  validate(schema.getPatientStatsSchema),
  controller.getPatientStats
);

patientRoutes.get(
  '/:id',
  validate(schema.getPatientByIdSchema),
  controller.getPatientById
);

// Ubicación GPS del domicilio (la gestante puede registrar la suya; obstetra/admin también).
patientRoutes.patch(
  '/:id/ubicacion',
  validate(schema.updateUbicacionSchema),
  controller.updateUbicacion
);

patientRoutes.patch(
  '/:id',
  validate(schema.updatePatientSchema),
  controller.updatePatient
);
