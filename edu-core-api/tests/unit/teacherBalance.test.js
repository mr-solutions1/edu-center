import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock the models
jest.unstable_mockModule('../../src/modules/students/registration.model.js', () => ({
  default: {
    countDocuments: jest.fn(),
    distinct: jest.fn(),
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/students/student.model.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/lessons/lesson.model.js', () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/tenants/tenantSettings.model.js', () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/modules/ledger/ledger.model.js', () => ({
  default: {
    find: jest.fn(),
  },
}));

// Mock calculateRegistrationTeacherDue to return simple values for tests
jest.unstable_mockModule('../../src/modules/students/studentBalance.service.js', () => ({
  calculateRegistrationTeacherDue: jest.fn(),
}));

const { calculateTeacherMetrics } = await import('../../src/modules/teachers/teacher.service.js');
const StudentRegistration = (await import('../../src/modules/students/registration.model.js')).default;
const Student = (await import('../../src/modules/students/student.model.js')).default;
const Lesson = (await import('../../src/modules/lessons/lesson.model.js')).default;
const TenantSettings = (await import('../../src/modules/tenants/tenantSettings.model.js')).default;
const FinancialLedger = (await import('../../src/modules/ledger/ledger.model.js')).default;
const { calculateRegistrationTeacherDue } = await import('../../src/modules/students/studentBalance.service.js');

describe('Teacher Metrics & Balances Calculation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should compute correct teacher aggregates and financial status', async () => {
    const teacherId = new mongoose.Types.ObjectId();
    const tenantId = new mongoose.Types.ObjectId();

    const teacher = {
      _id: teacherId,
      tenantId,
      usesInstituteCar: true,
    };

    // 1. Mock Registration count & distinct student count
    StudentRegistration.countDocuments.mockResolvedValue(3);
    StudentRegistration.distinct.mockResolvedValue(['student1', 'student2']);

    // 2. Mock Completed Lessons (for Executed Hours and car deduction)
    Lesson.find.mockResolvedValue([
      { durationHours: 1.5, status: 'COMPLETED' },
      { durationHours: 2.5, status: 'COMPLETED' },
    ]);

    // 3. Mock Student Registrations & student grade lookup for Gross Due
    const reg1 = { studentId: 'student1' };
    const reg2 = { studentId: 'student2' };
    StudentRegistration.find.mockResolvedValue([reg1, reg2]);

    Student.findById.mockImplementation((id) => {
      if (id === 'student1') return Promise.resolve({ grade: 'ابتدائي' });
      if (id === 'student2') return Promise.resolve({ grade: 'ثانوي' });
      return Promise.resolve(null);
    });

    calculateRegistrationTeacherDue.mockImplementation((reg) => {
      if (reg.studentId === 'student1') return Promise.resolve(52500); // 52.5 KD
      if (reg.studentId === 'student2') return Promise.resolve(75000); // 75.0 KD
      return Promise.resolve(0);
    });

    // 4. Mock TenantSettings for car deduction (0.5 KD = 500 fils per completed lesson)
    TenantSettings.findOne.mockResolvedValue({
      financialRules: {
        transportationDeductionRate: 0.5,
      },
    });

    // 5. Mock Ledger entries (Paid to Teacher)
    FinancialLedger.find.mockResolvedValue([
      { amount: 40000, type: 'TEACHER_PAYMENT', direction: 'OUT' }, // 40 KD
      { amount: 30000, type: 'TEACHER_PAYMENT', direction: 'OUT' }, // 30 KD
    ]);

    // Calculate
    const metrics = await calculateTeacherMetrics(teacher);

    // Assertions
    expect(metrics.registrationCount).toBe(3);
    expect(metrics.studentCount).toBe(2);
    expect(metrics.executedHours).toBe(4.0); // 1.5 + 2.5 = 4 hours

    // Gross Due (52500 + 75000) = 127500 (127.5 KD)
    expect(metrics.dueBeforeDeduction).toBe(127500);

    // Car deduction: 2 completed lessons * 500 fils = 1000 fils (1 KD)
    expect(metrics.transportationDeduction).toBe(1000);

    // Net Due: 127500 - 1000 = 126500 (126.5 KD)
    expect(metrics.netDue).toBe(126500);

    // Paid to teacher: 40000 + 30000 = 70000 (70 KD)
    expect(metrics.paidToTeacher).toBe(70000);

    // Remaining Due: 126500 - 70000 = 56500 (56.5 KD)
    expect(metrics.remainingDue).toBe(56500);
  });
});
