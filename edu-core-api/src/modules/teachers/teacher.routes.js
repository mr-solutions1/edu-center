import express from 'express';

import * as teacherController from './teacher.controller.js';
import { teacherSchema, updateTeacherSchema } from './teacher.validation.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';
import { upload } from '../../shared/utils/fileUpload.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(teacherSchema),
  teacherController.createTeacher
);

router.get('/', teacherController.getAllTeachers);

router.get('/profile', teacherController.getProfile);

router.patch(
  '/profile',
  authorize(UserRole.TEACHER, UserRole.ADMIN),
  validate(updateTeacherSchema),
  teacherController.updateProfile
);

router.post(
  '/profile/upload',
  authorize(UserRole.TEACHER, UserRole.ADMIN),
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'certificates', maxCount: 1 },
  ]),
  teacherController.uploadProfileFiles
);

router.get('/:id', teacherController.getTeacher);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(updateTeacherSchema),
  teacherController.updateTeacher
);

router.post(
  '/:id/upload',
  authorize(UserRole.ADMIN),
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'certificates', maxCount: 1 },
  ]),
  teacherController.uploadFiles
);

router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  teacherController.deleteTeacher
);

export default router;
