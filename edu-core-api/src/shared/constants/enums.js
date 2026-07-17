export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  RECEPTIONIST: 'RECEPTIONIST',
  TEACHER: 'TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
};

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
};

export const StudentStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  WITHDRAWN: 'WITHDRAWN',
};

export const LessonStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
};

export const PaymentStatus = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
};

export const CommissionModel = {
  SEVENTY_THIRTY: 'SEVENTY_THIRTY',
  SIXTYFIVE_THIRTYFIVE: 'SIXTYFIVE_THIRTYFIVE',
};

export const WeekDays = {
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
};

export const EducationalLevels = [
  'تأسيس',
  'ابتدائي',
  'متوسط',
  'ثانوي',
  'جامعي',
  'قدرات',
  'تحصيلي',
];

export const PayrollAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  RECALCULATE: 'RECALCULATE',
};

export const CompensationType = {
  PER_LESSON: 'PER_LESSON',
  HOURLY: 'HOURLY',
};
