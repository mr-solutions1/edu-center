import express from 'express';

import * as studentController from './student.controller.js';
import { studentSchema, updateStudentSchema } from './student.validation.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';
import * as attendanceController from '../lessons/attendance.controller.js';

import * as portalController from './portal.controller.js';

const router = express.Router();

router.use(authenticate);

// Portal-specific dashboard routes
router.get(
  '/portal/student-dashboard',
  authorize(UserRole.STUDENT),
  portalController.getStudentDashboard
);

router.get(
  '/portal/parent-dashboard',
  authorize(UserRole.PARENT),
  portalController.getParentDashboard
);

router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.RECEPTIONIST),
  validate(studentSchema),
  studentController.createStudent
);

router.get('/', studentController.getAllStudents);

router.get('/my-students', studentController.getTeacherStudents);

router.get('/:id', studentController.getStudent);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.RECEPTIONIST),
  validate(updateStudentSchema),
  studentController.updateStudent
);

router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  studentController.deleteStudent
);

// Student Attendance History
router.get('/:studentId/attendance', attendanceController.getStudentAttendance);

export default router;
