import { jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock SettingsService
jest.unstable_mockModule(
  '../../src/modules/tenants/SettingsService.js',
  () => ({
    SettingsService: {
      getStageHourlyRate: jest.fn(),
      getTeacherPercentage: jest.fn(),
    },
  })
);

const { TeacherCalculationService } = await import(
  '../../src/modules/teachers/TeacherCalculationService.js'
);
const { SettingsService } = await import(
  '../../src/modules/tenants/SettingsService.js'
);

describe('Historical Rate Drift Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should use frozen snapshotted rates and ignore general Settings changes', async () => {
    const reg = {
      consumedHours: 10,
      pricePerHour: 12000, // 12 KWD in fils
      teacherPercentageSnapshot: 80, // 80%
    };

    // Calculate teacher due
    const due = await TeacherCalculationService.calculateRegistrationTeacherDue(
      reg,
      'متوسط',
      'tenant1'
    );

    // Dues should be: 10 hours * 12000 fils * 0.80 = 96000 fils
    expect(due).toBe(96000);

    // SettingsService should NOT have been called because rates are frozen/snapshotted!
    expect(SettingsService.getStageHourlyRate).not.toHaveBeenCalled();
    expect(SettingsService.getTeacherPercentage).not.toHaveBeenCalled();
  });

  test('should fallback to dynamic Settings if frozen snaps are missing', async () => {
    const reg = {
      consumedHours: 10,
      // missing pricePerHour and teacherPercentageSnapshot
    };

    SettingsService.getStageHourlyRate.mockResolvedValue(10000); // 10 KWD in fils
    SettingsService.getTeacherPercentage.mockResolvedValue(70); // 70%

    // Calculate teacher due
    const due = await TeacherCalculationService.calculateRegistrationTeacherDue(
      reg,
      'متوسط',
      'tenant1'
    );

    // Dues should fallback to: 10 hours * 10000 fils * 0.70 = 70000 fils
    expect(due).toBe(70000);

    // SettingsService should be queried as fallback
    expect(SettingsService.getStageHourlyRate).toHaveBeenCalledWith('tenant1', 'متوسط');
    expect(SettingsService.getTeacherPercentage).toHaveBeenCalledWith('tenant1');
  });
});
