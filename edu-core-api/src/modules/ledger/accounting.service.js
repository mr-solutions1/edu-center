import Account from './account.model.js';
import GeneralLedger from './generalLedger.model.js';
import logger from '../../shared/services/logger.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';

/**
 * Standard enterprise COA definitions
 */
const STANDARD_ACCOUNTS = [
  { accountNumber: '1010', name: 'النقدية بالصندوق (Cash on Hand)', type: 'ASSET', description: 'حساب الصندوق النقدي الرئيسي بالمعهد' },
  { accountNumber: '1020', name: 'البنك (Cash at Bank)', type: 'ASSET', description: 'الحساب البنكي الرئيسي للمعهد للتحويلات وبوابات الدفع' },
  { accountNumber: '2010', name: 'مستحقات المعلمين (Tutors Salary Payable)', type: 'LIABILITY', description: 'المستحقات المالية المعلقة والرواتب المستحقة للصرف للمعلمين' },
  { accountNumber: '4010', name: 'إيرادات الحصص والرسوم (Tuition Revenue)', type: 'REVENUE', description: 'الإيرادات المحصلة من تسجيل الطلاب وحزم الساعات' },
  { accountNumber: '5010', name: 'مصاريف التشغيل والأكاديمية (Operating Expenses)', type: 'EXPENSE', description: 'المصاريف العامة والتشغيلية والإدارية للأكاديمية' },
];

/**
 * Enterprise Accounting & Double-Entry Orchestrator Service
 */
export const AccountingService = {
  /**
   * Seeds standard dynamic Chart of Accounts for a tenant if not present
   */
  seedChartOfAccounts: async (tenantId = null, session = null) => {
    const options = session ? { session } : {};

    for (const acc of STANDARD_ACCOUNTS) {
      const scopedAccountNumber = tenantId ? `${tenantId}_${acc.accountNumber}` : acc.accountNumber;

      const exists = await Account.findOne({ accountNumber: scopedAccountNumber }).session(session);
      if (!exists) {
        await Account.create([
          {
            accountNumber: scopedAccountNumber,
            name: acc.name,
            type: acc.type,
            description: acc.description,
          }
        ], options);
        logger.info(`[AccountingService] Seeded COA Account ${acc.accountNumber} successfully.`);
      }
    }
  },

  /**
   * Records a balanced journal entry atomically
   */
  recordDoubleEntry: async (entries, session = null) => {
    const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    // Strict Double-Entry check: Debits MUST equal Credits!
    if (totalDebits !== totalCredits) {
      throw new Error(`[AccountingService] Unbalanced journal entry. Debits (${totalDebits}) must equal Credits (${totalCredits}).`);
    }

    const options = session ? { session } : {};
    return GeneralLedger.create(entries, options);
  },

  /**
   * Pipes a single-entry cash record from FinancialLedger dynamically to a balanced double-entry
   */
  pipeLedgerToDoubleEntry: async (ledgerEntry, session = null) => {
    const tenantId = ledgerEntry.tenantId || null;

    // 1. Ensure COA is fully seeded for this tenant context
    await AccountingService.seedChartOfAccounts(tenantId, session);

    // Resolve Account references
    const findAccount = async (num) => {
      const accNumber = tenantId ? `${tenantId}_${num}` : num;
      return Account.findOne({ accountNumber: accNumber }).session(session);
    };

    const cashAccount = await findAccount('1010');
    const tuitionRevenue = await findAccount('4010');
    const teacherSalaryPayable = await findAccount('2010');
    const operatingExpenses = await findAccount('5010');

    if (!cashAccount || !tuitionRevenue || !teacherSalaryPayable || !operatingExpenses) {
      logger.error('[AccountingService] Critical Chart of Accounts are missing. Cannot process double-entry.');
      return;
    }

    const doubleEntries = [];
    const amount = ledgerEntry.amount;

    if (ledgerEntry.type === 'STUDENT_PAYMENT' || ledgerEntry.type === 'PACKAGE_PURCHASE') {
      // Debit: Cash on Hand (Asset increases) | Credit: Tuition Revenue (Revenue increases)
      doubleEntries.push(
        {
          accountId: cashAccount._id,
          referenceId: ledgerEntry._id,
          referenceModel: 'FinancialLedger',
          debit: amount,
          credit: 0,
          description: ledgerEntry.description,
          entryDate: ledgerEntry.transactionDate,
        },
        {
          accountId: tuitionRevenue._id,
          referenceId: ledgerEntry._id,
          referenceModel: 'FinancialLedger',
          debit: 0,
          credit: amount,
          description: ledgerEntry.description,
          entryDate: ledgerEntry.transactionDate,
        }
      );
    } else if (ledgerEntry.type === 'TEACHER_PAYMENT') {
      // Debit: Teacher Salary Payable (Liability decreases) | Credit: Cash on Hand (Asset decreases)
      doubleEntries.push(
        {
          accountId: teacherSalaryPayable._id,
          referenceId: ledgerEntry._id,
          referenceModel: 'FinancialLedger',
          debit: amount,
          credit: 0,
          description: ledgerEntry.description,
          entryDate: ledgerEntry.transactionDate,
        },
        {
          accountId: cashAccount._id,
          referenceId: ledgerEntry._id,
          referenceModel: 'FinancialLedger',
          debit: 0,
          credit: amount,
          description: ledgerEntry.description,
          entryDate: ledgerEntry.transactionDate,
        }
      );
    } else if (ledgerEntry.type === 'EXPENSE') {
      // Debit: Operating Expenses (Expense increases) | Credit: Cash on Hand (Asset decreases)
      doubleEntries.push(
        {
          accountId: operatingExpenses._id,
          referenceId: ledgerEntry._id,
          referenceModel: 'FinancialLedger',
          debit: amount,
          credit: 0,
          description: ledgerEntry.description,
          entryDate: ledgerEntry.transactionDate,
        },
        {
          accountId: cashAccount._id,
          referenceId: ledgerEntry._id,
          referenceModel: 'FinancialLedger',
          debit: 0,
          credit: amount,
          description: ledgerEntry.description,
          entryDate: ledgerEntry.transactionDate,
        }
      );
    }

    if (doubleEntries.length > 0) {
      await AccountingService.recordDoubleEntry(doubleEntries, session);
      logger.info(`[AccountingService] Successfully piped and recorded balanced double-entry for Ledger ${ledgerEntry._id}.`);
    }
  },
};
export default AccountingService;
