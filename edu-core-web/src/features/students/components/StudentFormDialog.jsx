import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';

import { studentSchema } from '../validations/studentSchema';

import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toKWD } from '@/shared/utils/money';

const StudentFormDialog = ({
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
    resolver: zodResolver(studentSchema),
    defaultValues: initialData || {
      parentName: '',
      parentPhone: '',
      siblingGroup: '',
      whatsapp: '',
      area: '',
      address: '',
      googleMapsUrl: '',
      school: '',
      grade: 'ابتدائي',
      subjects: [],
      monthlyFee: 0,
    },
  });

  React.useEffect(() => {
    if (open) {
      const data = { ...initialData };
      if (data.monthlyFee !== undefined) {
        data.monthlyFee = toKWD(data.monthlyFee);
      }
      reset(data);
    }
  }, [open, reset, initialData]);

  const onFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialData ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'}
      description="يرجى ملء النموذج أدناه بالمعلومات المطلوبة."
      saveText={initialData ? 'تحديث' : 'إضافة'}
      isSubmitting={isSubmitting}
      formId="student-form"
    >
      <form
        id="student-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4 max-h-[60vh] overflow-y-auto px-1"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="parentName">اسم ولي الأمر</Label>
            <Input
              id="parentName"
              {...register('parentName')}
              error={errors.parentName?.message}
            />
            {errors.parentName && (
              <p className="text-xs text-red-500">
                {errors.parentName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentPhone">رقم الهاتف</Label>
            <Input id="parentPhone" {...register('parentPhone')} />
            {errors.parentPhone && (
              <p className="text-xs text-red-500">
                {errors.parentPhone.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">واتساب (اختياري)</Label>
            <Input id="whatsapp" {...register('whatsapp')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siblingGroup">كود مجموعة الأشقاء (اختياري)</Label>
            <Input id="siblingGroup" {...register('siblingGroup')} placeholder="مثال: FAM-01" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="area">المنطقة</Label>
            <Input id="area" {...register('area')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school">المدرسة (اختياري)</Label>
            <Input id="school" {...register('school')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">العنوان بالتفصيل</Label>
          <Input id="address" {...register('address')} />
          {errors.address && (
            <p className="text-xs text-red-500">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="grade">المرحلة الدراسية</Label>
            <select
              id="grade"
              {...register('grade')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="تأسيس">تأسيس</option>
              <option value="ابتدائي">ابتدائي</option>
              <option value="متوسط">متوسط</option>
              <option value="ثانوي">ثانوي</option>
              <option value="جامعي">جامعي</option>
              <option value="قدرات">قدرات</option>
              <option value="تحصيلي">تحصيلي</option>
            </select>
            {errors.grade && (
              <p className="text-xs text-red-500">{errors.grade.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlyFee">الرسوم الشهرية (KD)</Label>
            <Input
              id="monthlyFee"
              type="number"
              step="0.001"
              {...register('monthlyFee')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="googleMapsUrl">رابط الموقع (Google Maps)</Label>
          <Input
            id="googleMapsUrl"
            {...register('googleMapsUrl')}
            placeholder="https://maps.app.goo.gl/..."
          />
          {errors.googleMapsUrl && (
            <p className="text-xs text-red-500">
              {errors.googleMapsUrl.message}
            </p>
          )}
        </div>
      </form>
    </FormDialog>
  );
};

export default StudentFormDialog;
