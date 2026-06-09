import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import * as schema from './appointment.schema.js';
import * as controller from './appointment.controller.js';

export const appointmentRoutes = Router();

appointmentRoutes.post(
  '/',
  validate(schema.createAppointmentSchema),
  controller.createAppointment
);

appointmentRoutes.get(
  '/',
  validate(schema.getAppointmentsSchema),
  controller.getAppointments
);

appointmentRoutes.patch(
  '/:id/reschedule',
  validate(schema.rescheduleAppointmentSchema),
  controller.rescheduleAppointment
);

appointmentRoutes.patch(
  '/:id/status',
  validate(schema.updateStatusSchema),
  controller.updateAppointmentStatus
);
