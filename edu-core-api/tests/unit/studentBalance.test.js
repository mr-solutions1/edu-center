import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock the models
jest.unstable_mockModule('../../src/modules/students/student.model.js', () => ({
  default: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/students/registration.model.js', () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/tenants/tenantSettings.model.js', () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/lessons/lesson.model.js', () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/payments/payment.model.js', () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/teachers/teacher.model.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

// Import service dynamically so mocks are applied
const {
  getSiblingDiscountPercentage,
  recalculateStudentBalances,
  calculateLessonEarnings,
} = await import('../../src/modules/students/studentBalance.service.js');

const Student = (await import('../../src/modules/students/student.model.js')).default;
const StudentRegistration = (await import('../../src/modules/students/registration.model.js')).default;
const TenantSettings = (await import('../../src/modules/tenants/tenantSettings.model.js')).default;
const Lesson = (await import('../../src/modules/lessons/lesson.model.js')).default;
const Payment = (await import('../../src/modules/payments/payment.model.js')).default;
const Teacher = (await import('../../src/modules/teachers/teacher.model.js')).default;

describe('Student Balance & Financial Logic Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSiblingDiscountPercentage', () => {
    test('should return 0 discount for oldest/first sibling', async () => {
      const studentId = new mongoose.Types.ObjectId();
      const tenantId = new mongoose.Types.ObjectId();

      Student.findById.mockResolvedValue({
        _id: studentId,
        parentPhone: '99998888',
        tenantId,
      });

      // Oldest sibling is first in array
      Student.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: studentId, parentPhone: '99998888' },
          { _id: new mongoose.Types.ObjectId(), parentPhone: '99998888' },
        ]),
      });

      const discount = await getSiblingDiscountPercentage(studentId);
      expect(discount).toBe(0);
    });

    test('should return 10% discount for second sibling', async () => {
      const firstId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();
      const tenantId = new mongoose.Types.ObjectId();

      Student.findById.mockResolvedValue({
        _id: studentId,
        parentPhone: '99998888',
        tenantId,
      });

      Student.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: firstId, parentPhone: '99998888' },
          { _id: studentId, parentPhone: '99998888' },
        ]),
      });

      TenantSettings.findOne.mockResolvedValue({
        financialRules: { siblingDiscountPercentage: 10 },
      });

      const discount = await getSiblingDiscountPercentage(studentId);
      expect(discount).toBe(10);
    });
  });

  describe('recalculateStudentBalances', () => {
    test('should correctly compute balances and allocate hours in FIFO order', async () => {
      const studentId = new mongoose.Types.ObjectId();
      const tenantId = new mongoose.Types.ObjectId();

      Student.findById.mockResolvedValue({
        _id: studentId,
        tenantId,
      });

      const reg1 = {
        _id: new mongoose.Types.ObjectId(),
        subject: 'Math',
        purchasedHours: 10,
        consumedHours: 0,
        totalAmount: 120000, // 120 KWD
        status: 'ACTIVE',
        save: jest.fn(),
      };
      const reg2 = {
        _id: new mongoose.Types.ObjectId(),
        subject: 'Math',
        purchasedHours: 10,
        consumedHours: 0,
        totalAmount: 120000, // 120 KWD
        status: 'ACTIVE',
        save: jest.fn(),
      };

      StudentRegistration.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([reg1, reg2]),
      });

      // Completed lessons totaling 12 hours
      Lesson.find.mockResolvedValue([
        { durationHours: 2, status: 'COMPLETED' },
        { durationHours: 10, status: 'COMPLETED' },
      ]);

      // Paid payments totaling 150 KWD
      Payment.find.mockResolvedValue([
        { amount: 150000, status: 'PAID' },
      ]);

      const result = await recalculateStudentBalances(studentId);

      // Verify FIFO allocation
      // reg1 should be completely consumed (10 hours) and marked completed
      expect(reg1.consumedHours).toBe(10);
      expect(reg1.status).toBe('COMPLETED');
      expect(reg1.save).toHaveBeenCalled();

      // reg2 should have 2 hours consumed and remain active
      expect(reg2.consumedHours).toBe(2);
      expect(reg2.status).toBe('ACTIVE');
      expect(reg2.save).toHaveBeenCalled();

      // Verify aggregates
      expect(result.totalPurchasedHours).toBe(20);
      expect(result.totalConsumedHours).toBe(12);
      expect(result.remainingHours).toBe(8);
      expect(result.totalRegistrationsAmount).toBe(240000);
      expect(result.totalPaidPayments).toBe(150000);
      expect(result.outstandingBalance).toBe(90000); // 240 KWD - 150 KWD = 90 KWD outstanding
    });
  });

  describe('calculateLessonEarnings', () => {
    test('should calculate hourly earnings with 75% default split correctly', async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const tenantId = new mongoose.Types.ObjectId();

      Teacher.findById.mockResolvedValue({
        _id: teacherId,
        tenantId,
        compensationType: 'HOURLY',
        hourlyRate: 10000, // 10 KWD
        teacherPercentage: 0.75,
        usesInstituteCar: false,
      });

      TenantSettings.findOne.mockResolvedValue({
        financialRules: {
          teacherPercentageDefault: 75,
        },
      });

      const lesson = {
        teacherId,
        durationHours: 2,
        lessonPrice: 30000, // 30 KWD total price paid by student
      };

      const result = await calculateLessonEarnings(lesson);

      // 2 hours * 10 KWD/hr = 20 KWD base lesson cost.
      // 20 KWD * 75% teacher split = 15 KWD teacher earnings (15000 fils)
      // Institute Revenue = 30 KWD lessonPrice - 15 KWD teacher earnings = 15 KWD
      expect(result.teacherEarnings).toBe(15000);
      expect(result.instituteRevenue).toBe(15000);
    });

    test('should deduct car deduction rate and return it to institute revenue', async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const tenantId = new mongoose.Types.ObjectId();

      Teacher.findById.mockResolvedValue({
        _id: teacherId,
        tenantId,
        compensationType: 'HOURLY',
        hourlyRate: 10000, // 10 KWD
        teacherPercentage: 0.75,
        usesInstituteCar: true,
      });

      TenantSettings.findOne.mockResolvedValue({
        financialRules: {
          teacherPercentageDefault: 75,
          transportationDeductionRate: 0.5, // 0.5 KWD deduction
        },
      });

      const lesson = {
        teacherId,
        durationHours: 2,
        lessonPrice: 30000, // 30 KWD
      };

      const result = await calculateLessonEarnings(lesson);

      // 2 hours * 10 KWD = 20 KWD. * 75% = 15 KWD teacher earnings (15000 fils).
      // Minus 0.5 KWD car deduction = 14.5 KWD net teacher earnings (14500 fils).
      // Institute Revenue = 30 KWD - 14.5 KWD = 15.5 KWD (15500 fils).
      expect(result.teacherEarnings).toBe(14500);
      expect(result.instituteRevenue).toBe(15500);
      expect(result.transportDeduction).toBe(500);
    });
  });
});
