import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import AvailabilityPicker from './AvailabilityPicker';

import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { CommissionModel, Gender } from '@/shared/constants/enums';
import { toKWD } from '@/shared/utils/money';

const teacherSchema = z.object({
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'رقم المستخدم غير صالح')
    .optional()
    .or(z.literal('')),
  firstName: z.string().min(1, 'الاسم الأول مطلوب'),
  lastName: z.string().min(1, 'الاسم الأخير مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صالح').min(1, 'البريد الإلكتروني مطلوب'),
  phone: z.string().regex(/^[0-9+]{8,15}$/, 'رقم الهاتف غير صالح').min(1, 'رقم الهاتف مطلوب'),
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
  serverErrors,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setError,
  } = useForm({
    resolver: zodResolver(teacherSchema),
    defaultValues: initialData || {
      userId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
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
        // Map user profile fields for editing
        data.firstName = initialData.userId?.firstName || '';
        data.lastName = initialData.userId?.lastName || '';
        data.email = initialData.userId?.email || '';
        data.phone = initialData.userId?.phone || '';
        reset(data);
      } else {
        reset({
          userId: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
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

  React.useEffect(() => {
    if (serverErrors) {
      if (Array.isArray(serverErrors)) {
        serverErrors.forEach((err) => {
          if (err.field) {
            setError(err.field, { type: 'server', message: err.message });
          }
        });
      } else if (typeof serverErrors === 'object') {
        Object.entries(serverErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: typeof msg === 'string' ? msg : msg?.message });
        });
      }
    }
  }, [serverErrors, setError]);

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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">الاسم الأول للمعلم</Label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder="مثال: أحمد"
            />
            {errors.firstName && (
              <p className="text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">الاسم الأخير للمعلم</Label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder="مثال: الكندري"
            />
            {errors.lastName && (
              <p className="text-xs text-red-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني (لتسجيل الدخول)</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="teacher@rakan.com"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف (كلمة المرور الافتراضية)</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="99999999"
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>
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
              step="0.001"
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
