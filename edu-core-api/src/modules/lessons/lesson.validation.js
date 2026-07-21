import { z } from 'zod';

import { WeekDays } from '../../shared/constants/enums.js';

export const lessonSchema = z.object({
  studentId: z.string({ required_error: 'الطالب مطلوب' }),
  teacherId: z.string({ required_error: 'المعلم مطلوب' }),
  title: z.string({ required_error: 'الموضوع مطلوب' }).trim(),
  description: z.string().optional(),
  dayOfWeek: z.nativeEnum(WeekDays, { required_error: 'اليوم مطلوب' }),
  lessonDate: z
    .string({ required_error: 'التاريخ مطلوب' })
    .transform((val) => new Date(val)),
  startTime: z
    .string({ required_error: 'وقت البدء مطلوب' })
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صحيح (HH:mm)'),
  endTime: z
    .string({ required_error: 'وقت الانتهاء مطلوب' })
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صحيح (HH:mm)'),
  lessonPrice: z.number({ required_error: 'السعر مطلوب' }).min(0),
  educationalLevel: z.string().optional(),
  notes: z.string().optional(),
  registrationId: z.string().optional(),
  subject: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], {
    required_error: 'الحالة مطلوبة',
  }),
  notes: z.string().optional(),
});
