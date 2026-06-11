import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { rbac } from '../../middleware/rbac.middleware.js';
import * as chatController from './chat.controller.js';
import * as chatSchema from './chat.schema.js';

const router = Router();

router.use(authenticate);

router.get(
  '/history/:conversationId',
  validate(chatSchema.chatHistorySchema),
  chatController.getHistory
);

router.get('/conversations', chatController.getConversations);
router.get('/conversation', chatController.getConversation);

router.post(
  '/emergencia',
  validate(chatSchema.emergencyAlertSchema),
  chatController.sendEmergencyAlert
);

router.post(
  '/upload',
  validate(chatSchema.uploadImageSchema),
  chatController.uploadImage
);

router.post(
  '/broadcast',
  rbac('obstetra', 'admin'),
  validate(chatSchema.broadcastSchema),
  chatController.sendBroadcast
);

export default router;
