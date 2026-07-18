import express from 'express';

import * as ledgerController from './ledger.controller.js';
import { ledgerEntrySchema, ledgerQuerySchema } from './ledger.validation.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  validate(ledgerEntrySchema),
  ledgerController.createLedgerEntry
);

router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST),
  validate(ledgerQuerySchema, 'query'),
  ledgerController.getLedgerEntries
);

router.get(
  '/summary',
  authorize(UserRole.ADMIN, UserRole.ACCOUNTANT),
  ledgerController.getLedgerSummary
);

export default router;
