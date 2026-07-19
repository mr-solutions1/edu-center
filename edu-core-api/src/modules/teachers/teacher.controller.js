import * as teacherService from './teacher.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const createTeacher = asyncHandler(async (req, res) => {
  const teacher = await teacherService.createTeacher(req.body);
  res.status(201).json({
    success: true,
    data: teacher,
  });
});

export const uploadProfileFiles = asyncHandler(async (req, res) => {
  const teacherDoc = await teacherService.getTeacherByUserId(req.user.id);

  const updateData = {};
  if (req.files && req.files.cv) {
    updateData.cvUrl = req.files.cv[0].path;
  }
  if (req.files && req.files.certificates) {
    updateData.certificatesUrl = req.files.certificates[0].path;
  }

  const teacher = await teacherService.updateTeacher(teacherDoc._id, updateData);

  res.status(200).json({
    success: true,
    data: teacher,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const teacherDoc = await teacherService.getTeacherByUserId(req.user.id);

  const allowedUpdates = [
    'firstName', 'lastName', 'phone', 'whatsapp',
    'subjects', 'gradesTaught', 'experienceYears',
    'address', 'googleMapsUrl', 'bio'
  ];

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const updatedTeacher = await teacherService.updateTeacher(teacherDoc._id, updates);

  res.status(200).json({
    success: true,
    data: updatedTeacher,
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const teacher = await teacherService.getTeacherByUserId(req.user.id);
  res.status(200).json({
    success: true,
    data: teacher,
  });
});

export const getAllTeachers = asyncHandler(async (req, res) => {
  const { teachers, pagination } = await teacherService.getAllTeachers(
    req.query
  );
  res.status(200).json({
    success: true,
    data: teachers,
    meta: pagination,
  });
});

export const getTeacher = asyncHandler(async (req, res) => {
  const teacher = await teacherService.getTeacherById(req.params.id);
  res.status(200).json({
    success: true,
    data: teacher,
  });
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await teacherService.updateTeacher(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: teacher,
  });
});

export const deleteTeacher = asyncHandler(async (req, res) => {
  await teacherService.deleteTeacher(req.params.id);
  res.status(204).send();
});

export const uploadFiles = asyncHandler(async (req, res) => {
  const updateData = {};
  if (req.files.cv) {
    updateData.cvUrl = req.files.cv[0].path;
  }
  if (req.files.certificates) {
    updateData.certificatesUrl = req.files.certificates[0].path;
  }

  const teacher = await teacherService.updateTeacher(req.params.id, updateData);

  res.status(200).json({
    success: true,
    data: teacher,
  });
});
