import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as schema from './home-visit.schema.js';
import * as controller from './home-visit.controller.js';

const router = Router();

router.use(authenticate);

// Registrar acta de visita domiciliaria (obstetra/admin).
router.post('/', rbac('obstetra', 'admin'), validate(schema.createHomeVisitSchema), controller.createHomeVisit);

// Historial de visitas de una gestante (la gestante ve solo las suyas).
router.get('/:gestanteId', validate(schema.gestanteIdParamSchema), controller.listHomeVisits);

// Editar / eliminar acta (obstetra/admin).
router.patch('/visit/:id', rbac('obstetra', 'admin'), validate(schema.updateHomeVisitSchema), controller.updateHomeVisit);
router.delete('/visit/:id', rbac('obstetra', 'admin'), validate(schema.idParamSchema), controller.deleteHomeVisit);

export default router;
