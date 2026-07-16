import { useQuery } from '@tanstack/react-query';
import { Calendar, CreditCard, Award, BookOpen, Clock, AlertCircle } from 'lucide-react';
import React from 'react';

import { studentApi } from '@/features/students/services/studentApi';
import { useAuth } from '@/features/auth/AuthContext';
import StatCard from '@/shared/components/StatCard/StatCard';
import StatusBadge from '@/shared/components/StatusBadge/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { formatDate } from '@/shared/utils/date';

const StudentDashboard = () => {
  const { accessToken, isAuthenticated } = useAuth();

  const { data: portalData, isLoading, isError } = useQuery({
    queryKey: ['student-portal-dashboard'],
    queryFn: () => studentApi.getStudentDashboard(),
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 font-bold bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 justify-center">
        <AlertCircle className="h-5 w-5" />
        حدث خطأ أثناء تحميل بيانات لوحة الطالب
      </div>
    );
  }

  const { profile, upcomingLessons, recentAttendance, payments, outstandingBalance, groups } =
    portalData?.data || {};

  return (
    <div className="space-y-8 text-right" dir="rtl">

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="المبلغ المستحق"
          value={`KD ${(outstandingBalance / 1000).toFixed(3)}`}
          icon={CreditCard}
        />
        <StatCard
          label="المجموعات الدراسية"
          value={groups?.length || 0}
          icon={BookOpen}
        />
        <StatCard
          label="الحصص القادمة"
          value={upcomingLessons?.length || 0}
          icon={Calendar}
        />
      </div>

      {/* Profile & Groups Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Student Profile Card */}
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-base font-black text-primary">ملف الطالب</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs font-bold text-slate-600">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">رمز الطالب:</span>
              <span className="font-mono text-primary font-black">{profile?.studentCode}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">المرحلة الدراسية:</span>
              <span className="text-primary font-black">{profile?.grade}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">اسم ولي الأمر:</span>
              <span className="text-primary font-black">{profile?.parentName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">هاتف المتابعة:</span>
              <span className="text-primary font-black font-mono">{profile?.parentPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">المنطقة السكنية:</span>
              <span className="text-primary font-black">{profile?.area || 'غير مسجل'}</span>
            </div>
          </CardContent>
        </Card>

        {/* My Registered Classes/Groups */}
        <Card className="lg:col-span-2 shadow-md border border-slate-200">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-base font-black text-primary">المجموعات المقيد بها</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {groups?.length > 0 ? (
              groups.map((g) => (
                <div key={g._id} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">{g.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1">الدورة: {g.courseId?.name || 'مخصص'}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] bg-secondary/10 text-secondary px-3 py-1 rounded-full font-black">
                      {g.courseId?.subject || 'مادة تخصصية'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-8 text-center">لست مقيداً بأي مجموعات دراسية حالياً</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lessons Schedule & Payments History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Schedule */}
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50">
            <CardTitle className="text-base font-black text-primary flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary" />
              جدول حصصي القادمة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
            {upcomingLessons?.length > 0 ? (
              upcomingLessons.map((lesson) => (
                <div key={lesson._id} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm">
                  <div>
                    <p className="text-sm font-black text-slate-800">{lesson.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">المعلم: أ/ {lesson.teacherId?.firstName} {lesson.teacherId?.lastName}</p>
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
              <p className="text-xs text-slate-400 italic py-8 text-center">لا توجد حصص مجدولة حالياً</p>
            )}
          </CardContent>
        </Card>

        {/* Payments/Invoices history */}
        <Card className="shadow-md border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50">
            <CardTitle className="text-base font-black text-primary flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-secondary" />
              كشف الفواتير والمدفوعات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
            {payments?.length > 0 ? (
              payments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-3 border rounded-xl bg-white shadow-sm">
                  <div>
                    <p className="text-sm font-black text-slate-800">قيمة الدفعة: {(payment.amount / 1000).toFixed(3)} KD</p>
                    <p className="text-[10px] text-slate-400 mt-1">تاريخ الاستحقاق: {formatDate(payment.dueDate, 'yyyy/MM/dd')}</p>
                  </div>
                  <div className="text-left">
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-8 text-center">لا توجد سجلات فواتير أو مدفوعات حالياً</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default StudentDashboard;
