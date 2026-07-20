import FinancialLedger from './ledger.model.js';
import Transaction from './transaction.model.js';
import { AppError } from '../../shared/errors/AppError.js';
import { generateCode } from '../../shared/utils/atomicCounter.js';
import { toFils } from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';
import { recalculateStudentBalances } from '../students/studentBalance.service.js';
import { FinancialCalculationService } from './FinancialCalculationService.js';

/**
 * Recalculates remaining cash balances chronologically across all transactions
 *
 * @param {import('mongoose').ClientSession} [session]
 */
export const recalculateRunningBalances = async (session = null) => {
  return FinancialCalculationService.recalculateRunningBalances(session);
};

/**
 * Records a complete financial transaction atomically across transaction and ledger models
 */
export const createTransaction = async (txnData, performedBy) => {
  return withTransaction(async (session) => {
    const transactionId = await generateCode('transactionId', 'MOV', session);
    const amountInFils = toFils(txnData.amount);

    const [transaction] = await Transaction.create(
      [
        {
          ...txnData,
          transactionId,
          amount: amountInFils,
        },
      ],
      { session }
    );

    // Enforce business rules based on transaction type
    if (txnData.type === 'STUDENT_PAYMENT') {
      // 1. Record in Ledger
      await recordLedgerEntry(
        {
          studentId: txnData.studentId,
          amount: amountInFils,
          type: 'STUDENT_PAYMENT',
          direction: 'IN',
          referenceId: transaction._id,
          referenceModel: 'Payment', // Maps to standard student payment references
          description: `دفعة طالب - ${txnData.name} - ${txnData.notes || ''}`,
          transactionDate: txnData.date,
          performedBy,
        },
        session
      );

      // 2. Recalculate Student Paid, Remaining Amount, and Payment Status
      if (txnData.studentId) {
        await recalculateStudentBalances(txnData.studentId, true);
      }
    } else if (txnData.type === 'TEACHER_PAYMENT') {
      // 1. Record in Ledger
      await recordLedgerEntry(
        {
          teacherId: txnData.teacherId,
          amount: amountInFils,
          type: 'TEACHER_PAYMENT',
          direction: 'OUT',
          referenceId: transaction._id,
          referenceModel: 'PayrollRecord',
          description: `صرف مستحقات معلم - ${txnData.name} - ${txnData.notes || ''}`,
          transactionDate: txnData.date,
          performedBy,
        },
        session
      );

      // 2. Recalculate Teacher metrics
      const { calculateTeacherMetrics } =
        await import('../teachers/teacher.service.js');
      if (txnData.teacherId) {
        const teacher = await import('../teachers/teacher.model.js').then((m) =>
          m.default.findById(txnData.teacherId)
        );
        if (teacher) {
          await calculateTeacherMetrics(teacher);
        }
      }
    } else if (txnData.type === 'EXPENSE') {
      // 1. Record in Ledger as institute expense
      await recordLedgerEntry(
        {
          amount: amountInFils,
          type: 'EXPENSE',
          direction: 'OUT',
          referenceId: transaction._id,
          referenceModel: 'Expense',
          description: `مصروف الأكاديمية - ${txnData.expenseItem} - ${txnData.notes || ''}`,
          transactionDate: txnData.date,
          performedBy,
        },
        session
      );
    }

    // Recalculate and update the running cash balance for all transactions
    await recalculateRunningBalances(session);

    return transaction;
  });
};

/**
 * Record a new financial entry in the unified ledger.
 * This is the financial source of truth.
 *
 * @param {Object} data - The ledger entry attributes
 * @param {import('mongoose').ClientSession} [session] - Optional Mongoose Transaction Session
 * @returns {Promise<Object>} The created ledger entry
 */
export const recordLedgerEntry = async (data, session = null) => {
  const {
    studentId,
    teacherId,
    amount,
    type,
    direction,
    referenceId,
    referenceModel,
    description,
    transactionDate,
    notes,
    performedBy,
  } = data;

  const ledgerData = {
    studentId: studentId || null,
    teacherId: teacherId || null,
    amount,
    type,
    direction,
    referenceId,
    referenceModel,
    description,
    transactionDate: transactionDate || new Date(),
    notes: notes || '',
    performedBy,
  };

  const options = session ? { session } : {};
  const [entry] = await FinancialLedger.create([ledgerData], options);
  return entry;
};

/**
 * Remove any existing ledger entries matching a specific reference.
 * Essential for maintaining idempotency during edits, deletions, or recalculations.
 *
 * @param {string} referenceId - The source document ID
 * @param {string} [type] - Optional specific transaction type
 * @param {import('mongoose').ClientSession} [session] - Optional transaction session
 */
export const removeLedgerEntriesByReference = async (
  referenceId,
  type = null,
  session = null
) => {
  const query = { referenceId };
  if (type) {
    query.type = type;
  }
  const options = session ? { session } : {};
  await FinancialLedger.deleteMany(query, options);
};

/**
 * Get dynamic, real-time aggregated ledger summary stats.
 *
 * @param {string} tenantId - SaaS Tenant Scoping
 * @param {Date} [startDate] - Optional filter start date
 * @param {Date} [endDate] - Optional filter end date
 */
export const getLedgerStats = async (
  tenantId,
  startDate = null,
  endDate = null
) => {
  const filter = { tenantId };

  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) {
      filter.transactionDate.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.transactionDate.$lte = new Date(endDate);
    }
  }

  const aggregations = await FinancialLedger.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: { $cond: [{ $eq: ['$direction', 'IN'] }, '$amount', 0] },
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$amount', 0] },
        },
      },
    },
  ]);

  const stats = aggregations[0] || { totalIncome: 0, totalExpense: 0 };
  const netProfit = stats.totalIncome - stats.totalExpense;

  return {
    totalIncome: stats.totalIncome,
    totalExpense: stats.totalExpense,
    netProfit,
  };
};
