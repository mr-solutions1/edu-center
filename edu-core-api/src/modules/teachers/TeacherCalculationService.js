import FinancialLedger from '../ledger/ledger.model.js';
import Lesson from '../lessons/lesson.model.js';
import StudentRegistration from '../students/registration.model.js';
import Student from '../students/student.model.js';
import { SettingsService } from '../tenants/SettingsService.js';

export const TeacherCalculationService = {
  /**
   * Calculates teacher due for a single student registration
   */
  calculateRegistrationTeacherDue: async (reg, studentGrade, tenantId) => {
    if (!reg) {
      return 0;
    }

    // Use frozen snapshot hourly rate or fallback to live settings stage rate
    const stageRateInFils =
      typeof reg.pricePerHour === 'number' && reg.pricePerHour > 0
        ? reg.pricePerHour
        : await SettingsService.getStageHourlyRate(tenantId, studentGrade);

    // Use frozen snapshot teacher percentage or fallback to live settings percentage
    const teacherPercentage =
      typeof reg.teacherPercentageSnapshot === 'number'
        ? reg.teacherPercentageSnapshot
        : await SettingsService.getTeacherPercentage(tenantId);

    const teacherPctDecimal = teacherPercentage / 100;

    const baseDue = reg.consumedHours * stageRateInFils * teacherPctDecimal;
    return Math.round(baseDue);
  },

  /**
   * Calculates full real-time aggregates for a teacher
   */
  calculateTeacherMetrics: async (teacher) => {
    if (!teacher) {
      return null;
    }

    const teacherId = teacher._id;

    // 1. Registration Count
    const registrationCount = await StudentRegistration.countDocuments({
      teacherId,
    });

    // 2. Student Count
    const studentCount = await StudentRegistration.distinct('studentId', {
      teacherId,
    }).then((arr) => arr.length);

    // 3. Executed Hours (sum of consumed hours on completed lessons)
    const completedLessons = await Lesson.find({
      teacherId,
      status: 'COMPLETED',
    });
    const executedHours = completedLessons.reduce(
      (sum, l) => sum + (l.durationHours || 1),
      0
    );

    // 4. Gross Due (Sum of Teacher Due from Student Registrations)
    const regs = await StudentRegistration.find({ teacherId });
    let dueBeforeDeduction = 0;
    for (const reg of regs) {
      const student = await Student.findById(reg.studentId);
      const teacherDue =
        await TeacherCalculationService.calculateRegistrationTeacherDue(
          reg,
          student?.grade,
          student?.tenantId || teacher.tenantId
        );
      dueBeforeDeduction += teacherDue;
    }

    // 5. Transportation Deduction (calculated from completed lessons with car)
    let transportationDeduction = 0;
    if (teacher.usesInstituteCar) {
      const rateInFils = await SettingsService.getTransportationDeductionRate(
        teacher.tenantId
      );
      transportationDeduction = completedLessons.length * rateInFils;
    }

    // 6. Net Due
    const netDue = Math.max(0, dueBeforeDeduction - transportationDeduction);

    // 7. Paid to Teacher (Sum of TEACHER_PAYMENT ledger entries)
    const payments = await FinancialLedger.find({
      teacherId,
      type: 'TEACHER_PAYMENT',
      direction: 'OUT',
    });
    const paidToTeacher = payments.reduce((sum, p) => sum + p.amount, 0);

    // 8. Remaining Due
    const remainingDue = Math.max(0, netDue - paidToTeacher);

    return {
      registrationCount,
      studentCount,
      executedHours,
      dueBeforeDeduction,
      transportationDeduction,
      netDue,
      paidToTeacher,
      remainingDue,
    };
  },
};
