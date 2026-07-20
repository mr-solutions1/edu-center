import PayrollRecord from './payrollRecord.model.js';
import PayrollTransaction from './payrollTransaction.model.js';
import { CompensationType } from '../../shared/constants/enums.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import * as auditLogger from '../../shared/services/auditLogger.service.js';
import {
  multiplyFils,
  subtractFils,
  toFils,
} from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';
import {
  recordLedgerEntry,
  removeLedgerEntriesByReference,
} from '../ledger/ledger.service.js';
import Lesson from '../lessons/lesson.model.js';
import Teacher from '../teachers/teacher.model.js';
import { SettingsService } from '../tenants/SettingsService.js';

/**
 * Recalculate payroll for a teacher for a specific month/year
 */
export const recalculateForTeacher = async (teacherId, month, year, userId) => {
  return withTransaction(async (session) => {
    // 1. Get Teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('المعلم غير موجود');
    }

    // Enforce reconciliation: reject Payroll for HOURLY teachers
    if (teacher.compensationType === CompensationType.HOURLY) {
      throw new ValidationError(
        'لا يمكن احتساب كشف رواتب آلي لمعلم بنظام الساعة. يرجى استخدام وحدة رواتب الساعات أو تغيير نظام التعويض في ملف المعلم.'
      );
    }

    // 2. Fetch all COMPLETED lessons for the teacher in that month/year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const lessons = await Lesson.find({
      teacherId,
      status: 'COMPLETED',
      lessonDate: { $gte: startDate, $lte: endDate },
    }).session(session);

    // 3. Aggregate totals
    const completedLessons = lessons.length;
    let totalLessonValue = 0;
    let teacherEarnings = 0;
    let instituteRevenue = 0;

    lessons.forEach((l) => {
      totalLessonValue += l.lessonPrice;
      teacherEarnings += l.teacherEarnings;
      instituteRevenue += l.instituteRevenue;
    });

    // 4. Calculate transport deduction (only if teacher uses institute car)
    // Business rule: Flat rate per lesson if using institute car
    const TRANSPORT_RATE = await SettingsService.getTransportationDeductionRate(teacher.tenantId);
    let transportDeductions = 0;
    if (teacher.usesInstituteCar) {
      transportDeductions = multiplyFils(TRANSPORT_RATE, completedLessons);
    }

    const finalAmount = subtractFils(teacherEarnings, transportDeductions);

    // 5. Upsert PayrollRecord with CALCULATED status
    const payrollRecord = await PayrollRecord.findOneAndUpdate(
      { teacherId, month, year },
      {
        completedLessons,
        totalLessonValue,
        teacherEarnings,
        instituteRevenue,
        transportDeductions,
        finalAmount,
        status: 'CALCULATED',
      },
      { upsert: true, new: true, session }
    );

    // 6. Write Audit Transaction
    await PayrollTransaction.create(
      [
        {
          teacherId,
          userId,
          payrollRecordId: payrollRecord._id,
          action: 'RECALCULATE',
          newValue: payrollRecord.toObject(),
        },
      ],
      { session }
    );

    // Activity Log
    await auditLogger.logActivity({
      userId,
      action: 'RECALCULATE_PAYROLL',
      entityType: 'PayrollRecord',
      entityId: payrollRecord._id,
      details: { month, year, finalAmount: payrollRecord.finalAmount },
    });

    return payrollRecord;
  });
};

/**
 * Get all payroll records
 */
export const getAllPayroll = async (query = {}) => {
  const { teacherId, month, year } = query;
  const filter = {};
  if (teacherId) {
    filter.teacherId = teacherId;
  }
  if (month) {
    filter.month = Number(month);
  }
  if (year) {
    filter.year = Number(year);
  }

  return PayrollRecord.find(filter)
    .populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email phone',
      },
    })
    .sort({ year: -1, month: -1 });
};

/**
 * Submit payroll for approval (CALCULATED ➔ PENDING_APPROVAL)
 */
export const submitForApproval = async (id, userId) => {
  return withTransaction(async (session) => {
    const record = await PayrollRecord.findById(id).session(session);
    if (!record) {
      throw new NotFoundError('سجل الراتب غير موجود');
    }

    const previousValue = record.toObject();
    record.status = 'PENDING_APPROVAL';
    await record.save({ session });

    await PayrollTransaction.create(
      [
        {
          teacherId: record.teacherId,
          userId,
          payrollRecordId: record._id,
          action: 'UPDATE',
          previousValue,
          newValue: record.toObject(),
        },
      ],
      { session }
    );

    // Activity Log
    await auditLogger.logActivity({
      userId,
      action: 'SUBMIT_PAYROLL_APPROVAL',
      entityType: 'PayrollRecord',
      entityId: record._id,
      details: { month: record.month, year: record.year },
    });

    return record;
  });
};

/**
 * Approve payroll (PENDING_APPROVAL ➔ APPROVED)
 */
export const approvePayroll = async (id, userId) => {
  return withTransaction(async (session) => {
    const record = await PayrollRecord.findById(id).session(session);
    if (!record) {
      throw new NotFoundError('سجل الراتب غير موجود');
    }

    const previousValue = record.toObject();
    record.status = 'APPROVED';
    await record.save({ session });

    await PayrollTransaction.create(
      [
        {
          teacherId: record.teacherId,
          userId,
          payrollRecordId: record._id,
          action: 'UPDATE',
          previousValue,
          newValue: record.toObject(),
        },
      ],
      { session }
    );

    // Activity Log
    await auditLogger.logActivity({
      userId,
      action: 'APPROVE_PAYROLL',
      entityType: 'PayrollRecord',
      entityId: record._id,
      details: { month: record.month, year: record.year },
    });

    return record;
  });
};

/**
 * Pay payroll (APPROVED ➔ PAID)
 * Automatically records in Financial Ledger
 */
export const payPayroll = async (id, userId) => {
  return withTransaction(async (session) => {
    const record = await PayrollRecord.findById(id).session(session);
    if (!record) {
      throw new NotFoundError('سجل الراتب غير موجود');
    }

    const previousValue = record.toObject();
    record.status = 'PAID';
    record.paid = true;
    record.paidDate = new Date();
    await record.save({ session });

    // Clean any old ledger entries to prevent duplication
    await removeLedgerEntriesByReference(
      record._id,
      'TEACHER_PAYMENT',
      session
    );

    // Record in unified Financial Ledger
    await recordLedgerEntry(
      {
        teacherId: record.teacherId,
        amount: record.finalAmount,
        type: 'TEACHER_PAYMENT',
        direction: 'OUT',
        referenceId: record._id,
        referenceModel: 'PayrollRecord',
        description: `تسوية راتب المعلم - شهر ${record.month}/${record.year}`,
        transactionDate: record.paidDate,
        performedBy: userId,
      },
      session
    );

    // Also record as a complete Transaction to update the chronological running balance of the institute (if amount > 0)!
    if (record.finalAmount > 0) {
      const Transaction = await import('../ledger/transaction.model.js').then(
        (m) => m.default
      );
      const { recalculateRunningBalances } =
        await import('../ledger/ledger.service.js');
      const { generateCode } =
        await import('../../shared/utils/atomicCounter.js');

      const transactionId = await generateCode('transactionId', 'MOV', session);
      const actualTeacherId = record.teacherId?._id || record.teacherId;
      const teacher = await Teacher.findById(actualTeacherId).session(session);
      let teacherName = 'معلم';
      if (teacher) {
        const u = await import('../users/user.model.js').then((m) =>
          m.default.findById(teacher.userId).session(session)
        );
        if (u) {
          teacherName = `${u.firstName} ${u.lastName}`;
        }
      }

      await Transaction.create(
        [
          {
            transactionId,
            date: record.paidDate,
            type: 'TEACHER_PAYMENT',
            name: teacherName,
            teacherId: actualTeacherId,
            amount: record.finalAmount,
            paymentMethod: 'TRANSFER',
            reference: `PAYROLL-${record.month}-${record.year}`,
            notes: `تسوية راتب المعلم - شهر ${record.month}/${record.year}`,
          },
        ],
        { session }
      );

      // Recalculate rolling chronological balance
      await recalculateRunningBalances(session);
    }

    await PayrollTransaction.create(
      [
        {
          teacherId: record.teacherId,
          userId,
          payrollRecordId: record._id,
          action: 'UPDATE',
          previousValue,
          newValue: record.toObject(),
        },
      ],
      { session }
    );

    // Activity Log
    await auditLogger.logActivity({
      userId,
      action: 'MARK_PAYROLL_PAID',
      entityType: 'PayrollRecord',
      entityId: record._id,
      details: { month: record.month, year: record.year },
    });

    return record;
  });
};

/**
 * Backward compatibility alias
 */
export const markPaid = async (id, userId) => {
  return payPayroll(id, userId);
};
