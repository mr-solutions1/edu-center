import { useQuery } from '@tanstack/react-query';
import { User, Phone, Mail, GraduationCap, MapPin, Award } from 'lucide-react';
import React from 'react';

import { teacherApi } from '../services/teacherApi';

import ErrorState from '@/shared/components/ErrorState/ErrorState';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Skeleton } from '@/shared/components/ui/skeleton';

const TeacherProfilePage = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: teacherApi.getTeacherProfile,
  });

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const profile = data?.data || {};
  const user = profile.userId || {};

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader
        title="الملف الشخصي"
        description="عرض وتعديل بياناتك المهنية"
      />

      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-xl p-8 shadow-sm">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-right">
                <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
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
                    {new Date(profile.hireDate).toLocaleDateString('ar-KW')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                المستندات
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    السيرة الذاتية (CV)
                  </span>
                  {profile.cvUrl ? (
                    <a
                      href={profile.cvUrl}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      عرض
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      غير متوفر
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">الشهادات العلمية</span>
                  {profile.certificatesUrl ? (
                    <a
                      href={profile.certificatesUrl}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      عرض
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      غير متوفر
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfilePage;
