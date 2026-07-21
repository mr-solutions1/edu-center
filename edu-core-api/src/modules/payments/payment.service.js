import Payment from './payment.model.js';
import PaymentAllocation from './paymentAllocation.model.js';
import StudentRegistration from '../students/registration.model.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import * as auditLogger from '../../shared/services/auditLogger.service.js';
import { notificationService } from '../../shared/services/notification.service.js';
import { toFils } from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';
import {
  recordLedgerEntry,
  removeLedgerEntriesByReference,
} from '../ledger/ledger.service.js';
import { recalculateStudentBalances } from '../students/studentBalance.service.js';

/**
 * Recomputes and heals all FIFO payment allocations for a student
 */
export const reallocateAllStudentPayments = async (studentId, session = null) => {
  const options = session ? { session } : {};

  // 1. Reset all registration paidAmounts to 0
  await StudentRegistration.updateMany({ studentId }, { $set: { paidAmount: 0 } }, options);

  // 2. Delete all existing allocations for this student
  await PaymentAllocation.deleteMany({ studentId }, options);

  // 3. Fetch all active payments for this student chronologically
  const payments = await Payment.find({
    studentId,
    status: { $in: ['PAID', 'PARTIALLY_PAID'] },
    amount: { $gt: 0 },
  })
    .sort({ createdAt: 1 })
    .session(session);

  // 4. Perform chronological FIFO allocations
  for (const payment of payments) {
    let remainingAmount = payment.amount;

    const registrations = await StudentRegistration.find({ studentId })
      .sort({ registrationDate: 1 })
      .session(session);

    for (const reg of registrations) {
      const total = reg.totalAmount || 0;
      const paid = reg.paidAmount || 0;
      const outstanding = total - paid;

      if (outstanding <= 0) {
        continue;
      }

      const allocated = Math.min(remainingAmount, outstanding);
      if (allocated > 0) {
        reg.paidAmount = paid + allocated;
        await reg.save(options);

        await PaymentAllocation.create(
          [
            {
              paymentId: payment._id,
              registrationId: reg._id,
              studentId,
              amount: allocated,
              allocatedAt: payment.createdAt || new Date(),
            },
          ],
          options
        );

        remainingAmount -= allocated;
      }

      if (remainingAmount <= 0) {
        break;
      }
    }
  }
};

export const createPayment = async (paymentData, userId) => {
  return withTransaction(async (session) => {
    const amount = toFils(paymentData.amount);
    const [payment] = await Payment.create([{ ...paymentData, amount }], {
      session,
    });

    // 1. Record Ledger Entry if status is PAID or PARTIALLY_PAID
    if (payment.status === 'PAID' || payment.status === 'PARTIALLY_PAID') {
      await recordLedgerEntry(
        {
          studentId: payment.studentId,
          amount: payment.amount,
          type: 'STUDENT_PAYMENT',
          direction: 'IN',
          referenceId: payment._id,
          referenceModel: 'Payment',
          description: `دفعة مالية من الطالب - ${payment.notes || ''}`,
          transactionDate: payment.paidDate || payment.createdAt || new Date(),
          performedBy: userId,
        },
        session
      );
    }

    // 2. Perform FIFO Allocation
    if (payment.studentId) {
      await reallocateAllStudentPayments(payment.studentId, session);
    }

    // 3. Trigger automatic student balance recalculation
    if (payment.studentId) {
      await recalculateStudentBalances(payment.studentId);
    }

    // Hook point: Send notification to student's user if exists
    if (payment.studentId) {
      notificationService.notify({
        userId: payment.studentId,
        title: 'استلام دفعة',
        message: `تم تسجيل مبلغ ${payment.amount} KD بنجاح.`,
        type: 'PAYMENT_RECEIVED',
      });
    }

    // Activity Log
    await auditLogger.logActivity({
      userId,
      action: 'CREATE_PAYMENT',
      entityType: 'Payment',
      entityId: payment._id,
      details: { amount: payment.amount, studentId: payment.studentId },
    });

    return payment;
  });
};

export const getAllPayments = async (query = {}) => {
  const { studentId, status, page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (studentId) {
    filter.studentId = studentId;
  }
  if (status) {
    filter.status = status;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('studentId', 'parentName studentCode')
      .populate('lessonId', 'title lessonDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);

  // Enrich payments with their chronological allocations down to registrations
  const PaymentAllocation = (await import('./paymentAllocation.model.js')).default;
  const paymentIds = payments.map((p) => p._id);
  const allocations = await PaymentAllocation.find({ paymentId: { $in: paymentIds } })
    .populate('registrationId', 'subject totalAmount')
    .sort({ createdAt: 1 });

  const enrichedPayments = payments.map((p) => {
    const pObj = p.toObject();
    pObj.allocations = allocations
      .filter((a) => a.paymentId.toString() === p._id.toString())
      .map((a) => ({
        _id: a._id,
        registrationId: a.registrationId?._id || a.registrationId,
        subject: a.registrationId?.subject || 'باقة ملغاة /legacy',
        totalAmount: a.registrationId?.totalAmount || 0,
        amount: a.amount,
      }));
    return pObj;
  });

  return {
    payments: enrichedPayments,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPaymentById = async (id) => {
  const payment = await Payment.findById(id)
    .populate('studentId')
    .populate('lessonId');
  if (!payment) {
    throw new NotFoundError('السجل المالي غير موجود');
  }
  return payment;
};

export const updatePayment = async (id, updateData, userId = null) => {
  return withTransaction(async (session) => {
    const whitelistedFields = [
      'studentId',
      'lessonId',
      'amount',
      'dueDate',
      'paidDate',
      'status',
      'paymentMethod',
      'transactionRef',
      'notes',
    ];
    const cleanedData = {};
    whitelistedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        cleanedData[field] = updateData[field];
      }
    });

    if (cleanedData.amount !== undefined) {
      cleanedData.amount = toFils(cleanedData.amount);
    }

    const beforePayment = await Payment.findById(id).session(session);
    if (!beforePayment) {
      throw new NotFoundError('السجل المالي غير موجود');
    }

    const payment = await Payment.findByIdAndUpdate(id, cleanedData, {
      new: true,
      runValidators: true,
      session,
    });

    // Remove any previous ledger entries for this payment
    await removeLedgerEntriesByReference(id, 'STUDENT_PAYMENT', session);

    // Record new ledger entry if status is PAID or PARTIALLY_PAID
    if (payment.status === 'PAID' || payment.status === 'PARTIALLY_PAID') {
      await recordLedgerEntry(
        {
          studentId: payment.studentId,
          amount: payment.amount,
          type: 'STUDENT_PAYMENT',
          direction: 'IN',
          referenceId: payment._id,
          referenceModel: 'Payment',
          description: `تحديث دفعة مالية من الطالب - ${payment.notes || ''}`,
          transactionDate: payment.paidDate || payment.createdAt || new Date(),
          performedBy: userId || beforePayment.studentId, // Fallback to studentId if userId is unavailable
        },
        session
      );
    }

    // Perform FIFO Allocation
    if (payment.studentId) {
      await reallocateAllStudentPayments(payment.studentId, session);
    }
    if (
      beforePayment.studentId &&
      beforePayment.studentId.toString() !== payment.studentId?.toString()
    ) {
      await reallocateAllStudentPayments(beforePayment.studentId, session);
    }

    // Recalculate student balance
    if (payment.studentId) {
      await recalculateStudentBalances(payment.studentId);
    }
    if (
      beforePayment.studentId &&
      beforePayment.studentId.toString() !== payment.studentId?.toString()
    ) {
      await recalculateStudentBalances(beforePayment.studentId);
    }

    return payment;
  });
};

export const deletePayment = async (id) => {
  return withTransaction(async (session) => {
    const payment = await Payment.findById(id).session(session);
    if (!payment) {
      throw new NotFoundError('السجل المالي غير موجود');
    }

    await Payment.findByIdAndDelete(id).session(session);

    // Remove ledger entry
    await removeLedgerEntriesByReference(id, 'STUDENT_PAYMENT', session);

    // Recompute all allocations for this student
    if (payment.studentId) {
      await reallocateAllStudentPayments(payment.studentId, session);
    }

    // Recalculate student balance
    if (payment.studentId) {
      await recalculateStudentBalances(payment.studentId);
    }

    return payment;
  });
};
