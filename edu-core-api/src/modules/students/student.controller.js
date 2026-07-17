import * as studentService from './student.service.js';
import StudentRegistration from './registration.model.js';
import { getSiblingDiscountPercentage, recalculateStudentBalances } from './studentBalance.service.js';
import { toFils } from '../../shared/utils/money.js';
import { logAuditTrail } from '../../shared/services/auditLogger.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';

export const getStudentBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const balance = await recalculateStudentBalances(id);
  if (!balance) {
    throw new NotFoundError('الطالب غير موجود');
  }
  res.status(200).json({
    success: true,
    data: balance,
  });
});

export const getRegistrations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const registrations = await StudentRegistration.find({ studentId: id }).sort({ registrationDate: -1 });
  res.status(200).json({
    success: true,
    data: registrations,
  });
});

export const createRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, purchasedHours, pricePerHour, notes } = req.body;

  const priceInFils = toFils(pricePerHour);
  const discountPct = await getSiblingDiscountPercentage(id);
  const baseTotal = priceInFils * purchasedHours;
  const discountAmount = Math.round(baseTotal * (discountPct / 100));
  const totalAmount = baseTotal - discountAmount;

  const registration = await StudentRegistration.create({
    studentId: id,
    subject,
    purchasedHours,
    pricePerHour: priceInFils,
    discountPercentage: discountPct,
    discountAmount,
    totalAmount,
    notes,
  });

  // Trigger recalculation
  await recalculateStudentBalances(id);

  await logAuditTrail(req, {
    action: 'STUDENT_REGISTRATION_CREATED',
    entityType: 'StudentRegistration',
    entityId: registration._id,
    afterState: registration.toObject(),
  });

  res.status(201).json({
    success: true,
    data: registration,
  });
});

export const deleteRegistration = asyncHandler(async (req, res) => {
  const { id, regId } = req.params;
  const registration = await StudentRegistration.findOneAndDelete({ _id: regId, studentId: id });
  if (!registration) {
    throw new NotFoundError('التسجيل غير موجود');
  }

  // Trigger recalculation
  await recalculateStudentBalances(id);

  await logAuditTrail(req, {
    action: 'STUDENT_REGISTRATION_DELETED',
    entityType: 'StudentRegistration',
    entityId: regId,
    beforeState: registration.toObject(),
  });

  res.status(204).send();
});

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
    beforeState: beforeStudent.toObject
      ? beforeStudent.toObject()
      : beforeStudent,
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
    beforeState: beforeStudent.toObject
      ? beforeStudent.toObject()
      : beforeStudent,
  });

  res.status(204).send();
});

export const getTeacherStudents = asyncHandler(async (req, res) => {
  const students = await studentService.getStudentsByTeacherId(req.user.id);
  res.status(200).json({ success: true, data: students });
});
