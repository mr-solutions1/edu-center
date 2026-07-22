import * as lessonService from './lesson.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const createLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.createLesson(req.body, req.user.id);
  res.status(201).json({
    success: true,
    data: lesson,
  });
});

export const updateLessonTime = asyncHandler(async (req, res) => {
  const lesson = await lessonService.updateLessonTime(
    req.params.id,
    req.body,
    req.user.id
  );
  res.status(200).json({
    success: true,
    data: lesson,
  });
});

export const getAllLessons = asyncHandler(async (req, res) => {
  const lessons = await lessonService.getAllLessons(req.query);
  res.status(200).json({
    success: true,
    data: lessons,
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const lesson = await lessonService.updateLessonStatus(
    req.params.id,
    status,
    notes,
    req.user.id
  );
  res.status(200).json({
    success: true,
    data: lesson,
  });
});
