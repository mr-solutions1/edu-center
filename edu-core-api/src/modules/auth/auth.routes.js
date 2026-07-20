import express from 'express';

import * as authController from './auth.controller.js';
import { loginSchema } from './auth.validation.js';
import * as rbacController from './rbac.controller.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/mfa/verify', authController.mfaVerify);

// Protected routes
router.use(authenticate);
router.post('/mfa/setup', authController.mfaSetup);
router.post('/mfa/enable', authController.mfaEnable);
router.post('/logout-all', authController.logoutAll);
router.get('/me', authController.me);
router.get('/sessions', authController.getSessions);
router.delete('/sessions/:sessionId', authController.revokeSession);

// Dynamic RBAC Management (Admin only)
router.get('/permissions', authorize('ADMIN'), rbacController.getPermissions);
router.get('/roles', authorize('ADMIN'), rbacController.getRoles);
router.post('/roles', authorize('ADMIN'), rbacController.createRole);
router.patch('/roles/:id', authorize('ADMIN'), rbacController.updateRole);
router.delete('/roles/:id', authorize('ADMIN'), rbacController.deleteRole);

export default router;
