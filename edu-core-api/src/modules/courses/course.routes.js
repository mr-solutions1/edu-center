import express from 'express';

import * as courseController from './course.controller.js';
import { UserRole } from '../../shared/constants/enums.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorize } from '../../shared/middlewares/authorize.js';

const router = express.Router();

router.use(authenticate);

router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourse);

router.post('/', authorize(UserRole.ADMIN), courseController.createCourse);
router.patch('/:id', authorize(UserRole.ADMIN), courseController.updateCourse);
router.delete('/:id', authorize(UserRole.ADMIN), courseController.deleteCourse);

export default router;
