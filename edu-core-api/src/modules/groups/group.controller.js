import Group from './group.model.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const createGroup = asyncHandler(async (req, res) => {
  const group = await Group.create(req.body);
  res.status(201).json({ success: true, data: group });
});

export const getAllGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find()
    .populate('courseId', 'name subject')
    .populate('teacherId', 'employeeCode')
    .populate('students', 'parentName studentCode');
  res.status(200).json({ success: true, data: groups });
});

export const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('courseId')
    .populate('teacherId')
    .populate('students');
  if (!group) {
    throw new NotFoundError('المجموعة غير موجودة');
  }
  res.status(200).json({ success: true, data: group });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!group) {
    throw new NotFoundError('المجموعة غير موجودة');
  }
  res.status(200).json({ success: true, data: group });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findByIdAndUpdate(req.params.id, {
    deletedAt: new Date(),
    isActive: false,
  });
  if (!group) {
    throw new NotFoundError('المجموعة غير موجودة');
  }
  res.status(204).send();
});
