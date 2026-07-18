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
 * Parses an HH:mm 24-hour format string into minutes since midnight.
 * E.g., "14:30" -> 14 * 60 + 30 = 870
 *
 * @param {string} timeStr
 * @returns {number}
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

/**
 * Calculates weekly hours for a registration.
 * Formula: ((To1 - From1) + (To2 - From2)) in minutes / 60
 *
 * @param {Object} reg
 * @returns {number} Hours rounded to 1 decimal place
 */
export const calculateRegistrationWeeklyHours = (reg) => {
  if (!reg || !reg.from1 || !reg.to1) return 0;

  const duration1 = Math.max(0, parseTimeToMinutes(reg.to1) - parseTimeToMinutes(reg.from1));
  let duration2 = 0;
  if (reg.from2 && reg.to2) {
    duration2 = Math.max(0, parseTimeToMinutes(reg.to2) - parseTimeToMinutes(reg.from2));
  }

  const totalMinutes = duration1 + duration2;
  return Math.round((totalMinutes / 60) * 10) / 10;
};

/**
 * Calculates teacher due for a single registration.
 * Formula: Consumed Hours x Stage Hourly Rate x Teacher Percentage
 *
 * @param {Object} reg
 * @param {string} studentGrade
 * @param {string} tenantId
 * @returns {Promise<number>} amount in fils
 */
export const calculateRegistrationTeacherDue = async (reg, studentGrade, tenantId) => {
  if (!reg) return 0;

  const settings = await TenantSettings.findOne({ tenantId });
  const financialRules = settings?.financialRules || {};

  // 1. Get Stage Hourly Rate from Settings (or fallback to defaults)
  let stageRate = 7; // Default fallback for PRIMARY
  const gradeMapping = {
    'تأسيس': 'PRIMARY',
    'ابتدائي': 'PRIMARY',
    'متوسط': 'INTERMEDIATE',
    'ثانوي': 'SECONDARY',
    'جامعي': 'UNIVERSITY',
    'قدرات': 'FOREIGN',
    'تحصيلي': 'SPECIAL_NEEDS',
  };

  const stageKey = gradeMapping[studentGrade] || 'PRIMARY';
  const hourlyRates = financialRules.hourlyRates || {
    PRIMARY: 7,
    INTERMEDIATE: 8,
    SECONDARY: 10,
    UNIVERSITY: 10,
    FOREIGN: 15,
    SPECIAL_NEEDS: 10,
  };

  stageRate = hourlyRates[stageKey] || stageRate;
  const stageRateInFils = toFils(stageRate);

  // 2. Get Teacher Percentage from Settings (or fallback to defaults)
  let teacherPercentage = financialRules.teacherPercentage !== undefined ? financialRules.teacherPercentage : 75; // e.g. 75
  const teacherPctDecimal = teacherPercentage / 100;

  // 3. Compute Consumed Hours x Stage Hourly Rate x Teacher Percentage
  const baseDue = reg.consumedHours * stageRateInFils * teacherPctDecimal;
  return Math.round(baseDue);
};

/**
 * Recalculates student hours-based balance and outstanding financial balance.
 * Consumed hours reduce registrations in FIFO order.
 * Payments and attendance are recalculated independently.
 *
 * @param {string} studentId
 * @param {boolean} save Whether to persist changes to database
 */
export const recalculateStudentBalances = async (studentId, save = false) => {
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
  let idx = 0;
  for (const reg of regs) {
    const allocated = Math.min(reg.purchasedHours, remainingConsumed);
    reg.consumedHours = allocated;
    remainingConsumed = Math.max(0, remainingConsumed - allocated);

    if (reg.consumedHours >= reg.purchasedHours) {
      reg.status = 'COMPLETED';
    } else {
      reg.status = 'ACTIVE';
    }

    // Set primaryRow boolean (only first registration is true)
    reg.primaryRow = (idx === 0);
    idx++;

    if (save) {
      await reg.save();
    }
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

  // 6. Aggregate calculations as requested by the spec
  // Weekly Hours sum across all ACTIVE registrations
  const activeRegs = regs.filter(r => r.status === 'ACTIVE');
  const weeklyHours = activeRegs.reduce((sum, r) => sum + calculateRegistrationWeeklyHours(r), 0);

  // Sum up teacher due of every registration
  let totalTeacherDue = 0;
  for (const r of regs) {
    const teacherDue = await calculateRegistrationTeacherDue(r, student.grade, student.tenantId);
    totalTeacherDue += teacherDue;
  }

  // Payment Status:
  // If Total Due == 0 -> No Dues
  // Else if Remaining Amount <= 0 -> Fully Paid
  // Else if Total Paid > 0 -> Partially Paid
  // Else -> Not Paid
  let paymentStatus = 'No Dues';
  if (totalRegistrationsAmount > 0) {
    if (outstandingBalance <= 0) {
      paymentStatus = 'Fully Paid';
    } else if (totalPaidPayments > 0) {
      paymentStatus = 'Partially Paid';
    } else {
      paymentStatus = 'Not Paid';
    }
  }

  // Balance Alert:
  // Remaining Hours < 0 -> Hours Exceeded
  // Remaining Hours <= Low Hours Threshold (Settings) -> Balance Running Low
  // Else -> OK
  const settings = await TenantSettings.findOne({ tenantId: student.tenantId });
  const lowHoursThreshold = settings?.financialRules?.lowHoursThreshold !== undefined
    ? settings.financialRules.lowHoursThreshold
    : 2;

  let balanceAlert = 'OK';
  if (remainingHours < 0) {
    balanceAlert = 'Hours Exceeded';
  } else if (remainingHours <= lowHoursThreshold) {
    balanceAlert = 'Balance Running Low';
  }

  return {
    totalPurchasedHours,
    totalConsumedHours,
    remainingHours,
    totalRegistrationsAmount,
    totalPaidPayments,
    outstandingBalance,
    weeklyHours,
    paymentStatus,
    balanceAlert,
    teacherDue: totalTeacherDue,
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
  if (!lesson || lesson.status !== 'COMPLETED') {
    return { teacherEarnings: 0, instituteRevenue: 0, transportDeduction: 0 };
  }

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
