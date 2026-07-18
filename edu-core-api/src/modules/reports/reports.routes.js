import express from 'express';

import * as reportsController from './reports.controller.js';
import { reportQuerySchema } from './reports.validation.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';

const router = express.Router();

router.use(authenticate);

router.get(
  '/overview',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST),
  reportsController.getOverview
);

router.get(
  '/by-teacher',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(reportQuerySchema, 'query'),
  reportsController.getByTeacherReport
);

router.get(
  '/by-subject',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(reportQuerySchema, 'query'),
  reportsController.getBySubjectReport
);

router.get(
  '/by-level',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(reportQuerySchema, 'query'),
  reportsController.getByLevelReport
);

router.get(
  '/export-csv',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(reportQuerySchema, 'query'),
  reportsController.exportCSV
);

router.get(
  '/export-pdf',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(reportQuerySchema, 'query'),
  reportsController.exportPDF
);

router.get(
  '/export-excel',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(reportQuerySchema, 'query'),
  reportsController.exportExcel
);

router.get(
  '/export-students',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  reportsController.exportStudentsReport
);

router.get(
  '/export-attendance',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST),
  reportsController.exportAttendanceReport
);

router.get(
  '/export-ledger',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  reportsController.exportLedgerReport
);

export default router;
