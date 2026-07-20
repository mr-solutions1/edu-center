import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const transactionFormSchema = z.object({
  type: z.enum(['STUDENT_PAYMENT', 'TEACHER_PAYMENT', 'EXPENSE']),
  name: z.string().optional(),
  expenseItem: z.string().optional(),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من الصفر'),
  paymentMethod: z.string().default('CASH'),
  reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  studentId: z.string().optional().or(z.literal('')),
  teacherId: z.string().optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if ((data.type === 'STUDENT_PAYMENT' || data.type === 'TEACHER_PAYMENT') && !data.name) {
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

const TransactionFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  students = [],
  teachers = [],
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'STUDENT_PAYMENT',
      name: '',
      expenseItem: '',
      amount: '',
      paymentMethod: 'CASH',
      reference: '',
      notes: '',
      studentId: '',
      teacherId: '',
      date: new Date().toISOString().substring(0, 10),
    },
  });

  const transactionType = useWatch({ control, name: 'type' });

  React.useEffect(() => {
    if (open) {
      reset({
        type: 'STUDENT_PAYMENT',
        name: '',
        expenseItem: '',
        amount: '',
        paymentMethod: 'CASH',
        reference: '',
        notes: '',
        studentId: '',
        teacherId: '',
        date: new Date().toISOString().substring(0, 10),
      });
    }
  }, [open, reset]);

  const onFormSubmit = (data) => {
    // Sanitize optional references to null if empty
    const sanitized = {
      ...data,
      studentId: data.type === 'STUDENT_PAYMENT' && data.studentId ? data.studentId : null,
      teacherId: data.type === 'TEACHER_PAYMENT' && data.teacherId ? data.teacherId : null,
      expenseItem: data.type === 'EXPENSE' ? data.expenseItem : null,
      name: data.type !== 'EXPENSE' ? data.name : null,
    };
    onSubmit(sanitized);
  };

  const handleStudentSelect = (e) => {
    const studentId = e.target.value;
    const selected = students.find((s) => s._id === studentId);
    if (selected) {
      setValue('name', selected.parentName);
    }
  };

  const handleTeacherSelect = (e) => {
    const teacherId = e.target.value;
    const selected = teachers.find((t) => t._id === teacherId);
    if (selected) {
      setValue('name', `${selected.userId?.firstName} ${selected.userId?.lastName}`);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="تسجيل حركة مالية جديدة"
      description="يرجى ملء تفاصيل الحركة المالية. سيتم ترحيل وتوثيق الحركة في دفتر الأستاذ الموحد."
      saveText="تسجيل المعاملة"
      isSubmitting={isSubmitting}
      formId="transaction-form"
    >
      <form
        id="transaction-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4 max-h-[60vh] overflow-y-auto px-1 text-right"
        dir="rtl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">نوع المعاملة</Label>
            <select
              id="type"
              {...register('type')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="STUDENT_PAYMENT">دفعة طالب (وارد)</option>
              <option value="TEACHER_PAYMENT">صرف مستحقات معلم (صادر)</option>
              <option value="EXPENSE">مصروفات الأكاديمية (صادر)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">تاريخ المعاملة</Label>
            <Input id="date" type="date" {...register('date')} />
          </div>
        </div>

        {/* Dynamic Selection Based on Transaction Type */}
        {transactionType === 'STUDENT_PAYMENT' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">اختر الطالب</Label>
              <select
                id="studentId"
                {...register('studentId')}
                onChange={handleStudentSelect}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
              >
                <option value="">اختر طالباً...</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.parentName} ({s.studentCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">اسم الطالب الفعلي</Label>
              <Input id="name" {...register('name')} error={errors.name?.message} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
          </div>
        )}

        {transactionType === 'TEACHER_PAYMENT' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacherId">اختر المعلم</Label>
              <select
                id="teacherId"
                {...register('teacherId')}
                onChange={handleTeacherSelect}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
              >
                <option value="">اختر معلماً...</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.userId?.firstName} {t.userId?.lastName} ({t.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">اسم المعلم الفعلي</Label>
              <Input id="name" {...register('name')} error={errors.name?.message} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
          </div>
        )}

        {transactionType === 'EXPENSE' && (
          <div className="space-y-2">
            <Label htmlFor="expenseItem">بند المصروف</Label>
            <Input id="expenseItem" placeholder="مثال: إيجار المقر، فواتير إنترنت..." {...register('expenseItem')} error={errors.expenseItem?.message} />
            {errors.expenseItem && <p className="text-xs text-red-500">{errors.expenseItem.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ (KD)</Label>
            <Input id="amount" type="number" step="0.001" {...register('amount')} error={errors.amount?.message} />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">طريقة الدفع</Label>
            <select
              id="paymentMethod"
              {...register('paymentMethod')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
            >
              <option value="CASH">نقداً (Cash)</option>
              <option value="K-NET">كي نت (K-Net)</option>
              <option value="TRANSFER">تحويل بنكي</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">رقم المرجع / العملية</Label>
          <Input id="reference" placeholder="مثال: رقم الكوبون، مرجع التحويل..." {...register('reference')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات وبيان إضافي</Label>
          <Input id="notes" {...register('notes')} />
        </div>
      </form>
    </FormDialog>
  );
};

export default TransactionFormDialog;
