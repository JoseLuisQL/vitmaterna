import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as educationController from './education.controller.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /v1/education:
 *   get:
 *     summary: Get educational content filtered by trimester
 *     tags: [Education]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Educational content list
 */
router.get('/', educationController.getEducation);
router.get('/catalog', educationController.getCatalog);
router.post('/:id/view', educationController.registerView);
// Debe ir al final para no capturar `/catalog` como un id.
router.get('/:id', educationController.getById);

export default router;
