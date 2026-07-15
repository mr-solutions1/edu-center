import express from 'express';

import * as inboxController from './inbox.controller.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/messages', inboxController.getMessages);
router.post('/messages', inboxController.sendMessage);
router.get('/conversations', inboxController.getConversationsList);

export default router;
