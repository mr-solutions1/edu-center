import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import AvailabilityPicker from './AvailabilityPicker';

import FormDialog from '@/shared/components/FormDialog/FormDialog';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { CommissionModel, Gender } from '@/shared/constants/enums';
import { toKWD } from '@/shared/utils/money';

const teacherSchema = z.object({
  userId: z
    .string()
    .min(1, 'المستخدم مطلوب')
    .regex(/^[0-9a-fA-F]{24}$/, 'رقم المستخدم غير صالح (يجب أن يكون معرفاً من 24 حرفاً)'),
  whatsapp: z.string().optional(),
  civilId: z.string().optional(),
  department: z.string().optional(),
  gender: z.nativeEnum(Gender).optional().default(Gender.MALE),
  hourlyRate: z.coerce.number().min(0).optional().default(0),
  commissionModel: z.nativeEnum(CommissionModel).optional().default(CommissionModel.SEVENTY_THIRTY),
  teacherPercentage: z.coerce.number().min(0).max(1).optional().default(0.7),
  institutePercentage: z.coerce.number().min(0).max(1).optional().default(0.3),
  availability: z
    .object({
      days: z.array(z.string()).default([]),
      slots: z
        .array(
          z.object({
            start: z.string(),
            end: z.string(),
          })
        )
        .default([]),
    })
    .default({ days: [], slots: [] }),
});

const TeacherFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting,
  error,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(teacherSchema),
    defaultValues: initialData || {
      userId: '',
      gender: Gender.MALE,
      hourlyRate: 0,
      commissionModel: CommissionModel.SEVENTY_THIRTY,
      teacherPercentage: 0.7,
      institutePercentage: 0.3,
      availability: { days: [], slots: [] },
    },
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        const data = { ...initialData };
        if (data.hourlyRate !== undefined) {
          data.hourlyRate = toKWD(data.hourlyRate);
        }
        reset(data);
      } else {
        reset({
          userId: '',
          gender: Gender.MALE,
          hourlyRate: 0,
          commissionModel: CommissionModel.SEVENTY_THIRTY,
          teacherPercentage: 0.7,
          institutePercentage: 0.3,
          availability: { days: [], slots: [] },
        });
      }
    }
  }, [open, reset, initialData]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialData ? 'تعديل بيانات معلم' : 'إضافة معلم جديد'}
      saveText={initialData ? 'تحديث' : 'إضافة'}
      isSubmitting={isSubmitting}
      formId="teacher-form"
    >
      <form
        id="teacher-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 max-h-[60vh] overflow-y-auto px-1 text-right"
      >
        {error && (
          <ErrorAlert
            title={error.parsed?.title || 'خطأ في حفظ البيانات'}
            message={error.parsed?.message}
            details={error.parsed?.details}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="userId">رقم المستخدم (ID)</Label>
          <Input
            id="userId"
            {...register('userId')}
            placeholder="انسخ ID المستخدم من قائمة المستخدمين"
          />
          {errors.userId && (
            <p className="text-xs text-red-500">{errors.userId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">واتساب</Label>
            <Input id="whatsapp" {...register('whatsapp')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">القسم</Label>
            <Input id="department" {...register('department')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">الأجر بالساعة (KD)</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.5"
              {...register('hourlyRate')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">الجنس</Label>
            <select
              id="gender"
              {...register('gender')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value={Gender.MALE}>ذكر</option>
              <option value={Gender.FEMALE}>أنثى</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>التوفر (Availability)</Label>
          <Controller
            control={control}
            name="availability"
            render={({ field }) => (
              <AvailabilityPicker
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </form>
    </FormDialog>
  );
};

export default TeacherFormDialog;
