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

/**
 * @swagger
 * /v1/notifications/token:
 *   delete:
 *     summary: Elimina el Expo Push Token del usuario (logout en el dispositivo)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Token eliminado }
 */
router.delete('/token', notificationController.deleteToken);

/**
 * @swagger
 * /v1/notifications:
 *   get:
 *     summary: Lista las notificaciones in-app del usuario
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: soloNoLeidas
 *         schema: { type: boolean }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista de notificaciones }
 */
router.get('/', notificationController.listNotifications);

/**
 * @swagger
 * /v1/notifications/unread-count:
 *   get:
 *     summary: Número de notificaciones no leídas
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Conteo de no leídas }
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /v1/notifications/read-all:
 *   patch:
 *     summary: Marca todas las notificaciones como leídas
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @swagger
 * /v1/notifications/{id}/read:
 *   patch:
 *     summary: Marca una notificación como leída
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch('/:id/read', notificationController.markAsRead);

export default router;
