import { z } from 'zod';

export const ledgerEntrySchema = z.object({
  studentId: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
  amount: z.number().min(0, 'المبلغ لا يمكن أن يكون سالباً'),
  type: z.enum(
    [
      'STUDENT_PAYMENT',
      'TEACHER_PAYMENT',
      'EXPENSE',
      'PACKAGE_PURCHASE',
      'REFUND',
      'MANUAL_ADJUSTMENT',
      'TRANSPORT_DEDUCTION',
    ],
    { required_error: 'نوع الحركة المالية مطلوب' }
  ),
  direction: z.enum(['IN', 'OUT'], {
    required_error: 'اتجاه الحركة المالية مطلوب',
  }),
  referenceId: z.string({ required_error: 'معرف المرجع مطلوب' }),
  referenceModel: z.enum(
    [
      'StudentRegistration',
      'Payment',
      'Lesson',
      'PayrollRecord',
      'TeacherSalary',
      'Expense',
      'ManualAdjustment',
    ],
    { required_error: 'نموذج المرجع مطلوب' }
  ),
  description: z
    .string({ required_error: 'الوصف مطلوب' })
    .min(1, 'الوصف مطلوب'),
  transactionDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  notes: z.string().optional(),
});

export const ledgerQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  type: z.string().optional(),
  direction: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  studentId: z.string().optional(),
  teacherId: z.string().optional(),
});

export const createTransactionSchema = z
  .object({
    date: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : new Date())),
    type: z.enum(['STUDENT_PAYMENT', 'TEACHER_PAYMENT', 'EXPENSE']),
    name: z.string().optional(),
    expenseItem: z.string().optional(),
    amount: z.number().positive('المبلغ يجب أن يكون أكبر من الصفر'),
    paymentMethod: z.string().default('CASH'),
    reference: z.string().optional(),
    notes: z.string().optional(),
    studentId: z.string().nullable().optional(),
    teacherId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.type === 'STUDENT_PAYMENT' || data.type === 'TEACHER_PAYMENT') &&
      !data.name
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'الاسم مطلوب لعمليات الدفع والصرف',
      });
    }
    if (data.type === 'EXPENSE' && !data.expenseItem) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expenseItem'],
        message: 'بند المصروف مطلوب لتسجيل المصاريف',
      });
    }
  });
