import express from 'express';

import * as settingsController from './settings.controller.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', settingsController.getSettings);
router.patch('/', settingsController.updateSettings);

export default router;
