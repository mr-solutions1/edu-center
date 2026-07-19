import { useQuery } from '@tanstack/react-query';
import {
  User,
  GraduationCap,
  Award,
  Clock,
  Share2,
  CheckCircle,
  Copy,
  ChevronLeft,
  Calendar,
} from 'lucide-react';
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';

import { teacherApi } from '../services/teacherApi';

import ErrorState from '@/shared/components/ErrorState/ErrorState';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';

const TeacherPortfolioPage = () => {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);

  // If id is 'me', we fetch the logged-in teacher's profile.
  // Otherwise, we fetch the public teacher profile.
  const isMe = id === 'me';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher-portfolio', id],
    queryFn: () => {
      if (isMe) {
        return teacherApi.getTeacherProfile();
      }
      return teacherApi.getPublicTeacherProfile(id);
    },
  });

  const profile = data?.data || {};
  const user = profile.userId || {};

  const handleShare = async () => {
    try {
      // Create shareable URL pointing to this teacher's portfolio
      const shareUrl = isMe
        ? `${window.location.origin}/teachers/portfolio/${profile._id}`
        : window.location.href;

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('تم نسخ رابط الملف الشخصي بنجاح / Profile link copied successfully!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('فشل في نسخ الرابط / Failed to copy link.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6 text-right" dir="rtl">
        <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 col-span-2 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto p-8 text-center" dir="rtl">
        <ErrorState error={error} onRetry={refetch} />
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    );
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 pt-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Upper Action Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
          <Link
            to={isMe ? '/dashboard' : '/'}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
            <span>الرجوع للرئيسية</span>
          </Link>

          <Button
            onClick={handleShare}
            className="gap-2 h-10 rounded-xl bg-primary hover:bg-primary/95 text-white px-4 font-bold text-xs"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {copied ? 'تم النسخ!' : 'مشاركة الملف الشخصي'}
          </Button>
        </div>

        {/* Profile Card Main Hero */}
        <div className="relative bg-gradient-to-br from-primary to-primary-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl overflow-hidden">
          {/* Background decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none -ml-24 -mb-24" />

          <div className="relative flex flex-col md:flex-row items-center md:items-start text-center md:text-right gap-8">
            {/* Avatar container */}
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-white/10 p-1.5 border-4 border-white/20 shadow-2xl shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={fullName}
                  className="h-full w-full rounded-full object-cover bg-white"
                />
              ) : (
                <div className="h-full w-full rounded-full bg-primary-800 flex items-center justify-center">
                  <User className="h-16 w-16 text-white/80" />
                </div>
              )}
            </div>

            <div className="space-y-4 flex-1">
              {/* Prestigious verification badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold">
                <CheckCircle className="h-3.5 w-3.5 text-secondary" />
                <span>معلم معتمد ومسجل لدى معهد ألفا العالمي</span>
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                  أستاذ / {fullName || 'معلم ألفا'}
                </h1>
                <p className="text-white/80 text-sm md:text-base font-semibold mt-1">
                  {profile.department || 'القسم الأكاديمي'} | {profile.employeeCode || 'TCH-ALPHA'}
                </p>
              </div>

              {/* Ratings and brief info */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1">
                <div className="bg-secondary text-secondary-foreground px-3.5 py-1 rounded-full text-xs font-bold shadow-lg shadow-secondary/20">
                  ★ {profile.rating || 5} / 5 التقييم العام
                </div>
                <div className="text-xs text-white/80 border-r border-white/20 pr-4 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-white/60" />
                  <span>{profile.experienceYears || 0} سنوات خبرة</span>
                </div>
                {profile.hireDate && (
                  <div className="text-xs text-white/80 border-r border-white/20 pr-4 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-white/60" />
                    <span>انضم للأكاديمية {new Date(profile.hireDate).getFullYear()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Right Column (General Bio / Summary) */}
          <div className="md:col-span-2 space-y-6">
            <Card className="rounded-2xl border shadow-sm p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                نبذة تعريفية عن المعلم
              </h2>
              <p className="text-slate-600 leading-relaxed italic text-sm md:text-base bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {profile.bio || 'لا توجد نبذة شخصية مضافة حالياً. هذا المعلم من الكفاءات المتميزة في معهد ألفا العالمي.'}
              </p>
            </Card>

            <Card className="rounded-2xl border shadow-sm p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                المراحل الدراسية والمناهج
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Subjects */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    المواد التي يدرسها
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects && profile.subjects.length > 0 ? (
                      profile.subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="px-3.5 py-1.5 bg-primary/5 text-primary text-xs font-bold rounded-xl border border-primary/10"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">لا توجد مواد محددة</span>
                    )}
                  </div>
                </div>

                {/* Grades */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    المراحل والصفوف الدراسية
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.gradesTaught && profile.gradesTaught.length > 0 ? (
                      profile.gradesTaught.map((grade, i) => (
                        <span
                          key={i}
                          className="px-3.5 py-1.5 bg-secondary/10 text-secondary-foreground text-xs font-bold rounded-xl"
                        >
                          {grade}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">لا توجد صفوف محددة</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Left Column (Quick Bio Stats Card) */}
          <div className="space-y-6">
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white p-6 space-y-2">
                <h3 className="font-bold text-base">بطاقة المعلم المهنية</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  معلومات موثقة ومعتمدة من الإدارة العامة للمعهد العالمي.
                </p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-xs font-bold text-slate-400">سنوات الخبرة</span>
                  <span className="text-sm font-bold text-slate-800">{profile.experienceYears || 0} سنوات</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-xs font-bold text-slate-400">التخصص الحالي</span>
                  <span className="text-sm font-bold text-slate-800">{profile.department || 'أكاديمي'}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-xs font-bold text-slate-400">حالة الاعتماد</span>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    نشط ومعتمد
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Share Info Box */}
            <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200/60 text-center space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                هل تريد مشاركة هذا الملف التعريفي مع أولياء الأمور أو الطلاب؟ انسخ رابط المشاركة المباشر الآن.
              </p>
              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full h-11 rounded-xl font-bold text-xs gap-2 border-slate-300 hover:bg-slate-200/50"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>نسخ رابط المشاركة المباشر</span>
              </Button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TeacherPortfolioPage;
