import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as notificationController from './notification.controller.js';
import * as notificationSchema from './notification.schema.js';

const router = Router();

router.use(authenticate);

// Disponibilidad de canales (cualquier usuario autenticado): habilita/bloquea
// los switches de preferencia SMS/WhatsApp en gestantes y obstetras.
router.get('/channels/status', notificationController.getChannelsAvailability);

// ─── Configuración de canales SMS / WhatsApp (solo admin) ──────────────────────
router.get('/channels/config', rbac('admin'), notificationController.getChannelsConfig);
router.put('/channels/sms', rbac('admin'), validate(notificationSchema.smsConfigSchema), notificationController.updateSmsConfig);
router.put('/channels/whatsapp', rbac('admin'), validate(notificationSchema.whatsappConfigSchema), notificationController.updateWhatsAppConfig);
// Interruptor global de canales de pago (SMS/WhatsApp): { enabled: boolean }.
router.put('/channels/paid-enabled', rbac('admin'), notificationController.setPaidChannelsEnabled);
router.post('/channels/test', rbac('admin'), validate(notificationSchema.testChannelSchema), notificationController.testChannel);

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

/**
 * @swagger
 * /v1/notifications:
 *   delete:
 *     summary: Limpia notificaciones del usuario (todas o solo leídas con ?soloLeidas=true)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: soloLeidas
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Notificaciones eliminadas }
 */
router.delete('/', notificationController.clearNotifications);

/**
 * @swagger
 * /v1/notifications/{id}:
 *   delete:
 *     summary: Elimina una notificación del usuario
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notificación eliminada }
 */
router.delete('/:id', notificationController.deleteNotification);

export default router;
