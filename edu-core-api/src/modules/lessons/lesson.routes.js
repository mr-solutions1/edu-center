import express from 'express';

import * as attendanceController from './attendance.controller.js';
import * as lessonController from './lesson.controller.js';
import { lessonSchema, updateStatusSchema } from './lesson.validation.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.RECEPTIONIST),
  validate(lessonSchema),
  lessonController.createLesson
);
router.get('/', lessonController.getAllLessons);
router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.TEACHER),
  validate(updateStatusSchema),
  lessonController.updateStatus
);
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.RECEPTIONIST),
  lessonController.updateLessonTime
);

// Attendance routes
router.get('/:lessonId/attendance', attendanceController.getLessonAttendance);
router.post(
  '/:lessonId/attendance',
  authorize(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.TEACHER),
  attendanceController.markAttendance
);

export default router;
