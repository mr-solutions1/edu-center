import StudentRegistration from './registration.model.js';
import Student from './student.model.js';
import { toFils } from '../../shared/utils/money.js';
import Lesson from '../lessons/lesson.model.js';
import Payment from '../payments/payment.model.js';
import { SettingsService } from '../tenants/SettingsService.js';

/**
 * Parses HH:mm format to minutes since midnight
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) {
    return 0;
  }
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    return 0;
  }
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
};

export const StudentCalculationService = {
  /**
   * Calculates the weekly hours for a registration
   */
  calculateRegistrationWeeklyHours: (reg) => {
    if (!reg || !reg.from1 || !reg.to1) {
      return 0;
    }

    const duration1 = Math.max(
      0,
      parseTimeToMinutes(reg.to1) - parseTimeToMinutes(reg.from1)
    );
    let duration2 = 0;
    if (reg.from2 && reg.to2) {
      duration2 = Math.max(
        0,
        parseTimeToMinutes(reg.to2) - parseTimeToMinutes(reg.from2)
      );
    }

    const totalMinutes = duration1 + duration2;
    return Math.round((totalMinutes / 60) * 10) / 10;
  },

  /**
   * Calculates student sibling discount percentage
   */
  getSiblingDiscountPercentage: async (studentId) => {
    const student = await Student.findById(studentId);
    if (!student) {
      return 0;
    }

    let filter = { tenantId: student.tenantId };
    if (student.siblingGroup && student.siblingGroup.trim() !== '') {
      filter.siblingGroup = student.siblingGroup.trim();
    } else {
      filter.parentPhone = student.parentPhone;
    }

    const siblings = await Student.find(filter).sort({ createdAt: 1 });

    if (
      siblings.length > 1 &&
      siblings[0]._id.toString() !== studentId.toString()
    ) {
      return SettingsService.getSiblingDiscountPct(student.tenantId);
    }

    return 0;
  },

  /**
   * Calculates student registration package totals
   */
  calculateRegistrationTotals: async (
    studentId,
    pricePerHour,
    purchasedHours
  ) => {
    const priceInFils = toFils(pricePerHour);
    const discountPct =
      await StudentCalculationService.getSiblingDiscountPercentage(studentId);
    const baseTotal = priceInFils * purchasedHours;
    const discountAmount = Math.round(baseTotal * (discountPct / 100));
    const totalAmount = baseTotal - discountAmount;

    return {
      priceInFils,
      discountPct,
      discountAmount,
      totalAmount,
    };
  },

  /**
   * Computes student aggregates chronologically with optional DB persistence (FIFO hours allocation)
   */
  recalculateStudentBalances: async (studentId, save = false) => {
    const student = await Student.findById(studentId);
    if (!student) {
      return null;
    }

    // 1. Fetch all student registrations
    const regs = await StudentRegistration.find({ studentId }).sort({
      registrationDate: 1,
    });

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

      reg.primaryRow = idx === 0;
      idx++;

      if (save) {
        await reg.save();
      }
    }

    // Calculate totals
    const totalPurchasedHours = regs.reduce(
      (sum, r) => sum + r.purchasedHours,
      0
    );
    const remainingHours = Math.max(
      0,
      totalPurchasedHours - totalConsumedHours
    );

    // 5. Financial Outstanding Balance
    const totalRegistrationsAmount = regs.reduce(
      (sum, r) => sum + r.totalAmount,
      0
    );

    const totalPaidPayments = (
      await Payment.find({ studentId, status: 'PAID' })
    ).reduce((sum, p) => sum + p.amount, 0);

    const outstandingBalance = totalRegistrationsAmount - totalPaidPayments;

    // 6. Aggregate calculations as requested by the spec
    const activeRegs = regs.filter((r) => r.status === 'ACTIVE');
    const weeklyHours = activeRegs.reduce(
      (sum, r) =>
        sum + StudentCalculationService.calculateRegistrationWeeklyHours(r),
      0
    );

    // Sum up teacher due of every registration
    const { TeacherCalculationService } =
      await import('../teachers/TeacherCalculationService.js');
    let totalTeacherDue = 0;
    for (const r of regs) {
      const teacherDue =
        await TeacherCalculationService.calculateRegistrationTeacherDue(
          r,
          student.grade,
          student.tenantId
        );
      totalTeacherDue += teacherDue;
    }

    // Payment Status:
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
    const lowHoursThreshold = await SettingsService.getLowHoursThreshold(
      student.tenantId
    );
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
  },
};
