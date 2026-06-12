import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';

export const apiRouter = Router();

// ---- Auth Module ----
apiRouter.use('/auth', authRoutes);

// ---- App Modules ----
import { appointmentRoutes } from '../modules/appointments/appointment.routes.js';
import { clinicalRoutes } from '../modules/clinical/clinical.routes.js';
import { patientRoutes } from '../modules/patients/patient.routes.js';
import { authenticate } from '../middleware/auth.middleware.js';
import educationRoutes from '../modules/education/education.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';

import syncRoutes from '../modules/sync/sync.routes.js';
import reportsRoutes from '../modules/reports/reports.routes.js';
import chatRoutes from '../modules/chat/chat.routes.js';
import homeVisitRoutes from '../modules/home-visits/home-visit.routes.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';

// ---- Future modules will be mounted here ----
apiRouter.use('/appointments', authenticate, appointmentRoutes);
apiRouter.use('/clinical', authenticate, clinicalRoutes);
apiRouter.use('/patients', authenticate, patientRoutes);
apiRouter.use('/sync', authenticate, syncRoutes);
apiRouter.use('/education', educationRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/home-visits', homeVisitRoutes);
// apiRouter.use('/gestantes', gestanteRoutes);
apiRouter.use('/admin', adminRoutes);
