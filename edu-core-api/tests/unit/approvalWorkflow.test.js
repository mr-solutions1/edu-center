process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

import ApprovalService from '../../src/modules/ledger/approval.service.js';
import ApprovalChain from '../../src/modules/ledger/approvalChain.model.js';
import PayrollRecord from '../../src/modules/payroll/payrollRecord.model.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Dynamic Multi-Level Approval Workflow Suite', () => {
  it('should support complete sequential signature approval workflow successfully', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const payrollRecordId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // 1. Seed custom sequential 3-level approval chain (Accountant -> Manager -> Owner)
      await ApprovalChain.create({
        tenantId,
        workflowType: 'PAYROLL_APPROVAL',
        levels: ['ACCOUNTANT', 'MANAGER', 'OWNER'],
      });

      // 2. Mock a parent PayrollRecord
      await PayrollRecord.create({
        _id: payrollRecordId,
        teacherId: new mongoose.Types.ObjectId(),
        month: 10,
        year: 2026,
        completedLessons: 5,
        totalLessonValue: 50000,
        teacherEarnings: 40000,
        instituteRevenue: 10000,
        finalAmount: 40000,
        status: 'PENDING_APPROVAL',
        tenantId,
      });

      // 3. Submit dynamic approval request
      const request = await ApprovalService.submitRequest(
        'PAYROLL_APPROVAL',
        payrollRecordId,
        tenantId,
        'اعتماد راتب شهر أكتوبر'
      );

      expect(request).toBeDefined();
      expect(request.status).toBe('PENDING');
      expect(request.currentLevel).toBe(0);

      // 4. Try approving with wrong role (should reject)
      await expect(
        ApprovalService.approveStep(
          request._id,
          new mongoose.Types.ObjectId(),
          'RECEPTIONIST'
        )
      ).rejects.toThrow('غير مصرح لك باعتماد هذه الخطوة');

      // 5. Approve Level 1 (Accountant)
      const user1 = new mongoose.Types.ObjectId();
      const step1 = await ApprovalService.approveStep(
        request._id,
        user1,
        'ACCOUNTANT'
      );
      expect(step1.currentLevel).toBe(1);
      expect(step1.status).toBe('PENDING');
      expect(step1.signatures).toHaveLength(1);
      expect(step1.signatures[0].role).toBe('ACCOUNTANT');

      // 6. Approve Level 2 (Manager)
      const user2 = new mongoose.Types.ObjectId();
      const step2 = await ApprovalService.approveStep(
        request._id,
        user2,
        'MANAGER'
      );
      expect(step2.currentLevel).toBe(2);

      // 7. Approve Level 3 (Owner) -> should complete and trigger callback
      const user3 = new mongoose.Types.ObjectId();
      const step3 = await ApprovalService.approveStep(
        request._id,
        user3,
        'OWNER'
      );
      expect(step3.status).toBe('APPROVED');

      // Verify callback promoted PayrollRecord to APPROVED state
      const payroll = await PayrollRecord.findById(payrollRecordId);
      expect(payroll.status).toBe('APPROVED');
    });
  });

  it('should support reject/decline flow resetting the parent document status', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const payrollRecordId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      await ApprovalChain.create({
        tenantId,
        workflowType: 'PAYROLL_APPROVAL',
        levels: ['ACCOUNTANT'],
      });

      await PayrollRecord.create({
        _id: payrollRecordId,
        teacherId: new mongoose.Types.ObjectId(),
        month: 11,
        year: 2026,
        completedLessons: 2,
        totalLessonValue: 20000,
        teacherEarnings: 15000,
        instituteRevenue: 5000,
        finalAmount: 15000,
        status: 'PENDING_APPROVAL',
        tenantId,
      });

      const request = await ApprovalService.submitRequest(
        'PAYROLL_APPROVAL',
        payrollRecordId,
        tenantId,
        'اعتماد نوفمبر'
      );

      // Reject the request with comments
      const user = new mongoose.Types.ObjectId();
      const step = await ApprovalService.rejectRequest(
        request._id,
        user,
        'ACCOUNTANT',
        'مراجعة الحصص المنفذة مطلوبة لوجود تباين'
      );

      expect(step.status).toBe('REJECTED');
      expect(step.rejectReason).toBe('مراجعة الحصص المنفذة مطلوبة لوجود تباين');

      // Verify callback reset PayrollRecord to CALCULATED state on decline
      const payroll = await PayrollRecord.findById(payrollRecordId);
      expect(payroll.status).toBe('CALCULATED');
    });
  });
});
