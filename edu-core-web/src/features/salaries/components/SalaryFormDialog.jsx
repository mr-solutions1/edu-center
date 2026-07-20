import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { teacherApi } from '@/features/teachers/services/teacherApi';
import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toKWD } from '@/shared/utils/money';

const salarySchema = z.object({
  teacherId: z.string().min(1, 'يجب تحديد المعلم'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
  hoursWorked: z.coerce.number().min(0).default(0),
  hourlyRate: z.coerce.number().min(0).default(0),
  transportationAllowance: z.coerce.number().min(0).default(0),
  bonuses: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
  totalSalary: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const SalaryFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(salarySchema),
    defaultValues: initialData || {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      hoursWorked: 0,
      hourlyRate: 0,
      totalSalary: 0,
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
    enabled: open,
  });

  const hours = watch('hoursWorked');
  const rate = watch('hourlyRate');
  const bonuses = watch('bonuses') || 0;
  const deductions = watch('deductions') || 0;
  const transport = watch('transportationAllowance') || 0;

  React.useEffect(() => {
    const parseAmount = (val) => {
      const p = parseFloat(val);
      return isNaN(p) ? 0 : p;
    };
    const calc =
      parseAmount(hours) * parseAmount(rate) +
      parseAmount(bonuses) +
      parseAmount(transport) -
      parseAmount(deductions);
    // Standardize to 3 decimal places to eliminate floating point issues
    const rounded = Math.round(calc * 1000) / 1000;
    setValue('totalSalary', Math.max(0, rounded));
  }, [hours, rate, bonuses, deductions, transport, setValue]);

  React.useEffect(() => {
    if (open) {
      const data = { ...initialData };
      const fieldsToConvert = [
        'hourlyRate',
        'transportationAllowance',
        'bonuses',
        'deductions',
        'totalSalary',
      ];
      fieldsToConvert.forEach((field) => {
        if (data[field] !== undefined) {
          data[field] = toKWD(data[field]);
        }
      });
      reset(data);
    }
  }, [open, reset, initialData]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialData ? 'تعديل سجل راتب' : 'إدخال راتب جديد'}
      saveText={initialData ? 'تحديث' : 'حفظ'}
      isSubmitting={isSubmitting}
      formId="salary-form"
    >
      <form
        id="salary-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 text-right max-h-[60vh] overflow-y-auto px-1"
      >
        <div className="space-y-2">
          <Label htmlFor="teacherId">المعلم</Label>
          <select
            id="teacherId"
            {...register('teacherId')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">اختر المعلم...</option>
            {teachers?.data
              ?.filter((t) => t.compensationType === 'HOURLY')
              .map((t) => (
                <option key={t._id} value={t._id}>
                  {t.userId?.firstName} {t.userId?.lastName}
                </option>
              ))}
          </select>
          {errors.teacherId && (
            <p className="text-xs text-red-500">{errors.teacherId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="month">الشهر</Label>
            <Input id="month" type="number" {...register('month')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">السنة</Label>
            <Input id="year" type="number" {...register('year')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="hoursWorked">ساعات العمل</Label>
            <Input
              id="hoursWorked"
              type="number"
              step="0.5"
              {...register('hoursWorked')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">الأجر بالساعة</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.001"
              {...register('hourlyRate')}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label htmlFor="bonuses">مكافآت</Label>
            <Input id="bonuses" type="number" step="0.001" {...register('bonuses')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transportationAllowance">بدل نقل</Label>
            <Input
              id="transportationAllowance"
              type="number"
              step="0.001"
              {...register('transportationAllowance')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deductions">خصومات</Label>
            <Input id="deductions" type="number" step="0.001" {...register('deductions')} />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="totalSalary" className="text-lg font-bold">
            إجمالي الراتب (KD)
          </Label>
          <Input
            id="totalSalary"
            type="number"
            step="0.001"
            {...register('totalSalary')}
            className="bg-muted font-bold text-lg"
            readOnly
          />
        </div>
      </form>
    </FormDialog>
  );
};

export default SalaryFormDialog;
