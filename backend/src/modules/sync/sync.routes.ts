import { Router } from 'express';
import { syncPull, syncPush } from './sync.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', syncPull);
router.post('/', syncPush);

export default router;
