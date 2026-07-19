import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Users,
  Coins,
  Landmark,
  BookOpen,
  Award,
  User,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { teacherApi } from '../../teachers/services/teacherApi';
import { resolveAssetUrl } from '@/shared/utils/assets';
import ErrorState from '@/shared/components/ErrorState/ErrorState';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { formatMoney } from '@/shared/utils/money';
import { Button } from '@/shared/components/ui/button';

export const TeacherDashboard = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: teacherApi.getTeacherProfile,
  });

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const profile = data?.data || {};
  const user = profile.userId || {};
  const metrics = profile.metrics || {};

  return (
    <div className="space-y-6 md:space-y-8 text-right" dir="rtl">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card className="border-r-4 border-r-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 flex items-center justify-between">
                  <span>ساعات العمل المنفذة</span>
                  <Clock className="h-5 w-5 text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-800">{metrics.executedHours || 0} ساعة</div>
                <p className="text-xs text-slate-400 mt-1">إجمالي ساعات الحصص المكتملة</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-indigo-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 flex items-center justify-between">
                  <span>عدد الطلاب النشطين</span>
                  <Users className="h-5 w-5 text-indigo-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-800">{metrics.studentCount || 0} طالباً</div>
                <p className="text-xs text-slate-400 mt-1">الطلاب المسجلين في فصولك</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-emerald-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 flex items-center justify-between">
                  <span>صافي المستحقات الحالية</span>
                  <Coins className="h-5 w-5 text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600">{formatMoney(metrics.netDue || 0)}</div>
                <p className="text-xs text-slate-400 mt-1">الرصيد الفعلي الجاهز للصرف</p>
              </CardContent>
            </Card>

            <Card className="border-r-4 border-r-amber-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 flex items-center justify-between">
                  <span>المبالغ بانتظار الصرف</span>
                  <Landmark className="h-5 w-5 text-amber-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600">{formatMoney(metrics.remainingDue || 0)}</div>
                <p className="text-xs text-slate-400 mt-1">تحت المراجعة والاعتماد المالي</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Info & Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 shadow-sm space-y-6">
              <div className="border-b pb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <h3 className="text-xl font-black text-slate-800">توزيع الحصص والنشاط المهني</h3>
                  <p className="text-xs text-slate-500">نظرة عامة على الكفاءة الأكاديمية ونشاط التدريس للمواد المختلفة.</p>
                </div>
                <Button asChild size="sm" className="h-10 rounded-xl gap-2 font-bold shrink-0">
                  <Link to="/teacher/profile">
                    <span>عرض الملف الوظيفي</span>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subjects Cards */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span>المواد المسندة إليك:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects && profile.subjects.length > 0 ? (
                      profile.subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-primary/5 text-primary text-xs font-bold rounded-xl border border-primary/10 shadow-sm"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">لا توجد مواد مسجلة حالياً.</span>
                    )}
                  </div>
                </div>

                {/* Grades Cards */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <GraduationCap className="h-5 w-5 text-indigo-500" />
                    <span>المراحل التعليمية المسؤولة:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.gradesTaught && profile.gradesTaught.length > 0 ? (
                      profile.gradesTaught.map((grade, i) => (
                        <span
                          key={i}
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 shadow-sm"
                        >
                          {grade}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">لا توجد مراحل مسجلة حالياً.</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              {/* Profile Card */}
              <Card className="p-6 bg-gradient-to-br from-primary to-primary/90 text-white rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-white/20 border-2 border-white/40 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {user.avatarUrl ? (
                        <img src={resolveAssetUrl(user.avatarUrl)} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-white" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold truncate">{user.firstName} {user.lastName}</h4>
                      <p className="text-xs text-white/70 font-semibold">{profile.department || 'قسم التدريس'}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/20 pt-4 space-y-2.5 text-sm font-semibold">
                    <div className="flex justify-between items-center text-white/80">
                      <span>سنوات الخبرة:</span>
                      <span className="text-white">{profile.experienceYears || 0} سنوات</span>
                    </div>
                    <div className="flex justify-between items-center text-white/80">
                      <span>التقييم العام:</span>
                      <span className="text-amber-300 font-bold">★ {profile.rating || 5.0} / 5</span>
                    </div>
                    <div className="flex justify-between items-center text-white/80">
                      <span>كود الموظف:</span>
                      <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded">{profile.employeeCode || '—'}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Actions Card */}
              <Card className="p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 text-base">إجراءات سريعة</h4>
                <div className="grid grid-cols-1 gap-3">
                  <Button asChild variant="outline" className="h-12 w-full justify-start font-bold rounded-xl gap-2 hover:bg-slate-50">
                    <Link to="/teacher/profile">
                      <Award className="h-5 w-5 text-primary" />
                      <span>عرض تقارير الأداء</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 w-full justify-start font-bold rounded-xl gap-2 hover:bg-slate-50">
                    <Link to="/teachers/settlement">
                      <Coins className="h-5 w-5 text-emerald-500" />
                      <span>تسويات مستحقات المعلم</span>
                    </Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
