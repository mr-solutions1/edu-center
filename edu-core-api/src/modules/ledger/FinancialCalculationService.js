import Transaction from './transaction.model.js';
import { multiplyFils, subtractFils } from '../../shared/utils/money.js';
import Teacher from '../teachers/teacher.model.js';
import { SettingsService } from '../tenants/SettingsService.js';

export const FinancialCalculationService = {
  /**
   * Recalculates remaining cash balances chronologically across all transactions
   */
  recalculateRunningBalances: async (session = null) => {
    const options = session ? { session } : {};
    const transactions = await Transaction.find()
      .sort({ date: 1, createdAt: 1 })
      .session(session);

    let running = 0;
    for (const t of transactions) {
      if (t.type === 'STUDENT_PAYMENT') {
        running += t.amount;
      } else {
        running -= t.amount;
      }
      t.remainingBalance = running;
      await t.save(options);
    }
  },

  /**
   * Calculates teacher earnings and institute revenue for a given completed lesson
   */
  calculateLessonEarnings: async (lesson) => {
    if (!lesson || lesson.status !== 'COMPLETED') {
      return { teacherEarnings: 0, instituteRevenue: 0, transportDeduction: 0 };
    }

    const teacher = await Teacher.findById(lesson.teacherId);
    if (!teacher) {
      return { teacherEarnings: 0, instituteRevenue: 0, transportDeduction: 0 };
    }

    const tenantId = teacher.tenantId;

    // 1. Determine Stage Hourly Rate
    let stageHourlyRate = teacher.hourlyRate || 0; // Default fallback
    if (lesson.educationalLevel) {
      stageHourlyRate = await SettingsService.getStageHourlyRate(
        tenantId,
        lesson.educationalLevel
      );
    }

    // 2. Determine Teacher Percentage (Default 75%)
    let teacherPct = teacher.teacherPercentage || 0.75;
    const settingsPct = await SettingsService.getTeacherPercentage(tenantId);
    if (typeof settingsPct === 'number') {
      teacherPct = settingsPct / 100;
    }

    // 3. Compute earnings based on Compensation Type
    let baseEarnings = 0;
    if (teacher.compensationType === 'HOURLY') {
      const duration = lesson.durationHours || 1;
      baseEarnings = multiplyFils(stageHourlyRate, duration * teacherPct);
    } else {
      baseEarnings = multiplyFils(lesson.lessonPrice, teacherPct);
    }

    // 4. Transport Deduction
    let transportDeduction = 0;
    if (teacher.usesInstituteCar) {
      transportDeduction =
        await SettingsService.getTransportationDeductionRate(tenantId);
    }

    // Net Teacher Earnings & Institute Revenue (Total cost must equal sum)
    const netTeacherEarnings = Math.max(
      0,
      subtractFils(baseEarnings, transportDeduction)
    );
    const instituteRevenue = subtractFils(
      lesson.lessonPrice,
      netTeacherEarnings
    );

    return {
      teacherEarnings: netTeacherEarnings,
      instituteRevenue,
      transportDeduction,
    };
  },
};
