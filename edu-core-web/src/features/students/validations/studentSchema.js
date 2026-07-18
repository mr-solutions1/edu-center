import { z } from 'zod';

export const studentSchema = z.object({
  parentName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  parentPhone: z.string().regex(/^[0-9+]{8,15}$/, 'رقم الهاتف غير صالح'),
  siblingGroup: z.string().optional(),
  whatsapp: z.string().optional(),
  area: z.string().optional(),
  address: z.string().min(1, 'العنوان مطلوب'),
  googleMapsUrl: z
    .string()
    .url('رابط جوجل ماب غير صالح')
    .optional()
    .or(z.literal('')),
  school: z.string().optional(),
  grade: z.string().min(1, 'المرحلة الدراسية مطلوبة'),
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
});
