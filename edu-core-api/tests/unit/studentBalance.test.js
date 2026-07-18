import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock the core calculation services directly to verify the backward-compatibility facade
jest.unstable_mockModule(
  '../../src/modules/students/StudentCalculationService.js',
  () => ({
    StudentCalculationService: {
      getSiblingDiscountPercentage: jest.fn(),
      recalculateStudentBalances: jest.fn(),
      calculateRegistrationWeeklyHours: jest.fn(),
    },
  })
);

jest.unstable_mockModule(
  '../../src/modules/teachers/TeacherCalculationService.js',
  () => ({
    TeacherCalculationService: {
      calculateRegistrationTeacherDue: jest.fn(),
    },
  })
);

jest.unstable_mockModule(
  '../../src/modules/ledger/FinancialCalculationService.js',
  () => ({
    FinancialCalculationService: {
      calculateLessonEarnings: jest.fn(),
    },
  })
);

// Import facade and the mock references
const {
  getSiblingDiscountPercentage,
  recalculateStudentBalances,
  calculateLessonEarnings,
  calculateRegistrationWeeklyHours,
  calculateRegistrationTeacherDue,
} = await import('../../src/modules/students/studentBalance.service.js');

const { StudentCalculationService } =
  await import('../../src/modules/students/StudentCalculationService.js');
const { TeacherCalculationService } =
  await import('../../src/modules/teachers/TeacherCalculationService.js');
const { FinancialCalculationService } =
  await import('../../src/modules/ledger/FinancialCalculationService.js');

describe('Student Balance & Financial Logic Service & Weekly Hours Facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRegistrationWeeklyHours', () => {
    test('should correctly forward calculation to StudentCalculationService', () => {
      StudentCalculationService.calculateRegistrationWeeklyHours.mockReturnValue(
        4.0
      );
      const hours = calculateRegistrationWeeklyHours({ day1: 'Sunday' });
      expect(hours).toBe(4.0);
      expect(
        StudentCalculationService.calculateRegistrationWeeklyHours
      ).toHaveBeenCalled();
    });
  });

  describe('getSiblingDiscountPercentage', () => {
    test('should correctly forward lookup to StudentCalculationService', async () => {
      StudentCalculationService.getSiblingDiscountPercentage.mockResolvedValue(
        10
      );
      const studentId = new mongoose.Types.ObjectId();
      const discount = await getSiblingDiscountPercentage(studentId);
      expect(discount).toBe(10);
      expect(
        StudentCalculationService.getSiblingDiscountPercentage
      ).toHaveBeenCalledWith(studentId);
    });
  });

  describe('recalculateStudentBalances', () => {
    test('should correctly forward recalculation to StudentCalculationService', async () => {
      const mockResult = { remainingHours: 8, outstandingBalance: 90000 };
      StudentCalculationService.recalculateStudentBalances.mockResolvedValue(
        mockResult
      );
      const studentId = new mongoose.Types.ObjectId();
      const result = await recalculateStudentBalances(studentId, true);
      expect(result).toBe(mockResult);
      expect(
        StudentCalculationService.recalculateStudentBalances
      ).toHaveBeenCalledWith(studentId, true);
    });
  });

  describe('calculateLessonEarnings', () => {
    test('should correctly forward calculation to FinancialCalculationService', async () => {
      const mockResult = { teacherEarnings: 15000, instituteRevenue: 15000 };
      FinancialCalculationService.calculateLessonEarnings.mockResolvedValue(
        mockResult
      );
      const result = await calculateLessonEarnings({ status: 'COMPLETED' });
      expect(result).toBe(mockResult);
      expect(
        FinancialCalculationService.calculateLessonEarnings
      ).toHaveBeenCalled();
    });
  });

  describe('calculateRegistrationTeacherDue', () => {
    test('should correctly forward calculation to TeacherCalculationService', async () => {
      TeacherCalculationService.calculateRegistrationTeacherDue.mockResolvedValue(
        52500
      );
      const result = await calculateRegistrationTeacherDue(
        {},
        'PRIMARY',
        'tenant-123'
      );
      expect(result).toBe(52500);
      expect(
        TeacherCalculationService.calculateRegistrationTeacherDue
      ).toHaveBeenCalled();
    });
  });
});
