import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, CreditCard, Award, Activity, Heart, Clock, AlertCircle } from 'lucide-react';
import React from 'react';

import { studentApi } from '@/features/students/services/studentApi';
import { useAuth } from '@/features/auth/AuthContext';
import StatCard from '@/shared/components/StatCard/StatCard';
import StatusBadge from '@/shared/components/StatusBadge/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { formatDate } from '@/shared/utils/date';

const ParentDashboard = () => {
  const { accessToken, isAuthenticated } = useAuth();

  const { data: portalData, isLoading, isError } = useQuery({
    queryKey: ['parent-portal-dashboard'],
    queryFn: () => studentApi.getParentDashboard(),
    enabled: isAuthenticated && !!accessToken,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 font-bold bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 justify-center">
        <AlertCircle className="h-5 w-5" />
        حدث خطأ أثناء تحميل بيانات لوحة ولي الأمر
      </div>
    );
  }

  const { children, upcomingLessons, outstandingPayments, recentActivities } = portalData?.data || {};

  // Compute metrics
  const totalDueAmount = children?.reduce((sum, child) => sum + (child.balances?.outstandingBalance || 0), 0) || 0;

  return (
    <div className="space-y-8 text-right" dir="rtl">

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="عدد الأبناء المسجلين"
          value={children?.length || 0}
          icon={Users}
        />
        <StatCard
          label="المبلغ المستحق (الرصيد المشترك)"
          value={`KD ${(totalDueAmount / 1000).toFixed(3)}`}
          icon={CreditCard}
        />
        <StatCard
          label="الحصص القادمة مجتمعة"
          value={upcomingLessons?.length || 0}
          icon={Calendar}
        />
      </div>

      {/* Children List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
          الأبناء المتابعين
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {children?.length > 0 ? (
            children.map(({ student, relationship, isPrimary }) => (
              <Card key={student?._id} className="shadow-md border border-slate-200 hover:border-secondary/40 transition-all">
                <CardHeader className="bg-slate-50 border-b p-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-black text-primary">{student?.parentName}</CardTitle>
                    <CardDescription className="text-[10px] mt-1 font-bold">المرحلة: {student?.grade}</CardDescription>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isPrimary ? 'bg-secondary/10 text-secondary' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {relationship === 'FATHER' ? 'الأب' : relationship === 'MOTHER' ? 'الأم' : 'متابع'}
                  </span>
                </CardHeader>
                <CardContent className="p-4 text-xs font-bold text-slate-600 space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">رمز الطالب:</span>
                    <span className="font-mono text-primary font-black">{student?.studentCode}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">المنطقة السكنية:</span>
                    <span className="text-primary font-black">{student?.area || 'غير مسجل'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-400">تاريخ الالتحاق:</span>
                    <span className="text-primary font-black">{formatDate(student?.enrollmentDate, 'yyyy/MM/dd')}</span>
                  </div>
                  {balances && (
                    <>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-400">الساعات المتبقية:</span>
                        <span className="text-secondary font-black">{balances.remainingHours} ساعة</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">مستحقات الابن:</span>
                        <span className={balances.outstandingBalance > 0 ? 'text-red-500 font-black' : 'text-emerald-500 font-black'}>
                          KD {(balances.outstandingBalance / 1000).toFixed(3)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic col-span-3 text-center py-8">لا يوجد طلاب مرتبطون بهذا الحساب</p>
          )}
        </div>
      </div>

      {/* Upcoming Lessons & Outstanding Payments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Children Schedules */}
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-base font-black text-primary flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary" />
              الحصص القادمة للأبناء
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
            {upcomingLessons?.length > 0 ? (
              upcomingLessons.map((lesson) => (
                <div key={lesson._id} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm">
                  <div>
                    <p className="text-sm font-black text-slate-800">{lesson.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      الطالب: {lesson.studentId?.parentName} • المعلم: أ/ {lesson.teacherId?.firstName} {lesson.teacherId?.lastName}
                    </p>
                  </div>
                  <div className="text-left space-y-1">
                    <p className="text-xs font-black text-slate-700">{formatDate(lesson.lessonDate, 'yyyy/MM/dd')}</p>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {lesson.startTime}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-8 text-center">لا توجد حصص مجدولة للأبناء قريباً</p>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-base font-black text-primary flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-secondary" />
              الفواتير والمدفوعات المستحقة للأبناء
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
            {outstandingPayments?.length > 0 ? (
              outstandingPayments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm">
                  <div>
                    <p className="text-sm font-black text-slate-800">قيمة الفاتورة: {(payment.amount / 1000).toFixed(3)} KD</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      الطالب: {payment.studentId?.parentName} • الاستحقاق: {formatDate(payment.dueDate, 'yyyy/MM/dd')}
                    </p>
                  </div>
                  <div className="text-left">
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-8 text-center">لا توجد فواتير أو مستحقات مالية معلقة</p>
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
};

export default ParentDashboard;
