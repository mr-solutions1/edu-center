process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

import Account from '../../src/modules/ledger/account.model.js';
import AccountingService from '../../src/modules/ledger/accounting.service.js';
import GeneralLedger from '../../src/modules/ledger/generalLedger.model.js';
import {
  recordLedgerEntry,
  removeLedgerEntriesByReference,
} from '../../src/modules/ledger/ledger.service.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Chart of Accounts & Double-Entry General Ledger Suite', () => {
  it('should seed standard Chart of Accounts successfully for a tenant', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      await AccountingService.seedChartOfAccounts(tenantId);

      const accounts = await Account.find({
        accountNumber: { $regex: tenantId.toString() },
      });
      expect(accounts).toHaveLength(5);

      const cashAccount = accounts.find((a) =>
        a.accountNumber.endsWith('1010')
      );
      expect(cashAccount).toBeDefined();
      expect(cashAccount.type).toBe('ASSET');
    });
  });

  it('should save a strictly balanced journal entry', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      await AccountingService.seedChartOfAccounts(tenantId);

      const cashAccount = await Account.findOne({
        accountNumber: `${tenantId}_1010`,
      });
      const revenueAccount = await Account.findOne({
        accountNumber: `${tenantId}_4010`,
      });
      const referenceId = new mongoose.Types.ObjectId();

      const result = await AccountingService.recordDoubleEntry([
        {
          accountId: cashAccount._id,
          referenceId,
          referenceModel: 'Payment',
          debit: 50000, // 50 KWD
          credit: 0,
          description: 'دفعة تجريبية',
        },
        {
          accountId: revenueAccount._id,
          referenceId,
          referenceModel: 'Payment',
          debit: 0,
          credit: 50000,
          description: 'دفعة تجريبية',
        },
      ]);

      expect(result).toHaveLength(2);

      const entries = await GeneralLedger.find({ referenceId });
      expect(entries).toHaveLength(2);
    });
  });

  it('should fail and throw an error for unbalanced journal entries', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      await AccountingService.seedChartOfAccounts(tenantId);

      const cashAccount = await Account.findOne({
        accountNumber: `${tenantId}_1010`,
      });
      const referenceId = new mongoose.Types.ObjectId();

      await expect(
        AccountingService.recordDoubleEntry([
          {
            accountId: cashAccount._id,
            referenceId,
            referenceModel: 'Payment',
            debit: 50000, // Unbalanced: no credit leg
            credit: 0,
            description: 'خطأ قيد غير متوازن',
          },
        ])
      ).rejects.toThrow('Unbalanced journal entry');
    });
  });

  it('should automatically pipe standard single-entry ledger creations into balanced general ledger entries', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const referenceId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // Trigger standard ledger record creation
      const ledgerEntry = await recordLedgerEntry({
        studentId: new mongoose.Types.ObjectId(),
        amount: 25000, // 25 KWD
        type: 'STUDENT_PAYMENT',
        direction: 'IN',
        referenceId,
        referenceModel: 'Payment',
        description: 'دفع اشتراك طالب',
        tenantId,
        performedBy: new mongoose.Types.ObjectId(),
      });

      expect(ledgerEntry).toBeDefined();

      // GeneralLedger double entries should have been created automatically
      const coaEntries = await GeneralLedger.find({
        referenceId: ledgerEntry._id,
      });
      expect(coaEntries).toHaveLength(2);

      const debitEntry = coaEntries.find((e) => e.debit === 25000);
      const creditEntry = coaEntries.find((e) => e.credit === 25000);

      expect(debitEntry).toBeDefined();
      expect(creditEntry).toBeDefined();

      // Check that cleanup cleans up GeneralLedger entries as well
      await removeLedgerEntriesByReference(referenceId);

      const clearedEntries = await GeneralLedger.find({
        referenceId: ledgerEntry._id,
      });
      expect(clearedEntries).toHaveLength(0);
    });
  });

  it('should compile balanced multi-tenant Financial Statements correctly', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // 1. Record student income entry
      await recordLedgerEntry({
        amount: 150000, // 150 KWD
        type: 'STUDENT_PAYMENT',
        direction: 'IN',
        referenceId: new mongoose.Types.ObjectId(),
        referenceModel: 'Payment',
        description: 'دفع اشتراك حزمة',
        tenantId,
        performedBy: new mongoose.Types.ObjectId(),
      });

      // 2. Record academy expenses entry
      await recordLedgerEntry({
        amount: 40000, // 40 KWD
        type: 'EXPENSE',
        direction: 'OUT',
        referenceId: new mongoose.Types.ObjectId(),
        referenceModel: 'Expense',
        description: 'مصاريف قرطاسية وأوراق',
        tenantId,
        performedBy: new mongoose.Types.ObjectId(),
      });

      // 3. Compile statements
      const reports =
        await AccountingService.generateFinancialStatements(tenantId);

      // Verify Income Statement (Revenue: 150, Expenses: 40, Profit: 110)
      expect(reports.incomeStatement.revenue.amount).toBe(150000);
      expect(reports.incomeStatement.expenses.amount).toBe(40000);
      expect(reports.incomeStatement.netIncome).toBe(110000);

      // Verify Balance Sheet equations (Assets: 110, Liabilities: 0, Equity: 110)
      expect(reports.balanceSheet.totalAssets).toBe(110000);
      expect(reports.balanceSheet.totalLiabilities).toBe(0);
      expect(reports.balanceSheet.totalEquity).toBe(110000);

      // Verify Cash Flow (Inflows: 150, Outflows: 40, Net: 110)
      expect(reports.cashFlowStatement.inflows).toBe(150000);
      expect(reports.cashFlowStatement.outflows).toBe(40000);
      expect(reports.cashFlowStatement.netCashFlow).toBe(110000);
    });
  });
});
