import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { studentSchema } from '../validations/studentSchema';

import FormDialog from '@/shared/components/FormDialog/FormDialog';
import { kuwaitGeodata } from '@/shared/constants/kuwaitGeodata';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toKWD } from '@/shared/utils/money';

const classYearsByGrade = {
  'تأسيس': [
    'تمهيدي',
    'تأسيس لغة عربية',
    'تأسيس لغة إنجليزية',
    'تأسيس رياضيات',
  ],
  'ابتدائي': [
    'الصف الأول',
    'الصف الثاني',
    'الصف الثالث',
    'الصف الرابع',
    'الصف الخامس',
  ],
  'متوسط': [
    'الصف السادس',
    'الصف السابع',
    'الصف الثامن',
    'الصف التاسع',
  ],
  'ثانوي': [
    'الصف العاشر',
    'الصف الحادي عشر - علمي',
    'الصف الحادي عشر - أدبي',
    'الصف الثاني عشر - علمي',
    'الصف الثاني عشر - أدبي',
  ],
  'جامعي': ['سنة أولى', 'سنة ثانية', 'سنة ثالثة', 'سنة رابعة'],
  'قدرات': ['دورة قدرات'],
  'تحصيلي': ['دورة تحصيلي'],
};

const curricula = [
  'مخرجات حكومي',
  'مخرجات خاص ثنائي اللغة',
  'منهج بريطاني (IGCSE)',
  'منهج أمريكي',
  'منهج عربي',
];

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
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: initialData || {
      studentName: '',
      studentPhone: '',
      parentName: '',
      parentPhone: '',
      siblingGroup: '',
      whatsapp: '',
      governorate: 'حولي',
      area: '',
      address: '',
      googleMapsUrl: '',
      school: '',
      grade: 'ابتدائي',
      classYear: '',
      curriculum: 'مخرجات حكومي',
      subjects: [],
      monthlyFee: 0,
    },
  });

  const selectedGrade = watch('grade');
  const selectedGovernorate = watch('governorate');
  const parentPhoneWatch = watch('parentPhone');

  // Automatically update whatsapp from parent phone unless user edits it
  useEffect(() => {
    if (parentPhoneWatch && !initialData) {
      setValue('whatsapp', parentPhoneWatch);
    }
  }, [parentPhoneWatch, setValue, initialData]);

  // Handle grade change to auto-set first available classYear
  useEffect(() => {
    if (selectedGrade && classYearsByGrade[selectedGrade]) {
      const availableClasses = classYearsByGrade[selectedGrade];
      if (initialData && initialData.grade === selectedGrade) {
        setValue('classYear', initialData.classYear);
      } else {
        setValue('classYear', availableClasses[0] || '');
      }
    }
  }, [selectedGrade, setValue, initialData]);

  // Handle governorate change to auto-set first available area
  useEffect(() => {
    if (selectedGovernorate && kuwaitGeodata[selectedGovernorate]) {
      const availableAreas = kuwaitGeodata[selectedGovernorate];
      if (initialData && initialData.governorate === selectedGovernorate) {
        setValue('area', initialData.area);
      } else {
        setValue('area', availableAreas[0] || '');
      }
    }
  }, [selectedGovernorate, setValue, initialData]);

  React.useEffect(() => {
    if (open) {
      const data = { ...initialData };
      if (data.monthlyFee !== undefined) {
        data.monthlyFee = toKWD(data.monthlyFee);
      }
      reset(data || {
        studentName: '',
        studentPhone: '',
        parentName: '',
        parentPhone: '',
        siblingGroup: '',
        whatsapp: '',
        governorate: 'حولي',
        area: 'السالمية',
        address: '',
        googleMapsUrl: '',
        school: '',
        grade: 'ابتدائي',
        classYear: 'الصف الأول',
        curriculum: 'مخرجات حكومي',
        subjects: [],
        monthlyFee: 0,
      });
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
      description="يرجى ملء النموذج أدناه بالمعلومات المطلوبة لدولة الكويت."
      saveText={initialData ? 'تحديث' : 'إضافة'}
      isSubmitting={isSubmitting}
      formId="student-form"
    >
      <form
        id="student-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4 max-h-[60vh] overflow-y-auto px-1 text-right"
        dir="rtl"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="studentName">اسم الطالب (ثنائي/ثلاثي)</Label>
            <Input
              id="studentName"
              {...register('studentName')}
              error={errors.studentName?.message}
              placeholder="مثال: عبدالرحمن العتيبي"
            />
            {errors.studentName && (
              <p className="text-xs text-red-500">
                {errors.studentName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentPhone">رقم هاتف الطالب (إن وجد)</Label>
            <Input
              id="studentPhone"
              {...register('studentPhone')}
              placeholder="مثال: 99887766"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="parentName">اسم ولي الأمر</Label>
            <Input
              id="parentName"
              {...register('parentName')}
              error={errors.parentName?.message}
              placeholder="مثال: محمد العتيبي"
            />
            {errors.parentName && (
              <p className="text-xs text-red-500">
                {errors.parentName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentPhone">رقم هاتف وواتساب ولي الأمر</Label>
            <Input
              id="parentPhone"
              {...register('parentPhone')}
              placeholder="مثال: 55667788"
            />
            {errors.parentPhone && (
              <p className="text-xs text-red-500">
                {errors.parentPhone.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">رقم الواتساب للمتابعة</Label>
            <Input id="whatsapp" {...register('whatsapp')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siblingGroup">كود مجموعة الأشقاء (اختياري)</Label>
            <Input id="siblingGroup" {...register('siblingGroup')} placeholder="مثال: FAM-01" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="governorate">المحافظة</Label>
            <select
              id="governorate"
              {...register('governorate')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.keys(kuwaitGeodata).map((gov) => (
                <option key={gov} value={gov}>
                  {gov}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">المنطقة</Label>
            <select
              id="area"
              {...register('area')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {(kuwaitGeodata[selectedGovernorate] || []).map((ar) => (
                <option key={ar} value={ar}>
                  {ar}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school">المدرسة (اختياري)</Label>
            <Input id="school" {...register('school')} placeholder="مثال: مدرسة المباركية" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">العنوان بالتفصيل (القطعة، الشارع، المنزل)</Label>
          <Input id="address" {...register('address')} placeholder="القطعة 3، الشارع 5، المنزل 12" />
          {errors.address && (
            <p className="text-xs text-red-500">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-right">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="classYear">الصف الدراسية</Label>
            <select
              id="classYear"
              {...register('classYear')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {(classYearsByGrade[selectedGrade] || ['أخرى']).map((cl) => (
                <option key={cl} value={cl}>
                  {cl}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="curriculum">المنهج الدراسي</Label>
            <select
              id="curriculum"
              {...register('curriculum')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {curricula.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyFee">الرسوم الشهرية (دينار كويتي)</Label>
            <Input
              id="monthlyFee"
              type="number"
              step="0.001"
              {...register('monthlyFee')}
            />
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
        </div>
      </form>
    </FormDialog>
  );
};

export default StudentFormDialog;
