import { z } from 'zod';

import {
  EducationalLevels,
  Gender,
  StudentStatus,
} from '../../shared/constants/enums.js';

export const studentSchema = z.object({
  studentName: z
    .string({ required_error: 'اسم الطالب مطلوب' })
    .min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  studentPhone: z.string().optional().or(z.literal('')),
  parentName: z
    .string({ required_error: 'اسم ولي الأمر مطلوب' })
    .min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  parentPhone: z
    .string({ required_error: 'رقم الهاتف مطلوب' })
    .regex(/^[0-9+]{8,15}$/, 'رقم الهاتف غير صالح'),
  whatsapp: z.string().optional(),
  governorate: z.string({ required_error: 'المحافظة مطلوبة' }),
  area: z.string({ required_error: 'المنطقة مطلوبة' }),
  address: z.string({ required_error: 'العنوان مطلوب' }),
  googleMapsUrl: z
    .string()
    .url('رابط جوجل ماب غير صالح')
    .optional()
    .or(z.literal('')),
  school: z.string().optional(),
  grade: z.enum(EducationalLevels, {
    required_error: 'المرحلة الدراسية مطلوبة',
  }),
  classYear: z.string({ required_error: 'الصف مطلوب' }),
  curriculum: z.string({ required_error: 'المنهج مطلوب' }),
  subjects: z.array(z.string()).optional(),
  preferredTeacherGender: z.nativeEnum(Gender).optional(),
  preferredSchedule: z.string().optional(),
  notes: z.string().optional(),
  dateOfBirth: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  enrollmentDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  status: z.nativeEnum(StudentStatus).optional(),
  monthlyFee: z.number().min(0).optional(),
  userId: z.string().optional(),
  siblingGroup: z.string().optional().nullable(),
  // Combined Optional Registration Fields
  subject: z.string().optional().or(z.literal('')),
  purchasedHours: z.coerce.number().min(0).optional(),
  pricePerHour: z.coerce.number().min(0).optional(),
  teacherPercentageSnapshot: z.coerce.number().min(0).max(100).optional(),
  teacherId: z.string().nullable().optional().or(z.literal('')),
  day1: z.string().nullable().optional().or(z.literal('')),
  from1: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت البداية 1 غير صالح')
    .nullable()
    .optional()
    .or(z.literal('')),
  to1: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت النهاية 1 غير صالح')
    .nullable()
    .optional()
    .or(z.literal('')),
  day2: z.string().nullable().optional().or(z.literal('')),
  from2: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت البداية 2 غير صالح')
    .nullable()
    .optional()
    .or(z.literal('')),
  to2: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت النهاية 2 غير صالح')
    .nullable()
    .optional()
    .or(z.literal('')),
  // Combined Optional Initial Payment Fields
  initialPaidAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.string().optional().or(z.literal('')),
  priceOverrideReason: z.string().optional().or(z.literal('')),
  isInstallment: z.string().optional().or(z.literal('')),
  installments: z.array(z.object({
    amount: z.coerce.number().min(0).optional(),
    dueDate: z.string().optional().or(z.literal('')),
  })).optional(),
  academicRegistrations: z.array(z.object({
    subject: z.string().optional().or(z.literal('')),
    purchasedHours: z.coerce.number().min(0).optional(),
    pricePerHour: z.coerce.number().min(0).optional(),
    teacherPercentageSnapshot: z.coerce.number().min(0).max(100).optional(),
    teacherId: z.string().nullable().optional().or(z.literal('')),
    day1: z.string().nullable().optional().or(z.literal('')),
    from1: z.string().nullable().optional().or(z.literal('')),
    to1: z.string().nullable().optional().or(z.literal('')),
    day2: z.string().nullable().optional().or(z.literal('')),
    from2: z.string().nullable().optional().or(z.literal('')),
    to2: z.string().nullable().optional().or(z.literal('')),
    day3: z.string().nullable().optional().or(z.literal('')),
    from3: z.string().nullable().optional().or(z.literal('')),
    to3: z.string().nullable().optional().or(z.literal('')),
  })).optional(),
});

export const updateStudentSchema = studentSchema.partial();

export const registrationSchema = z.object({
  subject: z.string({ required_error: 'المادة الدراسية مطلوبة' }),
  purchasedHours: z
    .number({ required_error: 'عدد الساعات مطلوب' })
    .min(1, 'يجب شراء ساعة واحدة على الأقل'),
  pricePerHour: z
    .number({ required_error: 'سعر الساعة مطلوب' })
    .min(0, 'سعر الساعة لا يمكن أن يكون سالباً'),
  teacherId: z.string().nullable().optional(),
  day1: z.string().nullable().optional(),
  from1: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت البداية 1 غير صالح')
    .nullable()
    .optional(),
  to1: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت النهاية 1 غير صالح')
    .nullable()
    .optional(),
  day2: z.string().nullable().optional(),
  from2: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت البداية 2 غير صالح')
    .nullable()
    .optional(),
  to2: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'توقيت النهاية 2 غير صالح')
    .nullable()
    .optional(),
  notes: z.string().optional(),
});
