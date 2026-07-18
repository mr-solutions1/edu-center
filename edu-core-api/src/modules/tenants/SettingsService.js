import TenantSettings from './tenantSettings.model.js';
import { toFils } from '../../shared/utils/money.js';

export const SettingsService = {
  /**
   * Retrieves full financial and operation rules from TenantSettings
   */
  getFinancialRules: async (tenantId) => {
    const settings = await TenantSettings.findOne({ tenantId });
    return settings?.financialRules || {};
  },

  /**
   * Gets the teacher percentage default (e.g. 75)
   */
  getTeacherPercentage: async (tenantId) => {
    const rules = await SettingsService.getFinancialRules(tenantId);
    return rules.teacherPercentage !== undefined ? rules.teacherPercentage : 75;
  },

  /**
   * Gets the low remaining hours threshold (e.g. 2)
   */
  getLowHoursThreshold: async (tenantId) => {
    const rules = await SettingsService.getFinancialRules(tenantId);
    return rules.lowHoursThreshold !== undefined ? rules.lowHoursThreshold : 2;
  },

  /**
   * Gets the sibling discount percentage (e.g. 10)
   */
  getSiblingDiscountPct: async (tenantId) => {
    const rules = await SettingsService.getFinancialRules(tenantId);
    return rules.siblingDiscountPercentage !== undefined
      ? rules.siblingDiscountPercentage
      : 10;
  },

  /**
   * Gets the transportation deduction rate (e.g. 0.5 KWD in fils)
   */
  getTransportationDeductionRate: async (tenantId) => {
    const rules = await SettingsService.getFinancialRules(tenantId);
    const rate =
      rules.transportationDeductionRate !== undefined
        ? rules.transportationDeductionRate
        : 0.5;
    return toFils(rate);
  },

  /**
   * Gets the hourly rate for a specific student grade/stage
   */
  getStageHourlyRate: async (tenantId, studentGrade) => {
    const rules = await SettingsService.getFinancialRules(tenantId);
    const hourlyRates = rules.hourlyRates || {
      PRIMARY: 7,
      INTERMEDIATE: 8,
      SECONDARY: 10,
      UNIVERSITY: 10,
      FOREIGN: 15,
      SPECIAL_NEEDS: 10,
    };

    const gradeMapping = {
      تأسيس: 'PRIMARY',
      ابتدائي: 'PRIMARY',
      متوسط: 'INTERMEDIATE',
      ثانوي: 'SECONDARY',
      جامعي: 'UNIVERSITY',
      قدرات: 'FOREIGN',
      تحصيلي: 'SPECIAL_NEEDS',
    };

    const stageKey = gradeMapping[studentGrade] || 'PRIMARY';
    const rate = hourlyRates[stageKey] || 7;
    return toFils(rate);
  },
};
