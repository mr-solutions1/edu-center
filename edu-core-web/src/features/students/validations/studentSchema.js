import { z } from 'zod';

export const studentSchema = z.object({
  studentName: z.string().min(2, 'اسم الطالب يجب أن يكون حرفين على الأقل'),
  studentPhone: z.string().optional().or(z.literal('')),
  parentName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  parentPhone: z.string().regex(/^[0-9+]{8,15}$/, 'رقم الهاتف غير صالح'),
  siblingGroup: z.string().optional().nullable(),
  whatsapp: z.string().optional(),
  governorate: z.string().min(1, 'المحافظة مطلوبة'),
  area: z.string().min(1, 'المنطقة مطلوبة'),
  address: z.string().min(1, 'العنوان مطلوب'),
  googleMapsUrl: z
    .string()
    .url('رابط جوجل ماب غير صالح')
    .optional()
    .or(z.literal('')),
  school: z.string().optional(),
  grade: z.string().min(1, 'المرحلة الدراسية مطلوبة'),
  classYear: z.string().min(1, 'الصف مطلوب'),
  curriculum: z.string().min(1, 'المنهج مطلوب'),
  subjects: z.array(z.string()).optional().default([]),
  preferredTeacherGender: z.enum(['MALE', 'FEMALE']).optional(),
  preferredSchedule: z.string().optional(),
  notes: z.string().optional(),
  dateOfBirth: z.string().optional(),
  enrollmentDate: z.string().optional(),
  monthlyFee: z.coerce
    .number()
    .min(0, 'المبلغ يجب أن يكون 0 أو أكثر')
    .default(0),

  // Unified unifiedPhone field used on Frontend
  unifiedPhone: z.string().regex(/^[0-9+]{8,15}$/, 'رقم الهاتف الموحد غير صالح').optional().or(z.literal('')),

  // Registration options
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

  // Payment Options
  initialPaidAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.string().optional().or(z.literal('')),
  priceOverrideReason: z.string().optional().or(z.literal('')),
  isInstallment: z.string().optional().or(z.literal('')),
  installments: z.array(z.object({
    amount: z.coerce.number().min(0).optional(),
    dueDate: z.string().optional().or(z.literal('')),
  })).optional(),

  // Academic registrations array list
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
