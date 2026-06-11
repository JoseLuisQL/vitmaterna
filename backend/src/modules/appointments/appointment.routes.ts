import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import * as schema from './appointment.schema.js';
import * as controller from './appointment.controller.js';

export const appointmentRoutes = Router();

// Crear cita: solo el profesional o el administrador.
appointmentRoutes.post(
  '/',
  rbac('obstetra', 'admin'),
  validate(schema.createAppointmentSchema),
  controller.createAppointment
);

// Listar citas: el servicio filtra por rol (gestante ve solo las suyas).
appointmentRoutes.get(
  '/',
  validate(schema.getAppointmentsSchema),
  controller.getAppointments
);

// Horarios disponibles de un día (agenda inteligente).
appointmentRoutes.get(
  '/availability',
  validate(schema.availabilitySchema),
  controller.getAvailability
);

// Reprogramar (validación de propiedad en el servicio).
appointmentRoutes.patch(
  '/:id/reschedule',
  validate(schema.rescheduleAppointmentSchema),
  controller.rescheduleAppointment
);

// Cambiar estado (transiciones validadas por rol en el servicio).
appointmentRoutes.patch(
  '/:id/status',
  validate(schema.updateStatusSchema),
  controller.updateAppointmentStatus
);
