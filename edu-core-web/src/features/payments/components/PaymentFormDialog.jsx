import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { studentApi } from '@/features/students/services/studentApi';
import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { PaymentStatus } from '@/shared/constants/enums';
import { toKWD } from '@/shared/utils/money';

const paymentSchema = z.object({
  studentId: z.string().min(1, 'يجب تحديد الطالب'),
  amount: z.coerce.number().min(0, 'المبلغ يجب أن يكون 0 أو أكثر'),
  status: z.nativeEnum(PaymentStatus),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

const PaymentFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: initialData || {
      amount: 0,
      status: PaymentStatus.PENDING,
      paymentMethod: 'CASH',
    },
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentApi.getAllStudents({ limit: 100 }),
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      const data = { ...initialData };
      if (data.amount !== undefined) {
        data.amount = toKWD(data.amount);
      }
      reset(data);
    }
  }, [open, reset, initialData]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialData ? 'تعديل دفعة' : 'تسجيل دفعة جديدة'}
      saveText={initialData ? 'تحديث' : 'تسجيل'}
      isSubmitting={isSubmitting}
      formId="payment-form"
    >
      <form
        id="payment-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 text-right"
      >
        <div className="space-y-2">
          <Label htmlFor="studentId">الطالب</Label>
          <select
            id="studentId"
            {...register('studentId')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">اختر الطالب...</option>
            {students?.data?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.parentName} ({s.studentCode})
              </option>
            ))}
          </select>
          {errors.studentId && (
            <p className="text-xs text-red-500">{errors.studentId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ (KD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              {...register('amount')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">الحالة</Label>
            <select
              id="status"
              {...register('status')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.values(PaymentStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">طريقة الدفع</Label>
          <Input
            id="paymentMethod"
            {...register('paymentMethod')}
            placeholder="مثال: نقداً، كي-نت، تحويل"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Input id="notes" {...register('notes')} />
        </div>
      </form>
    </FormDialog>
  );
};

export default PaymentFormDialog;
