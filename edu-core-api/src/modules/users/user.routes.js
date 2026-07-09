import express from 'express';

import * as userController from './user.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from './user.validation.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { upload } from '../../shared/middlewares/upload.js';
import { validate } from '../../shared/middlewares/validate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(UserRole.ADMIN), userController.getAllUsers);
router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(createUserSchema),
  userController.createUser
);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);
router.patch(
  '/:id/avatar',
  upload.single('avatar'),
  userController.updateAvatar
);
router.post(
  '/:id/change-password',
  validate(changePasswordSchema),
  userController.changePassword
);

export default router;
