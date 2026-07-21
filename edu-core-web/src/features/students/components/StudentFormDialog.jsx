import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  BookOpen,
  CreditCard,
  User,
  Check,
  AlertCircle,
  Phone,
  MapPin,
  School,
  Calendar,
  Settings,
  FileText,
  Clock,
  Percent,
  Car,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

import { studentSchema } from '../validations/studentSchema';
import { teacherApi } from '../../teachers/services/teacherApi';

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
  const [activeTab, setActiveTab] = useState('personal');
  const [percentagePreset, setPercentagePreset] = useState('75');

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
      // Additional database fields
      preferredTeacherGender: 'MALE',
      preferredSchedule: '',
      notes: '',
      dateOfBirth: '',
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      // Unified UI phone
      unifiedPhone: '',
      // Combined Registration Fields
      subject: '',
      purchasedHours: 10,
      pricePerHour: 10,
      teacherPercentageSnapshot: 75,
      teacherId: '',
      day1: '',
      from1: '',
      to1: '',
      day2: '',
      from2: '',
      to2: '',
      initialPaidAmount: 0,
      paymentMethod: 'CASH',
      // Additional teacher specific detail overridden at enrollment
      teacherOwnsCar: 'no',
      // Target student specialization field
      studentSpecialization: '',
    },
  });

  const selectedGrade = watch('grade');
  const selectedGovernorate = watch('governorate');
  const unifiedPhoneWatch = watch('unifiedPhone');
  const selectedTeacherId = watch('teacherId');
  const watchCustomPercentage = watch('teacherPercentageSnapshot');

  // Load teachers for the academic assignment section
  const { data: teachersRes } = useQuery({
    queryKey: ['teachers-all'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
    enabled: open,
  });

  const teachers = teachersRes?.data || [];
  const selectedTeacherObj = teachers.find(t => t._id === selectedTeacherId);

  // Automatically propagate unified phone number to subfields to respect API/DB schemas
  useEffect(() => {
    if (unifiedPhoneWatch) {
      setValue('parentPhone', unifiedPhoneWatch);
      setValue('studentPhone', unifiedPhoneWatch);
      setValue('whatsapp', unifiedPhoneWatch);
    }
  }, [unifiedPhoneWatch, setValue]);

  // Handle preset change to sync into react-hook-form value
  useEffect(() => {
    if (percentagePreset !== 'custom') {
      setValue('teacherPercentageSnapshot', parseInt(percentagePreset, 10));
    }
  }, [percentagePreset, setValue]);

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
      if (initialData) {
        // Set unified phone default if editing
        data.unifiedPhone = initialData.parentPhone || initialData.studentPhone || initialData.whatsapp || '';
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
        preferredTeacherGender: 'MALE',
        preferredSchedule: '',
        notes: '',
        dateOfBirth: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        unifiedPhone: '',
        subject: '',
        purchasedHours: 10,
        pricePerHour: 10,
        teacherPercentageSnapshot: 75,
        teacherId: '',
        day1: '',
        from1: '',
        to1: '',
        day2: '',
        from2: '',
        to2: '',
        initialPaidAmount: 0,
        paymentMethod: 'CASH',
        teacherOwnsCar: 'no',
        studentSpecialization: '',
      });
      setPercentagePreset('75');
      setActiveTab('personal');
    }
  }, [open, reset, initialData]);

  // Show a comprehensive validation error alert box if submission is attempted with errors
  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      toast.error(`هناك أخطاء في النموذج: ${errorKeys.map(k => errors[k]?.message).filter(Boolean).join(', ')}`, {
        duration: 5000,
      });
    }
  }, [errors]);

  const onFormSubmit = (data) => {
    // Sanitize optional registrations / payments values
    const sanitized = { ...data };
    // Double-guarantee unified phone propagation
    sanitized.parentPhone = data.unifiedPhone;
    sanitized.studentPhone = data.unifiedPhone;
    sanitized.whatsapp = data.unifiedPhone;

    // Push specialization into notes or subjects to avoid DB desync if custom fields don't exist
    if (data.studentSpecialization) {
      sanitized.notes = `${data.notes || ''} [التخصص المستهدف: ${data.studentSpecialization}]`.trim();
    }

    if (!sanitized.subject) {
      delete sanitized.subject;
      delete sanitized.purchasedHours;
      delete sanitized.pricePerHour;
      delete sanitized.teacherId;
      delete sanitized.day1;
      delete sanitized.from1;
      delete sanitized.to1;
      delete sanitized.day2;
      delete sanitized.from2;
      delete sanitized.to2;
    }
    if (!sanitized.initialPaidAmount || parseFloat(sanitized.initialPaidAmount) <= 0) {
      delete sanitized.initialPaidAmount;
      delete sanitized.paymentMethod;
    }
    onSubmit(sanitized);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialData ? 'تعديل بيانات طالب' : 'مركز تسجيل الطلاب الموحد (All-in-One)'}
      description="يمكنك من هذه النافذة تسجيل الطالب بالكامل، وحجز باقة الحصص الأولى له، وشحن رصيده المالي دفعة واحدة."
      saveText={initialData ? 'تحديث' : 'إضافة وتفعيل الحساب'}
      isSubmitting={isSubmitting}
      formId="student-form"
      className="max-w-[85vw] xl:max-w-[75vw] min-h-[82vh] flex flex-col justify-between"
    >
      {/* Dynamic Form Alert banner if any errors exist */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-xl flex items-start gap-2 mb-4 mx-6" dir="rtl">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold mb-1">يرجى تصحيح الأخطاء التالية قبل المتابعة:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.keys(errors).map((key) => (
                <li key={key}>
                  {errors[key]?.message || `${key} غير صالح`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Visual Navigation Tabs - Spacious Widescreen Row tabs */}
      <div className="flex border-b mb-6 justify-around text-sm font-semibold mx-6 bg-slate-50/70 p-1.5 rounded-2xl" dir="rtl">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`flex items-center justify-center gap-2 pb-3.5 pt-3.5 border-b-2 px-8 transition-all duration-300 w-full rounded-xl ${
            activeTab === 'personal'
              ? 'border-primary text-primary font-bold bg-white shadow-sm'
              : 'border-transparent text-muted-foreground hover:text-slate-700'
          }`}
        >
          <User className="h-5 w-5 animate-pulse" />
          <span className="text-sm">١. ملف الطالب وعنوانه السكني</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('academic')}
          className={`flex items-center justify-center gap-2 pb-3.5 pt-3.5 border-b-2 px-8 transition-all duration-300 w-full rounded-xl ${
            activeTab === 'academic'
              ? 'border-primary text-primary font-bold bg-white shadow-sm'
              : 'border-transparent text-muted-foreground hover:text-slate-700'
          }`}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-sm">٢. تسجيل المادة والمعلم والدورة (اختياري)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('financial')}
          className={`flex items-center justify-center gap-2 pb-3.5 pt-3.5 border-b-2 px-8 transition-all duration-300 w-full rounded-xl ${
            activeTab === 'financial'
              ? 'border-primary text-primary font-bold bg-white shadow-sm'
              : 'border-transparent text-muted-foreground hover:text-slate-700'
          }`}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-sm">٣. الرسوم الشهرية والشحن المالي (اختياري)</span>
        </button>
      </div>

      <form
        id="student-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-6 max-h-[66vh] overflow-y-auto px-8 text-right flex-1"
        dir="rtl"
      >
        {/* Step 1: Personal and Contact */}
        {activeTab === 'personal' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Core Personal Details - Broad 3 columns */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                <User className="h-5 w-5" />
                <span>البيانات الأساسية والشخصية للطالب</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="studentName" className="font-bold text-slate-700 text-sm">اسم الطالب (ثنائي/ثلاثي) <span className="text-red-500">*</span></Label>
                  <Input
                    id="studentName"
                    {...register('studentName')}
                    error={errors.studentName?.message}
                    placeholder="مثال: عبدالرحمن العتيبي"
                    className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg transition-colors border-slate-200"
                  />
                  {errors.studentName && (
                    <p className="text-xs text-red-500">{errors.studentName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentName" className="font-bold text-slate-700 text-sm">اسم ولي الأمر <span className="text-red-500">*</span></Label>
                  <Input
                    id="parentName"
                    {...register('parentName')}
                    error={errors.parentName?.message}
                    placeholder="مثال: محمد العتيبي"
                    className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg transition-colors border-slate-200"
                  />
                  {errors.parentName && (
                    <p className="text-xs text-red-500">{errors.parentName.message}</p>
                  )}
                </div>

                {/* Consolidated Unified Phone Input */}
                <div className="space-y-2">
                  <Label htmlFor="unifiedPhone" className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <span>رقم هاتف التواصل والواتساب الموحد <span className="text-red-500">*</span></span>
                  </Label>
                  <Input
                    id="unifiedPhone"
                    {...register('unifiedPhone')}
                    placeholder="مثال: 55667788"
                    className="bg-slate-50/50 focus:bg-white font-bold tracking-wide h-11 text-sm rounded-lg transition-colors border-slate-200"
                  />
                  {errors.parentPhone && (
                    <p className="text-xs text-red-500">{errors.parentPhone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="siblingGroup" className="font-semibold text-slate-700 text-sm">كود مجموعة الأشقاء (اختياري)</Label>
                  <Input id="siblingGroup" {...register('siblingGroup')} placeholder="مثال: FAM-01" className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="font-semibold text-slate-700 text-sm">تاريخ الميلاد</Label>
                  <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrollmentDate" className="font-semibold text-slate-700 text-sm">تاريخ التسجيل بالمركز</Label>
                  <Input id="enrollmentDate" type="date" {...register('enrollmentDate')} className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="font-semibold text-slate-700 text-sm">حالة ملف الطالب</Label>
                  <select
                    id="status"
                    {...register('status')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="ACTIVE">نشط (Active)</option>
                    <option value="SUSPENDED">موقوف مؤقتاً (Suspended)</option>
                    <option value="WITHDRAWN">منسحب (Withdrawn)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Academic Information - Broad Horizontal layout */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                <School className="h-5 w-5" />
                <span>البيانات الأكاديمية والمدرسية</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="grade" className="font-bold text-slate-700 text-sm">المرحلة الدراسية <span className="text-red-500">*</span></Label>
                  <select
                    id="grade"
                    {...register('grade')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                  <Label htmlFor="classYear" className="font-bold text-slate-700 text-sm">الصف الدراسي <span className="text-red-500">*</span></Label>
                  <select
                    id="classYear"
                    {...register('classYear')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {(classYearsByGrade[selectedGrade] || ['أخرى']).map((cl) => (
                      <option key={cl} value={cl}>
                        {cl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="curriculum" className="font-bold text-slate-700 text-sm">المنهج الدراسي <span className="text-red-500">*</span></Label>
                  <select
                    id="curriculum"
                    {...register('curriculum')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {curricula.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="school" className="font-semibold text-slate-700 text-sm">المدرسة (اختياري)</Label>
                  <Input id="school" {...register('school')} placeholder="مثال: مدرسة المباركية" className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentSpecialization" className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-primary shrink-0" />
                    <span>التخصص الدراسي للطالب (علمي / أدبي)</span>
                  </Label>
                  <Input
                    id="studentSpecialization"
                    {...register('studentSpecialization')}
                    placeholder="مثال: علمي، أدبي، لغات"
                    className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredTeacherGender" className="font-semibold text-slate-700 text-sm">جنس المعلم المفضل</Label>
                  <select
                    id="preferredTeacherGender"
                    {...register('preferredTeacherGender')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="MALE">ذكر (Male)</option>
                    <option value="FEMALE">أنثى (Female)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address Details - Spacious horizontally */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                <MapPin className="h-5 w-5" />
                <span>العنوان الجغرافي والسكن داخل دولة الكويت</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="governorate" className="font-bold text-slate-700 text-sm">المحافظة <span className="text-red-500">*</span></Label>
                  <select
                    id="governorate"
                    {...register('governorate')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.keys(kuwaitGeodata).map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area" className="font-bold text-slate-700 text-sm">المنطقة <span className="text-red-500">*</span></Label>
                  <select
                    id="area"
                    {...register('area')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {(kuwaitGeodata[selectedGovernorate] || []).map((ar) => (
                      <option key={ar} value={ar}>
                        {ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="address" className="font-bold text-slate-700 text-sm">العنوان بالتفصيل (القطعة، الشارع، المنزل) <span className="text-red-500">*</span></Label>
                  <Input id="address" {...register('address')} placeholder="القطعة 3، الشارع 5، المنزل 12" className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                  {errors.address && (
                    <p className="text-xs text-red-500">{errors.address.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="googleMapsUrl" className="font-semibold text-slate-700 text-sm">رابط الموقع الجغرافي على الخرائط (Google Maps)</Label>
                  <Input
                    id="googleMapsUrl"
                    {...register('googleMapsUrl')}
                    placeholder="https://maps.app.goo.gl/..."
                    className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200"
                  />
                  {errors.googleMapsUrl && (
                    <p className="text-xs text-red-500">{errors.googleMapsUrl.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes and preferences */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                <FileText className="h-5 w-5" />
                <span>ملاحظات ومواعيد مفضلة إضافية</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="preferredSchedule" className="font-semibold text-slate-700 text-sm">المواعيد المفضلة بشكل عام</Label>
                  <Input id="preferredSchedule" {...register('preferredSchedule')} placeholder="مثال: مساء الأحد والثلاثاء" className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="font-semibold text-slate-700 text-sm">ملاحظات إدارية / أكاديمية</Label>
                  <Input id="notes" {...register('notes')} placeholder="أي ملاحظات تخص مستوى الطالب" className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('academic')}
                className="bg-primary text-white hover:bg-primary/90 px-10 py-3.5 rounded-xl font-bold shadow-md transition-all text-sm flex items-center gap-2"
              >
                <span>متابعة للتسجيل الأكاديمي وحجز الحصص</span>
                <span>⟵</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Academic Registration (Optional) */}
        {activeTab === 'academic' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold mb-1 text-sm">قسم اختياري بالكامل</p>
                <p>إذا أردت حجز باقة حصص أولية للطالب في نفس اللحظة، املأ حقل اسم المادة وسعر الساعة؛ وإلا اتركها فارغة لإنشاء ملف تعريف فقط.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                <BookOpen className="h-5 w-5" />
                <span>تفاصيل المادة وباقة الساعات وحصة المعلم</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="font-bold text-slate-700 text-sm">المادة الدراسية المراد حجزها <span className="text-red-500">*</span></Label>
                  <Input id="subject" {...register('subject')} placeholder="مثال: لغة إنجليزية، رياضيات" className="bg-slate-50/50 focus:bg-white font-bold text-slate-900 h-11 text-sm rounded-lg border-slate-200" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacherId" className="font-bold text-slate-700 text-sm">المعلم المخصص لتدريس المادة للطالب <span className="text-red-500">*</span></Label>
                  <select
                    id="teacherId"
                    {...register('teacherId')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">اختر معلماً من القائمة...</option>
                    {teachers.map((t) => {
                      const spec = t.department || 'عام';
                      const subs = t.subjects && t.subjects.length > 0 ? t.subjects.join('، ') : 'غير محدد';
                      return (
                        <option key={t._id} value={t._id}>
                          {t.userId?.firstName} {t.userId?.lastName} ({spec} | المواد: {subs}) {t.usesInstituteCar ? '🚗' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Dynamic Portfolios info */}
              {selectedTeacherObj && (
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 mt-2 space-y-3 text-sm text-slate-700 shadow-sm animate-in slide-in-from-top-2">
                  <p className="font-bold text-primary flex items-center gap-2 border-b pb-2 text-sm">
                    <User className="h-5 w-5" />
                    <span>الملف التعريفي والمهني للمعلم المختار:</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1 text-sm">
                    <p className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">🎓 التخصص الدراسي: <span className="font-bold text-slate-900">{selectedTeacherObj.department || 'عام'}</span></p>
                    <p className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">📚 المواد المسجلة: <span className="font-bold text-slate-900">{selectedTeacherObj.subjects?.join('، ') || 'غير محدد'}</span></p>
                    <p className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">🚗 مواصلات المعهد: <span className={`font-bold ${selectedTeacherObj.usesInstituteCar ? 'text-amber-600' : 'text-slate-500'}`}>{selectedTeacherObj.usesInstituteCar ? 'نعم (يستخدم سيارة الأكاديمية)' : 'لا'}</span></p>
                  </div>
                </div>
              )}

              {/* Dynamic Car Ownership option for the selected teacher */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="teacherOwnsCar" className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                    <Car className="h-4 w-4 text-primary shrink-0" />
                    <span>هل المعلم لديه سيارة؟ (مواصلات المعلم)</span>
                  </Label>
                  <select
                    id="teacherOwnsCar"
                    {...register('teacherOwnsCar')}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="yes">نعم (يسير بسيارته الخاصة)</option>
                    <option value="no">لا (يستخدم مواصلات عامة أو سيارة المركز)</option>
                  </select>
                </div>

                {/* Dropdown for Commission percentages + custom inputs */}
                <div className="space-y-2">
                  <Label htmlFor="percentagePreset" className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                    <Percent className="h-4 w-4 text-primary shrink-0" />
                    <span>نسبة المعلم مقابل المعهد (عمولة الباقة)</span>
                  </Label>
                  <select
                    id="percentagePreset"
                    value={percentagePreset}
                    onChange={(e) => setPercentagePreset(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="75">٧٥٪ للمعلم مقابل ٢٥٪ للمعهد</option>
                    <option value="80">٨٠٪ للمعلم مقابل ٢٠٪ للمعهد</option>
                    <option value="custom">نسبة مخصصة يدوياً (Custom)</option>
                  </select>
                </div>
              </div>

              {/* Custom manual Percentage input display conditionally */}
              {percentagePreset === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-primary/5 p-4 rounded-xl border border-primary/20 animate-in fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="teacherPercentageSnapshot" className="font-bold text-primary text-sm">أدخل نسبة المعلم المخصصة يدويًا (٪)</Label>
                    <Input
                      id="teacherPercentageSnapshot"
                      type="number"
                      min="0"
                      max="100"
                      {...register('teacherPercentageSnapshot')}
                      className="bg-white h-11 text-sm rounded-lg border-slate-200"
                    />
                    <p className="text-[11px] text-muted-foreground">سيحصل المعهد على النسبة المتبقية تلقائياً ({100 - (watchCustomPercentage || 0)}٪).</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="purchasedHours" className="font-bold text-slate-700 text-sm">عدد الساعات المشتراة للباقة الأولى <span className="text-red-500">*</span></Label>
                  <Input id="purchasedHours" type="number" {...register('purchasedHours')} className="bg-slate-50/50 focus:bg-white font-bold h-11 text-sm rounded-lg border-slate-200" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerHour" className="font-bold text-slate-700 text-sm">سعر الساعة المتفق عليه (KWD) <span className="text-red-500">*</span></Label>
                  <Input id="pricePerHour" type="number" step="0.001" {...register('pricePerHour')} className="bg-slate-50/50 focus:bg-white font-bold h-11 text-sm rounded-lg border-slate-200" />
                </div>
              </div>
            </div>

            {/* Weekly Schedule Days */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                <Clock className="h-5 w-5" />
                <span>الجدول الدراسي الأسبوعي المفصل لحجوزات الطالب (الوقت والمواعيد)</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-slate-100 p-5 rounded-xl bg-slate-50/30 space-y-4 shadow-xs">
                  <h4 className="font-bold text-xs text-primary flex items-center gap-1.5 border-b pb-2">
                    <Calendar className="h-4 w-4 shrink-0 text-primary" />
                    <span>الموعد الأسبوعي الأول (رئيسي)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="day1" className="text-xs text-slate-600 font-bold">اليوم</Label>
                      <select id="day1" {...register('day1')} className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs">
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
                      <Label htmlFor="from1" className="text-xs text-slate-600 font-bold">توقيت البداية (من)</Label>
                      <Input id="from1" placeholder="14:00" {...register('from1')} className="h-10 text-xs rounded-lg bg-white border-slate-200" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="to1" className="text-xs text-slate-600 font-bold">توقيت النهاية (إلى)</Label>
                      <Input id="to1" placeholder="16:00" {...register('to1')} className="h-10 text-xs rounded-lg bg-white border-slate-200" />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 p-5 rounded-xl bg-slate-50/30 space-y-4 shadow-xs">
                  <h4 className="font-bold text-xs text-slate-500 flex items-center gap-1.5 border-b pb-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>الموعد الأسبوعي الثاني (اختياري)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="day2" className="text-xs text-slate-600 font-bold">اليوم</Label>
                      <select id="day2" {...register('day2')} className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs">
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
                      <Label htmlFor="from2" className="text-xs text-slate-600 font-bold">توقيت البداية (من)</Label>
                      <Input id="from2" placeholder="14:00" {...register('from2')} className="h-10 text-xs rounded-lg bg-white border-slate-200" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="to2" className="text-xs text-slate-600 font-bold">توقيت النهاية (إلى)</Label>
                      <Input id="to2" placeholder="16:00" {...register('to2')} className="h-10 text-xs rounded-lg bg-white border-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className="text-muted-foreground font-bold hover:underline text-sm flex items-center gap-1"
              >
                ← العودة للملف الشخصي والعنوان
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financial')}
                className="bg-primary text-white hover:bg-primary/90 px-10 py-3.5 rounded-xl font-bold shadow-md transition-all text-sm flex items-center gap-2"
              >
                <span>متابعة للمدفوعات والشحن المالي</span>
                <span>⟵</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Initial Payment & Fees (Optional) */}
        {activeTab === 'financial' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5 shadow-sm mx-4">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold mb-1 text-sm">شحن الرصيد المالي وتسجيل السداد</p>
                <p>هذا القسم اختياري. يمكنك تسجيل دفعة أولى أو شحن رصيد الطالب المالي فوراً، مع تحديد طريقة السداد والرسوم الشهرية.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm mx-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                <CreditCard className="h-5 w-5" />
                <span>الرسوم والدفع المالي المباشر (الشحن الفوري للرصيد)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="monthlyFee" className="font-bold text-slate-700 text-sm">الرسوم الشهرية المقررة للطالب (KWD)</Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    step="0.001"
                    {...register('monthlyFee')}
                    className="bg-slate-50/50 focus:bg-white font-bold text-slate-900 h-11 text-sm rounded-lg border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialPaidAmount" className="font-bold text-slate-700 text-sm">مبلغ الدفعة الأولى المستلمة (KWD)</Label>
                  <Input
                    id="initialPaidAmount"
                    type="number"
                    step="0.001"
                    {...register('initialPaidAmount')}
                    placeholder="مثال: 50.000"
                    className="bg-slate-50/50 focus:bg-white font-black text-emerald-700 h-11 text-sm rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="paymentMethod" className="font-bold text-slate-700 text-sm">طريقة الدفع للمبلغ المستلم</Label>
                <select
                  id="paymentMethod"
                  {...register('paymentMethod')}
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="CASH">نقداً (Cash)</option>
                  <option value="KNET">كي نت (K-Net)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي (Bank Transfer)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t mx-4 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('academic')}
                className="text-muted-foreground font-bold hover:underline text-sm flex items-center gap-1"
              >
                ← العودة للتسجيل الأكاديمي
              </button>
              <div className="text-xs text-slate-700 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-xl shadow-sm">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-800">جاهز للتفعيل والاعتماد. اضغط على زر الإضافة بالأسفل لإتمام المعاملة فوراً!</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </FormDialog>
  );
};

export default StudentFormDialog;
