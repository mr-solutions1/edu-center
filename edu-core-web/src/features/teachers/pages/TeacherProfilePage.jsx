import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  MapPin,
  Award,
  Clock,
  Users,
  Landmark,
  Coins,
  Edit2,
  Save,
  X,
  Globe
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { resolveAssetUrl } from '@/shared/utils/assets';
import { z } from 'zod';
import { toast } from 'sonner';

import { teacherApi } from '../services/teacherApi';

import ErrorState from '@/shared/components/ErrorState/ErrorState';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { formatMoney } from '@/shared/utils/money';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useFormErrorHandler } from '@/shared/hooks/useFormErrorHandler';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';

const editProfileSchema = z.object({
  firstName: z.string().min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل'),
  lastName: z.string().min(2, 'الاسم الأخير يجب أن يكون حرفين على الأقل'),
  phone: z.string().min(6, 'رقم الهاتف يجب أن يكون 6 أرقام على الأقل'),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  googleMapsUrl: z.string().url('رابط جوجل ماب غير صالح').or(z.literal('')).optional(),
  bio: z.string().optional(),
});

const TeacherProfilePage = () => {
  const queryClient = useQueryClient();
  const { handleFormError } = useFormErrorHandler();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: teacherApi.getTeacherProfile,
  });

  const profile = data?.data || {};
  const user = profile.userId || {};
  const metrics = profile.metrics || {};

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editProfileSchema),
  });

  // Sync form default values when data is loaded
  useEffect(() => {
    if (profile && user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        whatsapp: profile.whatsapp || '',
        address: profile.address || '',
        googleMapsUrl: profile.googleMapsUrl || '',
        bio: profile.bio || '',
      });
    }
  }, [profile, user, reset]);

  const updateMutation = useMutation({
    mutationFn: teacherApi.updateTeacherProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      toast.success('تم تحديث البيانات الشخصية بنجاح / Profile updated successfully.');
      setIsEditDialogOpen(false);
    },
    onError: (err) => {
      handleFormError(err, setError);
    },
  });

  const onSubmit = (formData) => {
    updateMutation.mutate(formData);
  };

  const uploadMutation = useMutation({
    mutationFn: teacherApi.uploadProfileFiles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      toast.success('تم رفع المستند بنجاح / Document uploaded successfully.');
    },
    onError: (err) => {
      toast.error(err.message || 'فشل في رفع المستند / Failed to upload document.');
    },
  });

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(fieldName, file);
    uploadMutation.mutate(formData);
  };

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="الملف الشخصي والمالي للمعلم"
          description="بيانات الأداء المهني والاستحقاقات المالية الحالية"
        />
        {!isLoading && (
          <div className="flex flex-wrap gap-3">
            <Link to="/teachers/portfolio/me">
              <Button
                variant="outline"
                className="h-11 rounded-xl font-bold gap-2 border-slate-200 shrink-0"
              >
                <Globe className="h-4 w-4 text-primary" />
                عرض ومشاركة ملفي التعريفي
              </Button>
            </Link>
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              className="h-11 rounded-xl font-bold gap-2 bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 shrink-0"
            >
              <Edit2 className="h-4 w-4" />
              تعديل الملف الشخصي / Edit Profile
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-xl" />
      ) : (
        <div className="space-y-6">
          {/* Real-time Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-r-4 border-r-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>ساعات العمل المنفذة</span>
                  <Clock className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.executedHours || 0} ساعة</div>
                <p className="text-xs text-muted-foreground mt-1">الحصص المكتملة</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>عدد الطلاب</span>
                  <Users className="h-4 w-4 text-green-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.studentCount || 0} طالب</div>
                <p className="text-xs text-muted-foreground mt-1">الطلاب المسجلين معك</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>صافي الراتب المستحق</span>
                  <Coins className="h-4 w-4 text-amber-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatMoney(metrics.netDue || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">بعد خصومات الانتقالات</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>المستحقات المعلقة</span>
                  <Landmark className="h-4 w-4 text-red-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatMoney(metrics.remainingDue || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">بانتظار الصرف من الإدارة</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border rounded-xl p-8 shadow-sm">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-right">
                  <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={resolveAssetUrl(user.avatarUrl)}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-16 w-16 text-primary" />
                    )}
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <h2 className="text-3xl font-black text-primary">
                        {user.firstName} {user.lastName}
                      </h2>
                      <p className="text-muted-foreground font-medium mt-1">
                        {profile.department} | {profile.employeeCode}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-primary/60" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-primary/60" />
                        <span dir="ltr">{user.phone}</span>
                      </div>
                      {profile.whatsapp && (
                        <div className="flex items-center gap-3 text-sm col-span-full">
                          <svg className="h-4 w-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.978L2 22l5.177-1.359a9.943 9.96 0 0 0 4.832 1.343h.005c5.507 0 9.991-4.478 9.992-9.986.001-2.671-2.12-5.181-4.103-7.16A9.916 9.916 0 0 0 12.012 2zm5.835 14.165c-.244.688-1.21 1.259-1.663 1.311-.453.052-.906.079-2.909-.75-2.003-.829-3.28-2.883-3.38-3.018-.1-.135-.807-1.072-.807-2.045 0-.973.51-1.45.692-1.642.182-.192.398-.24.53-.24s.265.002.38.008c.12.006.278-.045.435.334.157.38.54 1.317.587 1.41.047.094.079.204.016.33-.063.125-.094.204-.188.314-.094.11-.198.245-.282.33-.094.094-.193.197-.083.371.11.174.488.805 1.05 1.306.721.643 1.328.841 1.516.924.188.083.298.069.41-.06.11-.13.48-.56.608-.753.125-.188.25-.157.422-.094.173.063 1.1.518 1.288.613.188.094.314.141.361.22.047.079.047.456-.197 1.144z"/>
                          </svg>
                          <span dir="ltr">{profile.whatsapp}</span>
                        </div>
                      )}
                      {profile.address && (
                        <div className="flex items-center gap-3 text-sm col-span-full">
                          <MapPin className="h-4 w-4 text-primary/60" />
                          <span>{profile.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-xl p-8 shadow-sm space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  الخبرات والمهارات
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-muted-foreground">
                      المواد الدراسية
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.subjects?.map((sub, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-secondary/10 text-secondary-foreground text-xs font-bold rounded-full"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-muted-foreground">
                      المراحل التعليمية
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.gradesTaught?.map((grade, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-primary/5 text-primary text-xs font-bold rounded-full"
                        >
                          {grade}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 col-span-full">
                    <h4 className="font-bold text-sm text-muted-foreground">
                      نبذة شخصية
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-600 italic">
                      {profile.bio || 'لا توجد نبذة شخصية مضافة حالياً'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="space-y-6">
              <div className="bg-primary text-primary-foreground rounded-xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-lg">الإحصائيات المهنية</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-sm text-primary-foreground/70">
                      سنوات الخبرة
                    </span>
                    <span className="font-bold">
                      {profile.experienceYears} سنة
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="text-sm text-primary-foreground/70">
                      التقييم العام
                    </span>
                    <span className="font-bold text-secondary">
                      ★ {profile.rating} / 5
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-primary-foreground/70">
                      تاريخ الانضمام
                    </span>
                    <span className="font-bold">
                      {profile.hireDate
                        ? new Date(profile.hireDate).toLocaleDateString('ar-KW')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  المستندات / Attached Documents
                </h3>
                <div className="space-y-3">
                  {/* File Inputs (Hidden) */}
                  <input
                    type="file"
                    id="cv-upload"
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'cv')}
                  />
                  <input
                    type="file"
                    id="certificates-upload"
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'certificates')}
                  />

                  {/* CV Row */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-4">
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-bold">السيرة الذاتية (CV)</span>
                      <span className="text-[10px] text-slate-400">PDF, Word, or Images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.cvUrl && (
                        <a
                          href={resolveAssetUrl(profile.cvUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary font-bold hover:underline bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm"
                        >
                          عرض / View
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadMutation.isPending}
                        onClick={() => document.getElementById('cv-upload').click()}
                        className="h-8 rounded-lg text-xs font-bold gap-1 border-slate-200"
                      >
                        {uploadMutation.isPending ? 'جاري الرفع...' : profile.cvUrl ? 'تحديث / Update' : 'إرفاق / Upload'}
                      </Button>
                    </div>
                  </div>

                  {/* Certificates Row */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-4">
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-bold">الشهادات العلمية</span>
                      <span className="text-[10px] text-slate-400">PDF, Word, or Images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.certificatesUrl && (
                        <a
                          href={resolveAssetUrl(profile.certificatesUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary font-bold hover:underline bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm"
                        >
                          عرض / View
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadMutation.isPending}
                        onClick={() => document.getElementById('certificates-upload').click()}
                        className="h-8 rounded-lg text-xs font-bold gap-1 border-slate-200"
                      >
                        {uploadMutation.isPending ? 'جاري الرفع...' : profile.certificatesUrl ? 'تحديث / Update' : 'إرفاق / Upload'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl w-[95%] rounded-2xl p-6 gap-6 overflow-hidden border border-slate-100 shadow-2xl bg-white text-right" dir="rtl">
          <DialogHeader className="flex flex-col items-start space-y-1">
            <DialogTitle className="text-lg font-bold text-slate-800">تعديل ملفك الشخصي</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">تحديث تفاصيلك الشخصية ومعلومات الاتصال.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">الاسم الأول</label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  className={errors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.firstName && <span className="text-red-500 text-[10px]">{errors.firstName.message}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">الاسم الأخير</label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  className={errors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.lastName && <span className="text-red-500 text-[10px]">{errors.lastName.message}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">رقم الهاتف</label>
                <Input
                  id="phone"
                  {...register('phone')}
                  className={errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.phone && <span className="text-red-500 text-[10px]">{errors.phone.message}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">رقم الواتساب (اختياري)</label>
                <Input
                  id="whatsapp"
                  {...register('whatsapp')}
                  className={errors.whatsapp ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.whatsapp && <span className="text-red-500 text-[10px]">{errors.whatsapp.message}</span>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">العنوان</label>
                <Input
                  id="address"
                  {...register('address')}
                  className={errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.address && <span className="text-red-500 text-[10px]">{errors.address.message}</span>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">رابط خريطة جوجل (جوجل ماب)</label>
                <Input
                  id="googleMapsUrl"
                  placeholder="https://maps.google.com/..."
                  {...register('googleMapsUrl')}
                  className={errors.googleMapsUrl ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.googleMapsUrl && <span className="text-red-500 text-[10px]">{errors.googleMapsUrl.message}</span>}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">نبذة شخصية</label>
                <textarea
                  id="bio"
                  rows="3"
                  className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-slate-700 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('bio')}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="h-11 rounded-xl font-bold gap-2 shrink-0 border-slate-200"
              >
                <X className="h-4 w-4" />
                إلغاء / Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl font-bold gap-2 bg-primary text-white hover:bg-primary/95 shadow-lg shadow-primary/20 shrink-0"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ التغييرات / Save Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherProfilePage;
