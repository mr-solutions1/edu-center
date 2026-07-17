import * as studentService from './student.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { logAuditTrail } from '../../shared/services/auditLogger.js';

export const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body);

  await logAuditTrail(req, {
    action: 'STUDENT_CREATED',
    entityType: 'Student',
    entityId: student._id,
    afterState: student.toObject ? student.toObject() : student,
  });

  res.status(201).json({
    success: true,
    data: student,
  });
});

export const getAllStudents = asyncHandler(async (req, res) => {
  const { students, pagination } = await studentService.getAllStudents(
    req.query
  );
  res.status(200).json({
    success: true,
    data: students,
    meta: pagination,
  });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.params.id);
  res.status(200).json({
    success: true,
    data: student,
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const beforeStudent = await studentService.getStudentById(req.params.id);
  const student = await studentService.updateStudent(req.params.id, req.body);

  await logAuditTrail(req, {
    action: 'STUDENT_UPDATED',
    entityType: 'Student',
    entityId: student._id,
    beforeState: beforeStudent.toObject ? beforeStudent.toObject() : beforeStudent,
    afterState: student.toObject ? student.toObject() : student,
  });

  res.status(200).json({
    success: true,
    data: student,
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const beforeStudent = await studentService.getStudentById(req.params.id);
  await studentService.deleteStudent(req.params.id);

  await logAuditTrail(req, {
    action: 'STUDENT_DELETED',
    entityType: 'Student',
    entityId: req.params.id,
    beforeState: beforeStudent.toObject ? beforeStudent.toObject() : beforeStudent,
  });

  res.status(204).send();
});

export const getTeacherStudents = asyncHandler(async (req, res) => {
  const students = await studentService.getStudentsByTeacherId(req.user.id);
  res.status(200).json({ success: true, data: students });
});
