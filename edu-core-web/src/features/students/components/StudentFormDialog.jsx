import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Award,
  Plus,
  Trash2,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';

import { studentSchema } from '../validations/studentSchema';
import { teacherApi } from '../../teachers/services/teacherApi';
import { courseApi } from '../../courses/services/courseApi';

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');

  // Custom states for payment installment logic
  const [isInstallment, setIsInstallment] = useState('no');
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [installmentValue, setInstallmentsValue] = useState(0);
  const [priceOverrideReason, setPriceOverrideReason] = useState('');

  // Creation popups state triggers
  const [courseCreateOpen, setCourseCreateOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseSubject, setNewCourseSubject] = useState('رياضيات');
  const [newCourseGrade, setNewCourseGrade] = useState('ابتدائي');

  const [teacherCreateOpen, setTeacherCreateOpen] = useState(false);
  const [newTeacherFirst, setNewTeacherFirst] = useState('');
  const [newTeacherLast, setNewTeacherLast] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherSpec, setNewTeacherSpec] = useState('');

  // SUPPORT MULTIPLE SUBJECT REGISTRATIONS IN A SINGLE ENROLLMENT SESSION
  const [dynamicRegistrations, setDynamicRegistrations] = useState([
    {
      id: 1,
      subject: '',
      purchasedHours: 10,
      pricePerHour: 10,
      teacherPercentageSnapshot: 75,
      percentagePreset: '75',
      teacherId: '',
      teacherOwnsCar: 'no',
      // Multiple dynamic schedule days row for this specific subject row
      days: [{ id: 1, day: '', from: '', to: '' }]
    }
  ]);

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
    },
  });

  const selectedGrade = watch('grade');
  const selectedGovernorate = watch('governorate');
  const unifiedPhoneWatch = watch('unifiedPhone');
  const watchInitialPaidAmount = watch('initialPaidAmount');

  // Load teachers for the academic assignment section
  const { data: teachersRes } = useQuery({
    queryKey: ['teachers-all'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
    enabled: open,
  });

  // Load system courses to populate the subjects dropdown dynamically
  const { data: coursesRes } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => courseApi.getAll(),
    enabled: open,
  });

  // Create course inline mutation
  const createCourseMutation = useMutation({
    mutationFn: courseApi.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['courses-all']);
      toast.success('تم إنشاء الدورة بنجاح!');
      setCourseCreateOpen(false);
      setNewCourseName('');
      setNewCourseCode('');
    },
    onError: (err) => {
      toast.error(err.message || 'فشل إنشاء الدورة');
    }
  });

  const handleCreateCourseInline = () => {
    if (!newCourseName || !newCourseCode) {
      toast.warning('يرجى كتابة اسم وكود الدورة.');
      return;
    }
    createCourseMutation.mutate({
      name: newCourseName,
      code: newCourseCode,
      subject: newCourseSubject,
      educationalLevel: newCourseGrade,
    });
  };

  // Create teacher inline mutation
  const createTeacherMutation = useMutation({
    mutationFn: teacherApi.createTeacher,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['teachers-all']);
      toast.success('تم تسجيل المعلم الجديد بنجاح!');
      setTeacherCreateOpen(false);
      setNewTeacherFirst('');
      setNewTeacherLast('');
      setNewTeacherPhone('');
      setNewTeacherEmail('');
      setNewTeacherSpec('');
    },
    onError: (err) => {
      toast.error(err.message || 'فشل تسجيل المعلم');
    }
  });

  const handleCreateTeacherInline = () => {
    if (!newTeacherFirst || !newTeacherLast || !newTeacherPhone) {
      toast.warning('الاسم الأول، العائلة، ورقم الهاتف مطلوبة لتسجيل المعلم.');
      return;
    }
    createTeacherMutation.mutate({
      firstName: newTeacherFirst,
      lastName: newTeacherLast,
      phone: newTeacherPhone,
      email: newTeacherEmail || `${newTeacherFirst.toLowerCase()}@alphacenter.com`,
      department: newTeacherSpec || 'عام',
      subjects: [],
      hourlyRate: 10,
    });
  };

  const teachers = teachersRes?.data || [];
  const courses = coursesRes?.data || [];

  // Dynamic smart price calculator spanning across all added dynamic registrations packages
  const calculatedTotalAmount = dynamicRegistrations.reduce((sum, r) => {
    if (r.subject) {
      return sum + ((r.purchasedHours || 0) * (r.pricePerHour || 0));
    }
    return sum;
  }, 0);

  // Automatically update the suggested payment amount based on subject price setup
  useEffect(() => {
    if (calculatedTotalAmount > 0) {
      setValue('initialPaidAmount', calculatedTotalAmount);
    }
  }, [calculatedTotalAmount, setValue]);

  // Adjust installment share automatically when count or total switches
  useEffect(() => {
    const payAmount = watchInitialPaidAmount || calculatedTotalAmount;
    if (payAmount > 0 && installmentsCount > 0) {
      const perDue = parseFloat((payAmount / installmentsCount).toFixed(3));
      setInstallmentsValue(perDue);
    } else {
      setInstallmentsValue(0);
    }
  }, [watchInitialPaidAmount, calculatedTotalAmount, installmentsCount]);

  // Automatically propagate unified phone number to subfields to respect API/DB schemas
  useEffect(() => {
    if (unifiedPhoneWatch) {
      setValue('parentPhone', unifiedPhoneWatch);
      setValue('studentPhone', unifiedPhoneWatch);
      setValue('whatsapp', unifiedPhoneWatch);
    }
  }, [unifiedPhoneWatch, setValue]);

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
      });
      setDynamicRegistrations([
        {
          id: 1,
          subject: '',
          purchasedHours: 10,
          pricePerHour: 10,
          teacherPercentageSnapshot: 75,
          percentagePreset: '75',
          teacherId: '',
          teacherOwnsCar: 'no',
          days: [{ id: 1, day: '', from: '', to: '' }]
        }
      ]);
      setPercentagePreset('75');
      setIsInstallment('no');
      setPriceOverrideReason('');
      setCourseCreateOpen(false);
      setTeacherCreateOpen(false);
      setActiveTab('personal');
    }
  }, [open, reset, initialData]);

  // Handle dynamic multi-subject arrays operations
  const addDynamicRegistrationRow = () => {
    setDynamicRegistrations(prev => [
      ...prev,
      {
        id: Date.now(),
        subject: '',
        purchasedHours: 10,
        pricePerHour: 10,
        teacherPercentageSnapshot: 75,
        percentagePreset: '75',
        teacherId: '',
        teacherOwnsCar: 'no',
        days: [{ id: 1, day: '', from: '', to: '' }]
      }
    ]);
  };

  const removeDynamicRegistrationRow = (id) => {
    setDynamicRegistrations(prev => prev.filter(r => r.id !== id));
  };

  const updateDynamicRegistrationRow = (rowId, key, value) => {
    setDynamicRegistrations(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [key]: value };
        if (key === 'teacherId' && value) {
          const tObj = teachers.find(t => t._id === value);
          if (tObj) {
            updated.teacherOwnsCar = tObj.ownsCar ? 'yes' : 'no';
            const pct = tObj.teacherPercentage ? Math.round(tObj.teacherPercentage * 100) : 70;
            updated.teacherPercentageSnapshot = pct;
            updated.percentagePreset = (pct === 75 || pct === 80) ? String(pct) : 'custom';
            updated.pricePerHour = tObj.hourlyRate ? (tObj.hourlyRate / 1000) : 10;
          }
        }
        if (key === 'percentagePreset' && value !== 'custom') {
          updated.teacherPercentageSnapshot = parseInt(value, 10);
        }
        return updated;
      }
      return row;
    }));
  };

  const addDynamicScheduleDay = (regId) => {
    setDynamicRegistrations(prev => prev.map(row => {
      if (row.id === regId) {
        if (row.days.length >= 3) {
          toast.warning('يمكنك إضافة ٣ مواعيد بحد أقصى للمادة.');
          return row;
        }
        return {
          ...row,
          days: [...row.days, { id: Date.now(), day: '', from: '', to: '' }]
        };
      }
      return row;
    }));
  };

  const removeDynamicScheduleDay = (regId, dayId) => {
    setDynamicRegistrations(prev => prev.map(row => {
      if (row.id === regId) {
        return {
          ...row,
          days: row.days.filter(d => d.id !== dayId)
        };
      }
      return row;
    }));
  };

  const updateDynamicScheduleDay = (regId, dayId, key, value) => {
    setDynamicRegistrations(prev => prev.map(row => {
      if (row.id === regId) {
        return {
          ...row,
          days: row.days.map(d => d.id === dayId ? { ...d, [key]: value } : d)
        };
      }
      return row;
    }));
  };

  const onFormSubmit = (data) => {
    // Sanitize optional registrations / payments values
    const sanitized = { ...data };
    // Double-guarantee unified phone propagation
    sanitized.parentPhone = data.unifiedPhone;
    sanitized.studentPhone = data.unifiedPhone;
    sanitized.whatsapp = data.unifiedPhone;

    // Attach custom audit logs directly to notes
    let enrichedNotes = data.notes || '';
    if (data.studentSpecialization) {
      enrichedNotes += ` [التخصص المستهدف: ${data.studentSpecialization}]`;
    }
    if (priceOverrideReason) {
      enrichedNotes += ` [سبب تعديل سعر الباقة: ${priceOverrideReason}]`;
    }
    if (isInstallment === 'yes') {
      enrichedNotes += ` [نظام دفع الأقساط: مقسط على ${installmentsCount} دفعات، قيمة الدفعة ${installmentValue} KWD]`;
    }
    sanitized.notes = enrichedNotes.trim();

    // Auto record dates and times
    sanitized.enrollmentDate = new Date().toISOString().split('T')[0];
    sanitized.status = 'ACTIVE';

    // Map dynamic multi subject array to payload
    const activeRegs = dynamicRegistrations.filter(r => r.subject);
    if (activeRegs.length > 0) {
      // Pass registrations list directly
      sanitized.academicRegistrations = activeRegs.map(r => ({
        subject: r.subject,
        purchasedHours: parseFloat(r.purchasedHours) || 0,
        pricePerHour: parseFloat(r.pricePerHour) || 0,
        teacherPercentageSnapshot: parseFloat(r.teacherPercentageSnapshot) || 75,
        teacherId: r.teacherId || null,
        day1: r.days[0]?.day || null,
        from1: r.days[0]?.from || null,
        to1: r.days[0]?.to || null,
        day2: r.days[1]?.day || null,
        from2: r.days[1]?.from || null,
        to2: r.days[1]?.to || null,
        day3: r.days[2]?.day || null,
        from3: r.days[2]?.from || null,
        to3: r.days[2]?.to || null,
      }));
    }

    if (!sanitized.initialPaidAmount || parseFloat(sanitized.initialPaidAmount) <= 0) {
      delete sanitized.initialPaidAmount;
      delete sanitized.paymentMethod;
    }
    onSubmit(sanitized);
  };

  return (
    <>
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
            <span className="text-sm">٢. تسجيل المواد المعلمين والدورات (متعدد)</span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="siblingGroup" className="font-semibold text-slate-700 text-sm">كود مجموعة الأشقاء (اختياري)</Label>
                    <Input id="siblingGroup" {...register('siblingGroup')} placeholder="مثال: FAM-01" className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="font-semibold text-slate-700 text-sm">تاريخ الميلاد</Label>
                    <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} className="bg-slate-50/50 focus:bg-white h-11 text-sm rounded-lg border-slate-200" />
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

              {/* Smart notes and preferred timings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 mb-4 text-primary">
                  <FileText className="h-5 w-5" />
                  <span>الرغبات الذكية للمواعيد والملاحظات</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="preferredSchedule" className="font-bold text-slate-700 text-sm">المواعيد المفضلة للطالب (بشكل مفصل)</Label>
                    <textarea
                      id="preferredSchedule"
                      {...register('preferredSchedule')}
                      placeholder="أدخل رغبات وتفضيلات المواعيد بالتفصيل لتسهيل الحجز مستقبلاً..."
                      className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-white transition-all text-right"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="font-bold text-slate-700 text-sm">ملاحظات إدارية وأكاديمية هامة</Label>
                    <textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="أدخل أي ملاحظات هامة أو تقييم أولي لمستوى الطالب التعليمي..."
                      className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-white transition-all text-right"
                      dir="rtl"
                    />
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
                  <p className="font-bold mb-1 text-sm">شؤون التسجيل والمواد المتعددة</p>
                  <p>يمكنك حجز مادة واحدة أو عدة مواد للطالب بنفس الوقت من خلال الأزرار المتاحة، مع إمكانية تفعيل دورات غير مسجلة فوراً.</p>
                </div>
              </div>

              {/* Dynamic multiple registration lists render horizontally */}
              <div className="space-y-8">
                {dynamicRegistrations.map((row, index) => {
                  const isRecommended = row.subject;
                  const rowTeacherObj = teachers.find(t => t._id === row.teacherId);
                  const sortedRowTeachers = row.subject
                    ? [...teachers].sort((a, b) => {
                        const aTeaches = a.subjects?.some(sub => sub.toLowerCase().includes(row.subject.toLowerCase())) ? 1 : 0;
                        const bTeaches = b.subjects?.some(sub => sub.toLowerCase().includes(row.subject.toLowerCase())) ? 1 : 0;
                        return bTeaches - aTeaches;
                      })
                    : teachers;

                  return (
                    <div key={row.id} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6 shadow-sm relative">
                      <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 text-primary">
                          <BookOpen className="h-5 w-5" />
                          <span>المادة المسجلة رقم {index + 1}</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <button
                              type="button"
                              onClick={() => setCourseCreateOpen(true)}
                              className="bg-secondary/15 text-secondary-foreground hover:bg-secondary/25 text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                            >
                              ⚡ إنشاء دورة جديدة بالسيستم
                            </button>
                          )}
                          {dynamicRegistrations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDynamicRegistrationRow(row.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700 text-sm">المادة الدراسية المراد حجزها <span className="text-red-500">*</span></Label>
                          <select
                            value={row.subject}
                            onChange={(e) => updateDynamicRegistrationRow(row.id, 'subject', e.target.value)}
                            className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-bold text-slate-900"
                          >
                            <option value="">اختر المادة...</option>
                            {courses.map((c) => (
                              <option key={c._id} value={c.name}>
                                {c.name} ({c.code || 'عام'})
                              </option>
                            ))}
                            {courses.length === 0 && (
                              <>
                                <option value="لغة عربية">لغة عربية</option>
                                <option value="لغة إنجليزية">لغة إنجليزية</option>
                                <option value="رياضيات">رياضيات</option>
                                <option value="فيزياء">فيزياء</option>
                                <option value="كيمياء">كيمياء</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="font-bold text-slate-700 text-sm">المعلم المخصص لتدريس المادة <span className="text-red-500">*</span></Label>
                            <button
                              type="button"
                              onClick={() => setTeacherCreateOpen(true)}
                              className="text-xs text-primary hover:underline font-bold"
                            >
                              + تسجيل معلم جديد
                            </button>
                          </div>
                          <select
                            value={row.teacherId}
                            onChange={(e) => updateDynamicRegistrationRow(row.id, 'teacherId', e.target.value)}
                            className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">اختر معلماً من القائمة...</option>
                            {sortedRowTeachers.map((t) => {
                              const spec = t.department || 'عام';
                              const subs = t.subjects && t.subjects.length > 0 ? t.subjects.join('، ') : 'غير محدد';
                              const isMatched = row.subject && t.subjects?.some(sub => sub.toLowerCase().includes(row.subject.toLowerCase()));
                              return (
                                <option key={t._id} value={t._id}>
                                  {isMatched ? '⭐ [مدرس المادة] ' : ''} {t.userId?.firstName} {t.userId?.lastName} ({spec} | المواد: {subs}) {t.usesInstituteCar ? '🚗' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>

                      {/* Row Teacher details portfolios */}
                      {rowTeacherObj && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-xs text-slate-700 animate-in slide-in-from-top-2 shadow-xs">
                          <p className="font-bold text-primary flex items-center gap-1.5 border-b pb-1.5">
                            <User className="h-4 w-4" />
                            <span>الملف التعريفي للمعلم المختار:</span>
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <p>🎓 التخصص الدراسي: <span className="font-bold text-slate-900">{rowTeacherObj.department || 'عام'}</span></p>
                            <p>📚 المواد المسجلة لتدريسها: <span className="font-bold text-slate-900">{rowTeacherObj.subjects?.join('، ') || 'غير محدد'}</span></p>
                            <p>🚗 مواصلات المعهد: <span className="font-bold text-slate-900">{rowTeacherObj.usesInstituteCar ? 'نعم (يستخدم سيارة الأكاديمية)' : 'لا'}</span></p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                            <Car className="h-4 w-4 text-primary shrink-0" />
                            <span>هل المعلم لديه سيارة؟ (مواصلات المعلم)</span>
                          </Label>
                          <select
                            value={row.teacherOwnsCar}
                            onChange={(e) => updateDynamicRegistrationRow(row.id, 'teacherOwnsCar', e.target.value)}
                            className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="yes">نعم (يسير بسيارته الخاصة)</option>
                            <option value="no">لا (يستخدم مواصلات عامة أو سيارة المركز)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                            <Percent className="h-4 w-4 text-primary shrink-0" />
                            <span>نسبة المعلم مقابل المعهد (عمولة الباقة)</span>
                          </Label>
                          <select
                            value={row.percentagePreset}
                            onChange={(e) => updateDynamicRegistrationRow(row.id, 'percentagePreset', e.target.value)}
                            className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="75">٧٥٪ للمعلم مقابل ٢٥٪ للمعهد</option>
                            <option value="80">٨٠٪ للمعلم مقابل ٢٠٪ للمعهد</option>
                            <option value="custom">نسبة مخصصة يدوياً (Custom)</option>
                          </select>
                        </div>
                      </div>

                      {row.percentagePreset === 'custom' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-primary/5 p-4 rounded-xl border border-primary/20 animate-in fade-in">
                          <div className="space-y-2">
                            <Label className="font-bold text-primary text-sm">أدخل نسبة المعلم المخصصة يدويًا (٪)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={row.teacherPercentageSnapshot}
                              onChange={(e) => updateDynamicRegistrationRow(row.id, 'teacherPercentageSnapshot', parseFloat(e.target.value) || 0)}
                              className="bg-white h-11 text-sm rounded-lg border-slate-200"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700 text-sm">عدد الساعات المشتراة للباقة الأولى <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={row.purchasedHours}
                            onChange={(e) => updateDynamicRegistrationRow(row.id, 'purchasedHours', parseFloat(e.target.value) || 0)}
                            className="bg-slate-50/50 focus:bg-white font-bold h-11 text-sm rounded-lg border-slate-200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700 text-sm">سعر الساعة المتفق عليه (KWD) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={row.pricePerHour}
                            onChange={(e) => updateDynamicRegistrationRow(row.id, 'pricePerHour', parseFloat(e.target.value) || 0)}
                            className="bg-slate-50/50 focus:bg-white font-bold h-11 text-sm rounded-lg border-slate-200"
                          />
                        </div>
                      </div>

                      {/* Addable timings list inside each material row */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-primary">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>مواعيد الحصص الأسبوعية للمادة</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => addDynamicScheduleDay(row.id)}
                            className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] px-3 py-1 rounded-lg font-bold"
                          >
                            + إضافة موعد آخر للمادة
                          </button>
                        </div>

                        <div className="space-y-3">
                          {row.days.map((dayRow, dayIdx) => (
                            <div key={dayRow.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200/50 items-end">
                              <div>
                                <Label className="text-[10px] text-slate-600 font-bold block mb-1">اليوم</Label>
                                <select
                                  value={dayRow.day}
                                  onChange={(e) => updateDynamicScheduleDay(row.id, dayRow.id, 'day', e.target.value)}
                                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                                >
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
                              <div>
                                <Label className="text-[10px] text-slate-600 font-bold block mb-1">من (HH:mm)</Label>
                                <Input
                                  placeholder="14:00"
                                  value={dayRow.from}
                                  onChange={(e) => updateDynamicScheduleDay(row.id, dayRow.id, 'from', e.target.value)}
                                  className="h-9 text-xs bg-white border-slate-200 rounded-lg"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-600 font-bold block mb-1">إلى (HH:mm)</Label>
                                <Input
                                  placeholder="16:00"
                                  value={dayRow.to}
                                  onChange={(e) => updateDynamicScheduleDay(row.id, dayRow.id, 'to', e.target.value)}
                                  className="h-9 text-xs bg-white border-slate-200 rounded-lg"
                                />
                              </div>
                              <div className="flex justify-end">
                                {row.days.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDynamicScheduleDay(row.id, dayRow.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Central Trigger Button to Append Another dynamic subject registration */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={addDynamicRegistrationRow}
                  className="bg-primary/10 text-primary hover:bg-primary/20 font-black text-sm px-8 py-3 rounded-xl border-2 border-dashed border-primary/30 flex items-center gap-2 transition-all shadow-xs"
                >
                  <Plus className="h-5 w-5" />
                  <span>+ حجز باقة مادة دراسية إضافية للطالب في نفس الجلسة</span>
                </button>
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
                  <p>هذا القسم اختياري. يتم حساب المبلغ المطلوب تلقائياً بناءً على حزمة الحصص المسجلة، مع إمكانية التعديل وتفعيل نظام الأقساط.</p>
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
                    <Label htmlFor="initialPaidAmount" className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-emerald-600" />
                      <span>مبلغ الدفعة الأولى المستلمة (KWD) <span className="text-muted-foreground font-normal text-xs">(مستحسن تلقائي: {calculatedTotalAmount} KWD)</span></span>
                    </Label>
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

                {/* Conditionally reveal Price Override explanation input if calculated value deviates */}
                {watchInitialPaidAmount !== calculatedTotalAmount && calculatedTotalAmount > 0 && (
                  <div className="space-y-2 bg-amber-50 p-4 rounded-xl border border-amber-200 animate-in slide-in-from-top-2">
                    <Label htmlFor="overrideReason" className="font-bold text-amber-900 text-sm">سبب تعديل السعر / الخصم المستهدف <span className="text-red-500">*</span></Label>
                    <Input
                      id="overrideReason"
                      value={priceOverrideReason}
                      onChange={(e) => setPriceOverrideReason(e.target.value)}
                      required
                      placeholder="يرجى كتابة سبب التعديل (مثال: خصم الأشقاء، منحة تفوق، عرض مؤقت)..."
                      className="bg-white border-amber-300 h-11 text-sm rounded-lg text-slate-800"
                    />
                  </div>
                )}

                {/* Installment selection dropdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="isInstallment" className="font-bold text-slate-700 text-sm">نظام سداد الدفعات</Label>
                    <select
                      id="isInstallment"
                      value={isInstallment}
                      onChange={(e) => setIsInstallment(e.target.value)}
                      className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="no">دفع كامل المبلغ (Fully Paid)</option>
                      <option value="yes">تقسيط المبلغ على دفعات (Installments)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="font-bold text-slate-700 text-sm">طريقة الدفع المستعملة</Label>
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

                {/* Installments specific parameters */}
                {isInstallment === 'yes' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-100 shadow-inner animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="installmentsCount" className="font-bold text-slate-700 text-sm">عدد دفعات التقسيط المستهدفة</Label>
                      <Input
                        id="installmentsCount"
                        type="number"
                        min="2"
                        max="12"
                        value={installmentsCount}
                        onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 2)}
                        className="bg-white h-11 text-sm rounded-lg border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700 text-sm">قيمة كل دفعة مستحقة تلقائياً (KWD)</Label>
                      <div className="bg-white border border-slate-200 px-4 h-11 rounded-lg flex items-center justify-start text-base font-black text-primary">
                        {installmentValue} KWD
                      </div>
                      <p className="text-[10px] text-slate-400">محسوبة بناءً على تقسيم {watchInitialPaidAmount || calculatedTotalAmount} KWD على {installmentsCount} دفعات.</p>
                    </div>
                  </div>
                )}
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

      {/* Dynamic Inline Course Creation Dialog */}
      <FormDialog
        open={courseCreateOpen}
        onOpenChange={setCourseCreateOpen}
        title="إنشاء دورة دراسية جديدة"
        description="يرجى إدخال تفاصيل الدورة لكي تظهر فوراً في خيارات تسجيل الطلاب."
        saveText="إنشاء الدورة"
        isSubmitting={createCourseMutation.isPending}
        onSave={handleCreateCourseInline}
      >
        <div className="space-y-4 text-right" dir="rtl">
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">اسم الدورة الدراسية</Label>
            <Input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} placeholder="مثال: لغة فرنسية متقدمة" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">كود الدورة (رمز فريد)</Label>
            <Input value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())} placeholder="مثال: CRS-FRANCE" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">المادة العلمية</Label>
            <select
              value={newCourseSubject}
              onChange={(e) => setNewCourseSubject(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
            >
              <option value="رياضيات">رياضيات</option>
              <option value="لغة عربية">لغة عربية</option>
              <option value="لغة إنجليزية">لغة إنجليزية</option>
              <option value="فيزياء">فيزياء</option>
              <option value="كيمياء">كيمياء</option>
              <option value="لغات أخرى">لغات أخرى</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">المرحلة الدراسية المقررة</Label>
            <select
              value={newCourseGrade}
              onChange={(e) => setNewCourseGrade(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none"
            >
              <option value="تأسيس">تأسيس</option>
              <option value="ابتدائي">ابتدائي</option>
              <option value="متوسط">متوسط</option>
              <option value="ثانوي">ثانوي</option>
              <option value="جامعي">جامعي</option>
            </select>
          </div>
        </div>
      </FormDialog>

      {/* Dynamic Inline Teacher Creation Dialog */}
      <FormDialog
        open={teacherCreateOpen}
        onOpenChange={setTeacherCreateOpen}
        title="تسجيل معلم جديد بالسيستم"
        description="يرجى إدخال تفاصيل حساب المعلم الجديد لإنشاء ملف تعريفي فوراً."
        saveText="تسجيل المعلم"
        isSubmitting={createTeacherMutation.isPending}
        onSave={handleCreateTeacherInline}
      >
        <div className="space-y-4 text-right overflow-y-auto max-h-[50vh] px-1" dir="rtl">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">الاسم الأول</Label>
              <Input value={newTeacherFirst} onChange={(e) => setNewTeacherFirst(e.target.value)} placeholder="مثال: صالح" />
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-slate-700">اسم العائلة</Label>
              <Input value={newTeacherLast} onChange={(e) => setNewTeacherLast(e.target.value)} placeholder="مثال: العجمي" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">رقم هاتف المعلم</Label>
            <Input value={newTeacherPhone} onChange={(e) => setNewTeacherPhone(e.target.value)} placeholder="مثال: 99881122" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">البريد الإلكتروني (اختياري)</Label>
            <Input value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} placeholder="teacher@domain.com" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">التخصص الرئيسي / القسم</Label>
            <Input value={newTeacherSpec} onChange={(e) => setNewTeacherSpec(e.target.value)} placeholder="مثال: لغات، علوم، قدرات" />
          </div>
        </div>
      </FormDialog>
    </>
  );
};

export default StudentFormDialog;
