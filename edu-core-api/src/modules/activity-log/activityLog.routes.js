import express from 'express';

import * as activityLogController from './activityLog.controller.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize(UserRole.ADMIN),
  activityLogController.getActivityLogs
);

router.get(
  '/audit',
  authorize(UserRole.ADMIN),
  activityLogController.getAuditTrails
);

export default router;
