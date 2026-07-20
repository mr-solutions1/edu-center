import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const registrationFormSchema = z.object({
  subject: z.string().min(2, 'المادة الدراسية مطلوبة'),
  purchasedHours: z.coerce.number().min(1, 'عدد الساعات يجب أن يكون 1 على الأقل'),
  pricePerHour: z.coerce.number().min(0, 'سعر الساعة يجب أن يكون 0 أو أكثر'),
  teacherId: z.string().nullable().optional(),
  day1: z.string().nullable().optional(),
  from1: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صالح (HH:mm)').nullable().optional().or(z.literal('')),
  to1: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صالح (HH:mm)').nullable().optional().or(z.literal('')),
  day2: z.string().nullable().optional(),
  from2: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صالح (HH:mm)').nullable().optional().or(z.literal('')),
  to2: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صالح (HH:mm)').nullable().optional().or(z.literal('')),
  notes: z.string().optional(),
});

const RegistrationFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  teachers = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      subject: '',
      purchasedHours: 10,
      pricePerHour: 10,
      teacherId: '',
      day1: 'Sunday',
      from1: '14:00',
      to1: '16:00',
      day2: '',
      from2: '',
      to2: '',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        subject: '',
        purchasedHours: 10,
        pricePerHour: 10,
        teacherId: '',
        day1: 'Sunday',
        from1: '14:00',
        to1: '16:00',
        day2: '',
        from2: '',
        to2: '',
        notes: '',
      });
    }
  }, [open, reset]);

  const onFormSubmit = (data) => {
    // Sanitize optional fields to null if empty
    const sanitized = {
      ...data,
      teacherId: data.teacherId || null,
      day1: data.day1 || null,
      from1: data.from1 || null,
      to1: data.to1 || null,
      day2: data.day2 || null,
      from2: data.from2 || null,
      to2: data.to2 || null,
    };
    onSubmit(sanitized);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="شراء حزمة ساعات / تسجيل مادة جديدة"
      description="يرجى إدخال تفاصيل التسجيل والجدول الدراسي الأسبوعي."
      saveText="تسجيل"
      isSubmitting={isSubmitting}
      formId="registration-form"
    >
      <form
        id="registration-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4 max-h-[65vh] overflow-y-auto px-1 text-right"
        dir="rtl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subject">المادة الدراسية</Label>
            <Input id="subject" {...register('subject')} error={errors.subject?.message} />
            {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacherId">المعلم</Label>
            <select
              id="teacherId"
              {...register('teacherId')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">اختر معلماً...</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.userId?.firstName} {t.userId?.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasedHours">عدد الساعات المشتراة</Label>
            <Input id="purchasedHours" type="number" {...register('purchasedHours')} />
            {errors.purchasedHours && <p className="text-xs text-red-500">{errors.purchasedHours.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricePerHour">سعر الساعة (KD)</Label>
            <Input id="pricePerHour" type="number" step="0.001" {...register('pricePerHour')} />
            {errors.pricePerHour && <p className="text-xs text-red-500">{errors.pricePerHour.message}</p>}
          </div>
        </div>

        <div className="border-t pt-2 mt-4">
          <h4 className="font-semibold text-sm mb-2 text-primary">الموعد الأول (رئيسي)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="day1" className="text-xs">اليوم</Label>
              <select id="day1" {...register('day1')} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
                <option value="Saturday">السبت</option>
                <option value="Sunday">الأحد</option>
                <option value="Monday">الإثنين</option>
                <option value="Tuesday">الثلاثاء</option>
                <option value="Wednesday">الأربعاء</option>
                <option value="Thursday">الخميس</option>
                <option value="Friday">الجمعة</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="from1" className="text-xs">من (HH:mm)</Label>
              <Input id="from1" placeholder="14:00" {...register('from1')} className="h-8 text-xs" />
              {errors.from1 && <p className="text-[10px] text-red-500">{errors.from1.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="to1" className="text-xs">إلى (HH:mm)</Label>
              <Input id="to1" placeholder="16:00" {...register('to1')} className="h-8 text-xs" />
              {errors.to1 && <p className="text-[10px] text-red-500">{errors.to1.message}</p>}
            </div>
          </div>
        </div>

        <div className="border-t pt-2">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground">الموعد الثاني (اختياري)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="day2" className="text-xs">اليوم</Label>
              <select id="day2" {...register('day2')} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
                <option value="">لا يوجد</option>
                <option value="Saturday">السبت</option>
                <option value="Sunday">الأحد</option>
                <option value="Monday">الإثنين</option>
                <option value="Tuesday">الثلاثاء</option>
                <option value="Wednesday">الأربعاء</option>
                <option value="Thursday">الخميس</option>
                <option value="Friday">الجمعة</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="from2" className="text-xs">من (HH:mm)</Label>
              <Input id="from2" placeholder="14:00" {...register('from2')} className="h-8 text-xs" />
              {errors.from2 && <p className="text-[10px] text-red-500">{errors.from2.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="to2" className="text-xs">إلى (HH:mm)</Label>
              <Input id="to2" placeholder="16:00" {...register('to2')} className="h-8 text-xs" />
              {errors.to2 && <p className="text-[10px] text-red-500">{errors.to2.message}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Input id="notes" {...register('notes')} />
        </div>
      </form>
    </FormDialog>
  );
};

export default RegistrationFormDialog;
