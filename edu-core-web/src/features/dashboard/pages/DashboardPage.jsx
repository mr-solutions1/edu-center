import { useQuery } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  Calendar,
  GraduationCap,
  CheckCircle,
  Activity,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { dashboardApi } from '../services/dashboardApi';

import { activityLogApi } from '@/features/activity-log/services/activityLogApi';
import { useAuth } from '@/features/auth/AuthContext';
import ErrorState from '@/shared/components/ErrorState/ErrorState';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import StatCard from '@/shared/components/StatCard/StatCard';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';

import StudentDashboard from '../components/StudentDashboard';
import ParentDashboard from '../components/ParentDashboard';

const DashboardPage = () => {
  const { user, accessToken, isAuthenticated } = useAuth();

  React.useEffect(() => {
    console.info(`[EVIDENCE_TRACE] [${new Date().toISOString()}] DASHBOARD_MOUNT - User: ${user?.id || user?._id}`);
  }, [user]);

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const isStudent = user?.role === 'STUDENT';
  const isParent = user?.role === 'PARENT';

  // Customizable Widgets States
  const storageKey = `dashboard_widgets_${user?.id || 'guest'}`;
  const defaultWidgets = {
    students: true,
    teachers: true,
    lessons: true,
    revenue: true,
  };

  const [activeWidgets, setActiveWidgets] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultWidgets;
  });

  const [isCustomizing, setIsCustomizing] = useState(false);

  const toggleWidget = (key) => {
    const updated = { ...activeWidgets, [key]: !activeWidgets[key] };
    setActiveWidgets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast.success('تم تحديث إعداد التخطيط الشخصي للوحة التحكم');
  };

  // Unified redirection for Student Portal
  if (isStudent) {
    return (
      <div className="space-y-6">
        <PageHeader title="بوابة الطالب" description={`أهلاً بك مجدداً، ${user?.firstName} ${user?.lastName}`} />
        <StudentDashboard />
      </div>
    );
  }

  // Unified redirection for Parent Portal
  if (isParent) {
    return (
      <div className="space-y-6">
        <PageHeader title="بوابة ولي الأمر" description={`أهلاً بك مجدداً، ${user?.firstName} ${user?.lastName}`} />
        <ParentDashboard />
      </div>
    );
  }

  const isOverviewQueryEnabled = isAuthenticated && !!accessToken && !isStudent && !isParent;
  console.info(`[EVIDENCE_TRACE] [${new Date().toISOString()}] QUERY_ENABLED - dashboard-overview: ${isOverviewQueryEnabled}`);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    enabled: isOverviewQueryEnabled,
  });

  const isLogsQueryEnabled = isAuthenticated && !!accessToken && !!isAdmin && !isStudent && !isParent;
  console.info(`[EVIDENCE_TRACE] [${new Date().toISOString()}] QUERY_ENABLED - recent-activity: ${isLogsQueryEnabled}`);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => activityLogApi.getLogs({ limit: 5 }),
    enabled: isLogsQueryEnabled,
  });

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const stats = data?.data || {};

  return (
    <div className="space-y-6 md:space-y-8 text-right" dir="rtl">

      {/* Page Header with customized layout builders */}
      <PageHeader
        title="لوحة التحكم"
        description={`أهلاً بك مجدداً، ${user?.firstName} ${user?.lastName}`}
      >
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="rounded-xl text-xs font-bold border-secondary/30 text-secondary w-full sm:w-auto h-10 px-4"
          >
            {isCustomizing ? 'إغلاق التخصيص' : 'تخصيص الـ Widgets'}
          </Button>
        )}
      </PageHeader>

      {/* Mini Widget Builder Drawer/Toggle Area */}
      {isAdmin && isCustomizing && (
        <Card className="border border-secondary/20 shadow-md bg-secondary/5 rounded-3xl p-4 animate-fadeIn">
          <CardHeader className="p-0 pb-3 border-b border-secondary/10">
            <CardTitle className="text-xs font-black text-secondary">إعدادات تخصيص وترتيب بطاقات الأداء</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-700">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeWidgets.students}
                onChange={() => toggleWidget('students')}
                className="h-4 w-4 rounded accent-secondary"
              />
              إجمالي الطلاب
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeWidgets.teachers}
                onChange={() => toggleWidget('teachers')}
                className="h-4 w-4 rounded accent-secondary"
              />
              إجمالي المعلمين
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeWidgets.lessons}
                onChange={() => toggleWidget('lessons')}
                className="h-4 w-4 rounded accent-secondary"
              />
              الحصص النشطة
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeWidgets.revenue}
                onChange={() => toggleWidget('revenue')}
                className="h-4 w-4 rounded accent-secondary"
              />
              الإيرادات المالية
            </label>
          </CardContent>
        </Card>
      )}

      {/* Render StatCards based on layout builder settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-2xl" />
          ))
        ) : (
          <>
            {isAdmin && activeWidgets.students && stats.totalStudents !== undefined && (
              <StatCard
                label="إجمالي الطلاب"
                value={stats.totalStudents}
                icon={Users}
              />
            )}
            {isAdmin && activeWidgets.teachers && stats.totalTeachers !== undefined && (
              <StatCard
                label="إجمالي المعلمين"
                value={stats.totalTeachers}
                icon={GraduationCap}
              />
            )}
            {isAdmin && activeWidgets.lessons && stats.activeLessons !== undefined && (
              <StatCard
                label="الحصص النشطة"
                value={stats.activeLessons}
                icon={Calendar}
              />
            )}
            {isAdmin && activeWidgets.revenue && stats.monthlyRevenue !== undefined && (
              <StatCard
                label="الإيرادات الشهرية"
                value={`KD ${stats.monthlyRevenue}`}
                icon={DollarSign}
                trend={stats.revenueTrend}
                trendValue={stats.revenueTrendValue}
              />
            )}

            {isTeacher && (
              <>
                <StatCard
                  label="حصصي القادمة (هذا الشهر)"
                  value={stats.upcomingLessonsCount}
                  icon={Calendar}
                />
                <StatCard
                  label="حصصي المكتملة (هذا الشهر)"
                  value={stats.completedLessonsCount}
                  icon={CheckCircle}
                />
              </>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {isTeacher ? (
          <div className="bg-card border rounded-2xl p-5 md:p-6 space-y-4 shadow-sm bg-white">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              حصصي القادمة
            </h3>
            <div className="space-y-3">
              {stats.upcomingLessons?.length > 0 ? (
                stats.upcomingLessons.map((lesson) => (
                  <div
                    key={lesson._id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800">{lesson.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        الطالب: {lesson.studentId?.parentName}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black text-slate-800">
                        {new Date(lesson.lessonDate).toLocaleDateString(
                          'ar-KW'
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {lesson.startTime}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  لا توجد حصص قادمة مجدولة حالياً
                </p>
              )}
              <Button asChild variant="outline" className="w-full rounded-xl h-11 text-xs font-bold">
                <Link to="/scheduling">عرض الجدول الكامل</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-10 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
            <h3 className="font-bold text-sm sm:text-base text-slate-800">
              الجدول الزمني العام
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground/60 italic max-w-xs leading-relaxed">
              يمكنك متابعة كافة الحصص من خلال صفحة الجدولة
            </p>
            <Button asChild variant="link" className="text-xs font-bold">
              <Link to="/scheduling">انتقل إلى الجدول</Link>
            </Button>
          </div>
        )}

        <div className="bg-card border rounded-2xl p-5 md:p-6 space-y-4 shadow-sm bg-white">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            أحدث النشاطات
          </h3>
          <div className="space-y-3">
            {logsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))
            ) : logsData?.data?.length > 0 ? (
              logsData.data.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-muted/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">
                        {log.userId?.firstName} {log.userId?.lastName}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                        {log.action} - {log.entityType}
                      </div>
                    </div>
                  </div>
                  <div className="text-left text-[9px] sm:text-[10px] text-muted-foreground font-medium shrink-0 ml-1">
                    {new Date(log.createdAt).toLocaleTimeString('ar-KW')}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-8">
                لا توجد نشاطات مسجلة حالياً
              </p>
            )}
            {isAdmin && (
              <Button asChild variant="link" className="w-full text-xs font-bold pt-2">
                <Link to="/settings/activity-log">عرض السجل الكامل</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
