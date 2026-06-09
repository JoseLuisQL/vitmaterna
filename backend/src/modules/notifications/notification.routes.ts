import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as notificationController from './notification.controller.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /v1/notifications/token:
 *   post:
 *     summary: Save Expo Push Token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Push token saved successfully
 */
router.post('/token', notificationController.saveToken);

export default router;
