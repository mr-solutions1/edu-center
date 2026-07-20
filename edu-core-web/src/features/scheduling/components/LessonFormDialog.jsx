import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { studentApi } from '@/features/students/services/studentApi';
import { teacherApi } from '@/features/teachers/services/teacherApi';
import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const lessonSchema = z.object({
  studentId: z.string().min(1, 'يجب تحديد الطالب'),
  teacherId: z.string().min(1, 'يجب تحديد المعلم'),
  title: z.string().min(1, 'عنوان الحصة مطلوب'),
  lessonDate: z.string().min(1, 'تاريخ الحصة مطلوب'),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صالح'),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'تنسيق الوقت غير صالح'),
  lessonPrice: z.coerce.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
});

const LessonFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      lessonPrice: 0,
      startTime: '10:00',
      endTime: '11:00',
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
  });
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentApi.getAllStudents({ limit: 100 }),
  });

  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="حجز حصة جديدة"
      saveText="تأكيد الحجز"
      isSubmitting={isSubmitting}
      formId="lesson-form"
    >
      <form
        id="lesson-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 text-right"
      >
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">المادة / العنوان</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="مثال: رياضيات - تأسيس"
          />
          {errors.title && (
            <p className="text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="teacherId">المعلم</Label>
            <select
              id="teacherId"
              {...register('teacherId')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">اختر المعلم...</option>
              {teachers?.data?.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.userId?.firstName} {t.userId?.lastName}
                </option>
              ))}
            </select>
          </div>
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
                  {s.parentName} (كود: {s.studentCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lessonDate">تاريخ الحصة</Label>
          <Input id="lessonDate" type="date" {...register('lessonDate')} />
          {errors.lessonDate && (
            <p className="text-xs text-red-500">{errors.lessonDate.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">وقت البدء</Label>
            <Input id="startTime" type="time" {...register('startTime')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">وقت الانتهاء</Label>
            <Input id="endTime" type="time" {...register('endTime')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lessonPrice">سعر الحصة (KD)</Label>
          <Input
            id="lessonPrice"
            type="number"
            step="0.001"
            {...register('lessonPrice')}
          />
        </div>
      </form>
    </FormDialog>
  );
};

export default LessonFormDialog;
