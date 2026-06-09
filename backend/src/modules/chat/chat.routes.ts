import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as chatController from './chat.controller.js';
import * as chatSchema from './chat.schema.js';

const router = Router();

router.use(authenticate);

router.get(
  '/history/:conversationId',
  validate(chatSchema.chatHistorySchema),
  chatController.getHistory
);

export default router;
