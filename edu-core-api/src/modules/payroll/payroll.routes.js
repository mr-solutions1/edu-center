import express from 'express';

import * as payrollController from './payroll.controller.js';
import { generatePayrollSchema } from './payroll.validation.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  payrollController.getAllPayroll
);

router.post(
  '/generate',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(generatePayrollSchema),
  payrollController.generatePayroll
);

router.get(
  '/:id/approval',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  payrollController.getApprovalDetails
);

router.patch(
  '/:id/submit-approval',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  payrollController.submitForApproval
);

router.patch(
  '/:id/approve',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  payrollController.approvePayroll
);

router.patch(
  '/:id/reject',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  payrollController.rejectPayroll
);

router.patch(
  '/:id/paid',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  payrollController.markPaid
);

export default router;
