/**
 * Backward compatibility facade. Centralizes and forwards all student, teacher,
 * and lesson financial calculations to the dedicated, robust Calculation Services.
 */

import { StudentCalculationService } from './StudentCalculationService.js';
import { FinancialCalculationService } from '../ledger/FinancialCalculationService.js';
import { TeacherCalculationService } from '../teachers/TeacherCalculationService.js';

export const getSiblingDiscountPercentage =
  StudentCalculationService.getSiblingDiscountPercentage;
export const recalculateStudentBalances =
  StudentCalculationService.recalculateStudentBalances;
export const calculateRegistrationWeeklyHours =
  StudentCalculationService.calculateRegistrationWeeklyHours;

export const calculateRegistrationTeacherDue =
  TeacherCalculationService.calculateRegistrationTeacherDue;

export const calculateLessonEarnings =
  FinancialCalculationService.calculateLessonEarnings;
