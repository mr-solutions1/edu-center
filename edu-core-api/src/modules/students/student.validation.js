import { z } from 'zod';

import {
  EducationalLevels,
  Gender,
  StudentStatus,
} from '../../shared/constants/enums.js';

export const studentSchema = z.object({
  parentName: z
    .string({ required_error: 'اسم ولي الأمر مطلوب' })
    .min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  parentPhone: z
    .string({ required_error: 'رقم الهاتف مطلوب' })
    .regex(/^[0-9+]{8,15}$/, 'رقم الهاتف غير صالح'),
  whatsapp: z.string().optional(),
  area: z.string().optional(),
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
  notes: z.string().optional(),
});
