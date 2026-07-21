process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import Student from '../../src/modules/students/student.model.js';
import StudentRegistration from '../../src/modules/students/registration.model.js';
import Payment from '../../src/modules/payments/payment.model.js';
import PaymentAllocation from '../../src/modules/payments/paymentAllocation.model.js';
import * as paymentService from '../../src/modules/payments/payment.service.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('FIFO Payment Allocation Engine Suite', () => {
  it('should allocate student payments in oldest-unpaid-first order', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // 1. Create a student
      const student = await Student.create({
        studentCode: 'STD_FIFO_001',
        parentName: 'FIFO Parent',
        parentPhone: '96512345',
        address: 'FIFO Address',
        grade: 'ابتدائي',
      });

      // 2. Create 3 chronological registrations (representing packages purchased)
      // Oldest registration (Package 1: 50 KD)
      const reg1 = await StudentRegistration.create({
        studentId: student._id,
        subject: 'Math',
        purchasedHours: 5,
        pricePerHour: 10000,
        totalAmount: 50000, // 50 KWD in fils
        registrationDate: new Date('2026-01-01'),
        status: 'ACTIVE',
      });

      // Middle registration (Package 2: 120 KD)
      const reg2 = await StudentRegistration.create({
        studentId: student._id,
        subject: 'Science',
        purchasedHours: 10,
        pricePerHour: 12000,
        totalAmount: 120000, // 120 KWD in fils
        registrationDate: new Date('2026-02-01'),
        status: 'ACTIVE',
      });

      // Newest registration (Package 3: 80 KD)
      const reg3 = await StudentRegistration.create({
        studentId: student._id,
        subject: 'English',
        purchasedHours: 8,
        pricePerHour: 10000,
        totalAmount: 80000, // 80 KWD in fils
        registrationDate: new Date('2026-03-01'),
        status: 'ACTIVE',
      });

      // 3. Create a payment of 100 KD (PAID)
      // This should fully cover Reg1 (50 KD) and partially cover Reg2 (50 KD)
      const payment1 = await paymentService.createPayment({
        studentId: student._id,
        amount: 100, // 100 KD
        status: 'PAID',
        paymentMethod: 'CASH',
        notes: 'First payment',
      }, student._id);

      // Verify allocations
      const allocs1 = await PaymentAllocation.find({ studentId: student._id });
      expect(allocs1.length).toBe(2);

      // Verify oldest registration (Reg1) is fully paid
      const updatedReg1 = await StudentRegistration.findById(reg1._id);
      expect(updatedReg1.paidAmount).toBe(50000);

      // Verify middle registration (Reg2) is partially paid with 50 KD
      const updatedReg2 = await StudentRegistration.findById(reg2._id);
      expect(updatedReg2.paidAmount).toBe(50000);

      // Verify newest registration (Reg3) remains unpaid (0)
      const updatedReg3 = await StudentRegistration.findById(reg3._id);
      expect(updatedReg3.paidAmount).toBe(0);

      // 4. Create another payment of 100 KD
      // Outstanding balance is: Reg2 has 70 KD left, Reg3 has 80 KD left.
      // Second payment of 100 KD should cover Reg2 (70 KD) and partially cover Reg3 (30 KD)
      const payment2 = await paymentService.createPayment({
        studentId: student._id,
        amount: 100, // 100 KD
        status: 'PAID',
        paymentMethod: 'CASH',
        notes: 'Second payment',
      }, student._id);

      // Reg2 should be fully paid (120 KD)
      const finalReg2 = await StudentRegistration.findById(reg2._id);
      expect(finalReg2.paidAmount).toBe(120000);

      // Reg3 should have 30 KD paid
      const finalReg3 = await StudentRegistration.findById(reg3._id);
      expect(finalReg3.paidAmount).toBe(30000);

      // 5. Delete first payment (100 KD)
      // Should roll back Reg1 & Reg2 paidAmounts and delete allocations for payment1
      await paymentService.deletePayment(payment1._id);

      // Now with only payment2 (100 KD) left, it should re-allocate to:
      // Reg1 (50 KD) and Reg2 (50 KD)
      const rolledReg1 = await StudentRegistration.findById(reg1._id);
      expect(rolledReg1.paidAmount).toBe(50000);

      const rolledReg2 = await StudentRegistration.findById(reg2._id);
      expect(rolledReg2.paidAmount).toBe(50000);

      const rolledReg3 = await StudentRegistration.findById(reg3._id);
      expect(rolledReg3.paidAmount).toBe(0);
    });
  });
});
