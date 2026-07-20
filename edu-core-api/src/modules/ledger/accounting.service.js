import Account from './account.model.js';
import GeneralLedger from './generalLedger.model.js';
import logger from '../../shared/services/logger.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';

/**
 * Standard enterprise COA definitions
 */
const STANDARD_ACCOUNTS = [
  {
    accountNumber: '1010',
    name: 'النقدية بالصندوق (Cash on Hand)',
    type: 'ASSET',
    description: 'حساب الصندوق النقدي الرئيسي بالمعهد',
  },
  {
    accountNumber: '1020',
    name: 'البنك (Cash at Bank)',
    type: 'ASSET',
    description: 'الحساب البنكي الرئيسي للمعهد للتحويلات وبوابات الدفع',
  },
  {
    accountNumber: '2010',
    name: 'مستحقات المعلمين (Tutors Salary Payable)',
    type: 'LIABILITY',
    description: 'المستحقات المالية المعلقة والرواتب المستحقة للصرف للمعلمين',
  },
  {
    accountNumber: '4010',
    name: 'إيرادات الحصص والرسوم (Tuition Revenue)',
    type: 'REVENUE',
    description: 'الإيرادات المحصلة من تسجيل الطلاب وحزم الساعات',
  },
  {
    accountNumber: '5010',
    name: 'مصاريف التشغيل والأكاديمية (Operating Expenses)',
    type: 'EXPENSE',
    description: 'المصاريف العامة والتشغيلية والإدارية للأكاديمية',
  },
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
      const scopedAccountNumber = tenantId
        ? `${tenantId}_${acc.accountNumber}`
        : acc.accountNumber;

      const exists = await Account.findOne({
        accountNumber: scopedAccountNumber,
      }).session(session);
      if (!exists) {
        await Account.create(
          [
            {
              accountNumber: scopedAccountNumber,
              name: acc.name,
              type: acc.type,
              description: acc.description,
            },
          ],
          options
        );
        logger.info(
          `[AccountingService] Seeded COA Account ${acc.accountNumber} successfully.`
        );
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
      throw new Error(
        `[AccountingService] Unbalanced journal entry. Debits (${totalDebits}) must equal Credits (${totalCredits}).`
      );
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

    if (
      !cashAccount ||
      !tuitionRevenue ||
      !teacherSalaryPayable ||
      !operatingExpenses
    ) {
      logger.error(
        '[AccountingService] Critical Chart of Accounts are missing. Cannot process double-entry.'
      );
      return;
    }

    const doubleEntries = [];
    const amount = ledgerEntry.amount;

    if (
      ledgerEntry.type === 'STUDENT_PAYMENT' ||
      ledgerEntry.type === 'PACKAGE_PURCHASE'
    ) {
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
      logger.info(
        `[AccountingService] Successfully piped and recorded balanced double-entry for Ledger ${ledgerEntry._id}.`
      );
    }
  },

  /**
   * Generates Balance Sheet, Income Statement, and Cash Flow Statement reports
   */
  generateFinancialStatements: async (
    tenantId = null,
    startDate = null,
    endDate = null
  ) => {
    // Ensure accounts are seeded first
    await AccountingService.seedChartOfAccounts(tenantId);

    // Fetch accounts scoped to this tenant
    const accounts = await Account.find();

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.entryDate = {};
      if (startDate) dateFilter.entryDate.$gte = new Date(startDate);
      if (endDate) dateFilter.entryDate.$lte = new Date(endDate);
    }

    // Query aggregated Debit/Credit summaries per account
    const journalSummary = await GeneralLedger.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$accountId',
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' },
        },
      },
    ]);

    const summaryMap = new Map();
    journalSummary.forEach((s) => {
      summaryMap.set(s._id.toString(), {
        debit: s.totalDebit,
        credit: s.totalCredit,
      });
    });

    const getBalances = (num) => {
      const accNumber = tenantId ? `${tenantId}_${num}` : num;
      const acc = accounts.find((a) => a.accountNumber === accNumber);
      if (!acc) return { debit: 0, credit: 0, net: 0, name: 'غير محدد' };

      const summary = summaryMap.get(acc._id.toString()) || {
        debit: 0,
        credit: 0,
      };
      const net =
        acc.type === 'ASSET' || acc.type === 'EXPENSE'
          ? summary.debit - summary.credit
          : summary.credit - summary.debit;

      return {
        id: acc._id,
        name: acc.name,
        type: acc.type,
        debit: summary.debit,
        credit: summary.credit,
        net,
      };
    };

    // 1. Income Statement
    const revenue = getBalances('4010');
    const expenses = getBalances('5010');
    const netIncome = revenue.net - expenses.net;

    const incomeStatement = {
      revenue: { name: revenue.name, amount: revenue.net },
      expenses: { name: expenses.name, amount: expenses.net },
      netIncome,
    };

    // 2. Balance Sheet
    const cashOnHand = getBalances('1010');
    const cashAtBank = getBalances('1020');
    const salaryPayable = getBalances('2010');

    const totalAssets = cashOnHand.net + cashAtBank.net;
    const totalLiabilities = salaryPayable.net;
    const equity = totalAssets - totalLiabilities; // Assets = Liabilities + Equity

    const balanceSheet = {
      assets: [
        { name: cashOnHand.name, amount: cashOnHand.net },
        { name: cashAtBank.name, amount: cashAtBank.net },
      ],
      totalAssets,
      liabilities: [{ name: salaryPayable.name, amount: salaryPayable.net }],
      totalLiabilities,
      equity: [
        { name: 'الأرباح المحتجزة (Retained Earnings)', amount: equity },
      ],
      totalEquity: equity,
    };

    // 3. Cash Flow Statement
    const cashInflows = cashOnHand.debit + cashAtBank.debit;
    const cashOutflows = cashOnHand.credit + cashAtBank.credit;
    const netCashFlow = cashInflows - cashOutflows;

    const cashFlowStatement = {
      inflows: cashInflows,
      outflows: cashOutflows,
      netCashFlow,
    };

    return {
      incomeStatement,
      balanceSheet,
      cashFlowStatement,
    };
  },
};
export default AccountingService;
