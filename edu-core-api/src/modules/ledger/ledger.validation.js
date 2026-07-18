import { z } from 'zod';

export const ledgerEntrySchema = z.object({
  studentId: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
  amount: z.number().min(0, 'المبلغ لا يمكن أن يكون سالباً'),
  type: z.enum([
    'STUDENT_PAYMENT',
    'TEACHER_PAYMENT',
    'EXPENSE',
    'PACKAGE_PURCHASE',
    'REFUND',
    'MANUAL_ADJUSTMENT',
    'TRANSPORT_DEDUCTION',
  ], { required_error: 'نوع الحركة المالية مطلوب' }),
  direction: z.enum(['IN', 'OUT'], { required_error: 'اتجاه الحركة المالية مطلوب' }),
  referenceId: z.string({ required_error: 'معرف المرجع مطلوب' }),
  referenceModel: z.enum([
    'StudentRegistration',
    'Payment',
    'Lesson',
    'PayrollRecord',
    'TeacherSalary',
    'Expense',
    'ManualAdjustment',
  ], { required_error: 'نموذج المرجع مطلوب' }),
  description: z.string({ required_error: 'الوصف مطلوب' }).min(1, 'الوصف مطلوب'),
  transactionDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  notes: z.string().optional(),
});

export const ledgerQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  type: z.string().optional(),
  direction: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  studentId: z.string().optional(),
  teacherId: z.string().optional(),
});
