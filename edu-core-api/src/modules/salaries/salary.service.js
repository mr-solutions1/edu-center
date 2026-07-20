import TeacherSalary from './teacherSalary.model.js';
import { CompensationType } from '../../shared/constants/enums.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import { toFils } from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';
import Teacher from '../teachers/teacher.model.js';

export const createSalary = async (salaryData) => {
  return withTransaction(async (session) => {
    const teacher = await Teacher.findById(salaryData.teacherId).session(
      session
    );
    if (!teacher) {
      throw new NotFoundError('المعلم غير موجود');
    }

    // Enforce reconciliation: reject Salaries entry for PER_LESSON teachers
    if (teacher.compensationType === CompensationType.PER_LESSON) {
      throw new ValidationError(
        'لا يمكن إضافة سجل راتب يدوي لمعلم بنظام العمولة (حسب الحصة). يرجى تغيير نظام التعويض في ملف المعلم أولاً.'
      );
    }

    const data = { ...salaryData };
    const fieldsToConvert = [
      'hourlyRate',
      'transportationAllowance',
      'bonuses',
      'deductions',
      'totalSalary',
    ];
    fieldsToConvert.forEach((field) => {
      if (data[field] !== undefined) {
        data[field] = toFils(data[field]);
      }
    });

    // Mirror frontend calculation on backend to ensure consistency
    const calculatedTotal = Math.max(
      0,
      (data.hoursWorked || 0) * (data.hourlyRate || 0) +
        (data.bonuses || 0) +
        (data.transportationAllowance || 0) -
        (data.deductions || 0)
    );
    data.totalSalary = calculatedTotal;

    const [salary] = await TeacherSalary.create([data], { session });
    return salary;
  });
};

export const getAllSalaries = async (query = {}) => {
  const { teacherId, month, year } = query;
  const filter = {};
  if (teacherId) {
    filter.teacherId = teacherId;
  }
  if (month) {
    filter.month = Number(month);
  }
  if (year) {
    filter.year = Number(year);
  }

  return TeacherSalary.find(filter)
    .populate('teacherId')
    .sort({ year: -1, month: -1 });
};

export const updateSalary = async (id, updateData) => {
  const data = { ...updateData };
  const fieldsToConvert = [
    'hourlyRate',
    'transportationAllowance',
    'bonuses',
    'deductions',
    'totalSalary',
  ];
  fieldsToConvert.forEach((field) => {
    if (data[field] !== undefined) {
      data[field] = toFils(data[field]);
    }
  });

  const current = await TeacherSalary.findById(id);
  if (!current) {
    throw new NotFoundError('سجل الراتب غير موجود');
  }

  // Merge with existing fields if some are not provided in partial update
  const merged = {
    hoursWorked: data.hoursWorked !== undefined ? data.hoursWorked : current.hoursWorked,
    hourlyRate: data.hourlyRate !== undefined ? data.hourlyRate : current.hourlyRate,
    bonuses: data.bonuses !== undefined ? data.bonuses : current.bonuses,
    transportationAllowance: data.transportationAllowance !== undefined ? data.transportationAllowance : current.transportationAllowance,
    deductions: data.deductions !== undefined ? data.deductions : current.deductions,
  };

  // Mirror frontend calculation on backend to ensure consistency
  const calculatedTotal = Math.max(
    0,
    (merged.hoursWorked || 0) * (merged.hourlyRate || 0) +
      (merged.bonuses || 0) +
      (merged.transportationAllowance || 0) -
      (merged.deductions || 0)
  );
  data.totalSalary = calculatedTotal;

  const salary = await TeacherSalary.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!salary) {
    throw new NotFoundError('سجل الراتب غير موجود');
  }
  return salary;
};

export const deleteSalary = async (id) => {
  const salary = await TeacherSalary.findByIdAndDelete(id);
  if (!salary) {
    throw new NotFoundError('سجل الراتب غير موجود');
  }
  return salary;
};
