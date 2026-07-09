import Course from './course.model.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json({ success: true, data: course });
});

export const getAllCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find();
  res.status(200).json({ success: true, data: courses });
});

export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    throw new NotFoundError('الدورة غير موجودة');
  }
  res.status(200).json({ success: true, data: course });
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!course) {
    throw new NotFoundError('الدورة غير موجودة');
  }
  res.status(200).json({ success: true, data: course });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, {
    deletedAt: new Date(),
    isActive: false,
  });
  if (!course) {
    throw new NotFoundError('الدورة غير موجودة');
  }
  res.status(204).send();
});
