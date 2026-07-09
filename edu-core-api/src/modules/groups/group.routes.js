import express from 'express';

import * as groupController from './group.controller.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';

const router = express.Router();

router.use(authenticate);

router.get('/', groupController.getAllGroups);
router.get('/:id', groupController.getGroup);

router.post('/', authorize(UserRole.ADMIN), groupController.createGroup);
router.patch('/:id', authorize(UserRole.ADMIN), groupController.updateGroup);
router.delete('/:id', authorize(UserRole.ADMIN), groupController.deleteGroup);

export default router;
