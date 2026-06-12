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

// El obstetra convierte una cita en visita domiciliaria.
appointmentRoutes.patch(
  '/:id/convertir-domiciliaria',
  rbac('obstetra', 'admin'),
  validate(schema.convertToHomeSchema),
  controller.convertToHome
);

// La gestante confirma su cita (notifica al obstetra).
appointmentRoutes.patch(
  '/:id/confirm',
  rbac('gestante', 'admin'),
  validate(schema.idParamSchema),
  controller.confirmAppointment
);

// La gestante solicita reprogramación (queda pendiente de aprobación).
appointmentRoutes.patch(
  '/:id/request-reschedule',
  rbac('gestante', 'admin'),
  validate(schema.requestRescheduleSchema),
  controller.requestReschedule
);

// El obstetra aprueba o rechaza la solicitud de reprogramación.
appointmentRoutes.patch(
  '/:id/resolve-reschedule',
  rbac('obstetra', 'admin'),
  validate(schema.resolveRescheduleSchema),
  controller.resolveReschedule
);
