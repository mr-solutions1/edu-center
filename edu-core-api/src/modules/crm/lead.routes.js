import express from 'express';

import * as leadController from './lead.controller.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { hasPermission } from '../../shared/middlewares/authorize.js';
import { checkFeatureFlag } from '../../shared/middlewares/featureFlags.js';

const router = express.Router();

router.use(authenticate);
router.use(checkFeatureFlag('crmEnabled'));

router.get('/', hasPermission('crm.view'), leadController.getLeads);
router.post('/', hasPermission('crm.manage'), leadController.createLead);
router.patch('/:id', hasPermission('crm.manage'), leadController.updateLead);
router.post('/:id/notes', hasPermission('crm.manage'), leadController.addLeadNote);
router.post('/:id/followups', hasPermission('crm.manage'), leadController.addLeadFollowUp);
router.patch('/:id/followups/:followUpId', hasPermission('crm.manage'), leadController.updateLeadFollowUp);

export default router;
