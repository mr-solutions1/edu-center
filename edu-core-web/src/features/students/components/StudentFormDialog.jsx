import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { BookOpen, CreditCard, User, Check, AlertCircle } from 'lucide-react';

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
      subject: '',
      purchasedHours: 10,
      pricePerHour: 10,
      teacherId: '',
      day1: '',
      from1: '',
      to1: '',
      day2: '',
      from2: '',
      to2: '',
      initialPaidAmount: 0,
      paymentMethod: 'CASH',
    },
  });

  const selectedGrade = watch('grade');
  const selectedGovernorate = watch('governorate');
  const parentPhoneWatch = watch('parentPhone');
  const selectedTeacherId = watch('teacherId');

  // Load teachers for the academic assignment section
  const { data: teachersRes } = useQuery({
    queryKey: ['teachers-all'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
    enabled: open,
  });

  const teachers = teachersRes?.data || [];
  const selectedTeacherObj = teachers.find(t => t._id === selectedTeacherId);

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
        subject: '',
        purchasedHours: 10,
        pricePerHour: 10,
        teacherId: '',
        day1: '',
        from1: '',
        to1: '',
        day2: '',
        from2: '',
        to2: '',
        initialPaidAmount: 0,
        paymentMethod: 'CASH',
      });
      setActiveTab('personal');
    }
  }, [open, reset, initialData]);

  const onFormSubmit = (data) => {
    // Sanitize values
    const sanitized = { ...data };
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
      className="max-w-4xl"
    >
      {/* Visual Navigation Steps */}
      <div className="flex border-b mb-4 justify-around text-sm font-semibold" dir="rtl">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 pb-3 pt-1 border-b-2 px-4 transition-all ${
            activeTab === 'personal'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <User className="h-4 w-4" />
          <span>١. ملف الطالب وعنوانه</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('academic')}
          className={`flex items-center gap-2 pb-3 pt-1 border-b-2 px-4 transition-all ${
            activeTab === 'academic'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>٢. تسجيل المادة والمعلم (اختياري)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 pb-3 pt-1 border-b-2 px-4 transition-all ${
            activeTab === 'financial'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>٣. الرسوم والمدفوعات (اختياري)</span>
        </button>
      </div>

      <form
        id="student-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4 max-h-[62vh] overflow-y-auto px-2 text-right"
        dir="rtl"
      >
        {/* Step 1: Personal and Contact */}
        {activeTab === 'personal' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">رقم الواتساب للمتابعة</Label>
                <Input id="whatsapp" {...register('whatsapp')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siblingGroup">كود مجموعة الأشقاء (اختياري)</Label>
                <Input id="siblingGroup" {...register('siblingGroup')} placeholder="مثال: FAM-01" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
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
                <Label htmlFor="classYear">الصف الدراسي</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex items-end justify-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('academic')}
                  className="bg-primary/10 text-primary px-6 py-2 rounded-md font-bold hover:bg-primary/20 transition-all text-sm"
                >
                  متابعة للتسجيل الأكاديمي ⟵
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Academic Registration (Optional) */}
        {activeTab === 'academic' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>هذا القسم اختياري. إذا أردت حجز باقة حصص للطالب فوراً، املأ اسم المادة؛ وإلا اترك الحقول فارغة للملف التعريفي فقط.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">المادة الدراسية المسجلة</Label>
                <Input id="subject" {...register('subject')} placeholder="مثال: لغة إنجليزية، رياضيات" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacherId">المعلم المخصص للمادة</Label>
                <select
                  id="teacherId"
                  {...register('teacherId')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">اختر معلماً...</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.userId?.firstName} {t.userId?.lastName} {t.usesInstituteCar ? '🚗' : ''}
                    </option>
                  ))}
                </select>
                {selectedTeacherObj && (
                  <div className="flex gap-2 mt-1 items-center">
                    <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      {selectedTeacherObj.usesInstituteCar ? '🚗 يستخدم سيارة الأكاديمية' : '🚗 لا يستخدم سيارة الأكاديمية'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasedHours">عدد الساعات المشتراة للباقة الأولى</Label>
                <Input id="purchasedHours" type="number" {...register('purchasedHours')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerHour">سعر الساعة المتفق عليه (KWD)</Label>
                <Input id="pricePerHour" type="number" step="0.001" {...register('pricePerHour')} />
              </div>
            </div>

            {/* Weekly Schedule Days */}
            <div className="border-t pt-3 mt-2">
              <h4 className="font-semibold text-sm mb-2 text-primary">الموعد الأسبوعي الأول (رئيسي)</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="day1" className="text-xs">اليوم</Label>
                  <select id="day1" {...register('day1')} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
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
                  <Label htmlFor="from1" className="text-xs">من (HH:mm)</Label>
                  <Input id="from1" placeholder="14:00" {...register('from1')} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="to1" className="text-xs">إلى (HH:mm)</Label>
                  <Input id="to1" placeholder="16:00" {...register('to1')} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm mb-2 text-muted-foreground">الموعد الأسبوعي الثاني (اختياري)</h4>
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
                </div>
                <div className="space-y-1">
                  <Label htmlFor="to2" className="text-xs">إلى (HH:mm)</Label>
                  <Input id="to2" placeholder="16:00" {...register('to2')} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className="text-muted-foreground font-bold hover:underline text-sm"
              >
                ⟵ العودة للملف الشخصي
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financial')}
                className="bg-primary/10 text-primary px-6 py-2 rounded-md font-bold hover:bg-primary/20 transition-all text-sm"
              >
                متابعة للمدفوعات والشحن ⟵
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Initial Payment & Fees (Optional) */}
        {activeTab === 'financial' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>هذا القسم اختياري. يمكنك تسجيل دفعة أولى أو شحن رصيد الطالب المالي فوراً، مع تحديد طريقة السداد والرسوم الشهرية.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyFee">الرسوم الشهرية المتفق عليها (KWD)</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  step="0.001"
                  {...register('monthlyFee')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialPaidAmount">مبلغ الدفعة الأولى / الشحن الفوري (KWD)</Label>
                <Input
                  id="initialPaidAmount"
                  type="number"
                  step="0.001"
                  {...register('initialPaidAmount')}
                  placeholder="مثال: 50.000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">طريقة الدفع للمبلغ المستلم</Label>
              <select
                id="paymentMethod"
                {...register('paymentMethod')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="CASH">نقداً (Cash)</option>
                <option value="KNET">كي نت (K-Net)</option>
                <option value="BANK_TRANSFER">تحويل بنكي (Bank Transfer)</option>
              </select>
            </div>

            <div className="flex justify-between items-center pt-6">
              <button
                type="button"
                onClick={() => setActiveTab('academic')}
                className="text-muted-foreground font-bold hover:underline text-sm"
              >
                ⟵ العودة للتسجيل الأكاديمي
              </button>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>جاهز للاعتماد، اضغط على زر الإضافة بالأسفل لإتمام التسجيل بالكامل!</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </FormDialog>
  );
};

export default StudentFormDialog;
