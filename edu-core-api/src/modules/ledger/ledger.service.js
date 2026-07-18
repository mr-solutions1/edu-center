import FinancialLedger from './ledger.model.js';
import { AppError } from '../../shared/errors/AppError.js';

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
export const removeLedgerEntriesByReference = async (referenceId, type = null, session = null) => {
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
export const getLedgerStats = async (tenantId, startDate = null, endDate = null) => {
  const filter = { tenantId };

  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = new Date(startDate);
    if (endDate) filter.transactionDate.$lte = new Date(endDate);
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
