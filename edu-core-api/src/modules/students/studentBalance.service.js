import mongoose from 'mongoose';

import StudentRegistration from './registration.model.js';
import Student from './student.model.js';
import TenantSettings from '../tenants/tenantSettings.model.js';
import Lesson from '../lessons/lesson.model.js';
import Payment from '../payments/payment.model.js';
import Teacher from '../teachers/teacher.model.js';
import { toFils, toKWD, multiplyFils, subtractFils } from '../../shared/utils/money.js';

/**
 * Checks if a student is eligible for a sibling discount.
 * Eligible starting from the second student in the same Family Group.
 * Siblings are identified as students sharing the same parentPhone.
 *
 * @param {string} studentId
 * @returns {Promise<number>} Sibling discount percentage (e.g. 10 or 0)
 */
export const getSiblingDiscountPercentage = async (studentId) => {
  const student = await Student.findById(studentId);
  if (!student) return 0;

  // Sibling identification: same parentPhone
  const siblings = await Student.find({
    parentPhone: student.parentPhone,
    tenantId: student.tenantId,
  }).sort({ createdAt: 1 });

  // If there are siblings, and this is NOT the first (oldest) one, apply discount
  if (siblings.length > 1 && siblings[0]._id.toString() !== studentId.toString()) {
    // Get sibling discount percentage from TenantSettings
    const settings = await TenantSettings.findOne({ tenantId: student.tenantId });
    const pct = settings?.financialRules?.siblingDiscountPercentage;
    return typeof pct === 'number' ? pct : 10; // Default to 10%
  }

  return 0;
};

/**
 * Recalculates student hours-based balance and outstanding financial balance.
 * Consumed hours reduce registrations in FIFO order.
 * Payments and attendance are recalculated independently.
 *
 * @param {string} studentId
 */
export const recalculateStudentBalances = async (studentId) => {
  const student = await Student.findById(studentId);
  if (!student) return null;

  // 1. Fetch all student registrations
  const regs = await StudentRegistration.find({ studentId }).sort({ registrationDate: 1 });

  // 2. Fetch all completed lessons
  const completedLessons = await Lesson.find({
    studentId,
    status: 'COMPLETED',
  });

  // 3. Compute total consumed hours
  const totalConsumedHours = completedLessons.reduce(
    (sum, lesson) => sum + (lesson.durationHours || 1),
    0
  );

  // 4. Distribute consumed hours across registrations in FIFO order
  let remainingConsumed = totalConsumedHours;
  for (const reg of regs) {
    const allocated = Math.min(reg.purchasedHours, remainingConsumed);
    reg.consumedHours = allocated;
    remainingConsumed = Math.max(0, remainingConsumed - allocated);

    if (reg.consumedHours >= reg.purchasedHours) {
      reg.status = 'COMPLETED';
    } else {
      reg.status = 'ACTIVE';
    }
    await reg.save();
  }

  // Calculate totals
  const totalPurchasedHours = regs.reduce((sum, r) => sum + r.purchasedHours, 0);
  const remainingHours = Math.max(0, totalPurchasedHours - totalConsumedHours);

  // 5. Financial Outstanding Balance
  // Total net amount across all registrations
  const totalRegistrationsAmount = regs.reduce((sum, r) => sum + r.totalAmount, 0);

  // Total payments made by student (status PAID)
  const totalPaidPayments = (
    await Payment.find({ studentId, status: 'PAID' })
  ).reduce((sum, p) => sum + p.amount, 0);

  const outstandingBalance = Math.max(0, totalRegistrationsAmount - totalPaidPayments);

  return {
    totalPurchasedHours,
    totalConsumedHours,
    remainingHours,
    totalRegistrationsAmount,
    totalPaidPayments,
    outstandingBalance,
  };
};

/**
 * Calculates teacher earnings and institute revenue for a given completed lesson.
 * Enforces the official business rules:
 * - Teacher Due = Consumed Hours x Stage Hourly Rate x Teacher Percentage
 * - Car Deduction return to institute revenue if using institute car.
 *
 * @param {Object} lesson
 * @returns {Promise<Object>} { teacherEarnings, instituteRevenue, transportDeduction }
 */
export const calculateLessonEarnings = async (lesson) => {
  const teacher = await Teacher.findById(lesson.teacherId);
  if (!teacher) {
    return { teacherEarnings: 0, instituteRevenue: 0, transportDeduction: 0 };
  }

  const settings = await TenantSettings.findOne({ tenantId: teacher.tenantId });

  // 1. Determine Stage Hourly Rate
  let stageHourlyRate = teacher.hourlyRate || 0; // Default fallback

  // Check if stage rate is configured in Settings
  const stageRates = settings?.financialRules?.stageHourlyRates;
  if (stageRates && lesson.educationalLevel && stageRates[lesson.educationalLevel]) {
    stageHourlyRate = toFils(stageRates[lesson.educationalLevel]);
  }

  // 2. Determine Teacher Percentage (Default 75%)
  let teacherPct = teacher.teacherPercentage || 0.75;
  const settingsPct = settings?.financialRules?.teacherPercentageDefault;
  if (typeof settingsPct === 'number') {
    teacherPct = settingsPct / 100;
  }

  // 3. Compute earnings based on Compensation Type
  let baseEarnings = 0;
  if (teacher.compensationType === 'HOURLY') {
    const duration = lesson.durationHours || 1;
    baseEarnings = multiplyFils(stageHourlyRate, duration * teacherPct);
  } else {
    // PER_LESSON: based on lesson price
    baseEarnings = multiplyFils(lesson.lessonPrice, teacherPct);
  }

  // 4. Transport Deduction
  let transportDeduction = 0;
  if (teacher.usesInstituteCar) {
    const deductionRate = settings?.financialRules?.transportationDeductionRate;
    const rateInFils = typeof deductionRate === 'number' ? toFils(deductionRate) : toFils(0.5); // Default 0.5 KWD
    transportDeduction = rateInFils;
  }

  // Net Teacher Earnings & Institute Revenue (Total cost must equal sum)
  const netTeacherEarnings = Math.max(0, subtractFils(baseEarnings, transportDeduction));
  const instituteRevenue = subtractFils(lesson.lessonPrice, netTeacherEarnings);

  return {
    teacherEarnings: netTeacherEarnings,
    instituteRevenue,
    transportDeduction,
  };
};
