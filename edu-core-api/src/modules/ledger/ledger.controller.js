import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import FinancialLedger from './ledger.model.js';
import { recordLedgerEntry, getLedgerStats } from './ledger.service.js';
import { logAuditTrail } from '../../shared/services/auditLogger.js';
import { AppError } from '../../shared/errors/AppError.js';

/**
 * @desc    Record manual financial entry (Adjustments or Expenses)
 * @route   POST /api/v1/ledger
 * @access  Private (Admin, Accountant)
 */
export const createLedgerEntry = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    performedBy: req.user._id,
  };

  const entry = await recordLedgerEntry(payload);

  // Log in Audit Trail
  await logAuditTrail(req, {
    action: `LEDGER_ENTRY_RECORDED`,
    entityType: 'FinancialLedger',
    entityId: entry._id,
    afterState: entry.toObject(),
    reason: req.body.notes || 'تسجيل حركة مالية يدوية في دفتر الأستاذ',
  });

  res.status(201).json({
    success: true,
    data: entry,
  });
});

/**
 * @desc    Get paginated ledger entries
 * @route   GET /api/v1/ledger
 * @access  Private (Admin, Accountant, Receptionist)
 */
export const getLedgerEntries = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    direction,
    startDate,
    endDate,
    studentId,
    teacherId,
  } = req.query;

  const skip = (page - 1) * limit;
  const filter = {};

  if (type) filter.type = type;
  if (direction) filter.direction = direction;
  if (studentId) filter.studentId = studentId;
  if (teacherId) filter.teacherId = teacherId;

  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = new Date(startDate);
    if (endDate) filter.transactionDate.$lte = new Date(endDate);
  }

  const [entries, total] = await Promise.all([
    FinancialLedger.find(filter)
      .populate('studentId', 'parentName parentPhone')
      .populate('teacherId', 'userId usesInstituteCar')
      .populate('performedBy', 'firstName lastName')
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    FinancialLedger.countDocuments(filter),
  ]);

  // If populate teacher, we can populate its user details manually or via schema path.
  // Let's populate user details inside teacher if possible, but let's check teacher schema first.
  // To keep it simple, we can return the items.

  res.status(200).json({
    success: true,
    data: entries,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get financial summary stats
 * @route   GET /api/v1/ledger/summary
 * @access  Private (Admin, Accountant)
 */
export const getLedgerSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const tenantId = req.user.tenantId;

  const stats = await getLedgerStats(tenantId, startDate, endDate);

  res.status(200).json({
    success: true,
    data: stats,
  });
});
