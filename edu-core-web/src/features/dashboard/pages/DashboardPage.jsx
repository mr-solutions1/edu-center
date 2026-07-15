import { useQuery } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  Calendar,
  GraduationCap,
  CheckCircle,
  Activity,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { dashboardApi } from '../services/dashboardApi';

import { activityLogApi } from '@/features/activity-log/services/activityLogApi';
import { useAuth } from '@/features/auth/AuthContext';
import ErrorState from '@/shared/components/ErrorState/ErrorState';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import StatCard from '@/shared/components/StatCard/StatCard';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';

import StudentDashboard from '../components/StudentDashboard';
import ParentDashboard from '../components/ParentDashboard';

const DashboardPage = () => {
  const { user } = useAuth();

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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    enabled: !isStudent && !isParent,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => activityLogApi.getLogs({ limit: 5 }),
    enabled: !!isAdmin && !isStudent && !isParent,
  });

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const stats = data?.data || {};

  return (
    <div className="space-y-8 text-right" dir="rtl">

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
            className="rounded-xl text-xs font-bold border-secondary/30 text-secondary"
          >
            {isCustomizing ? 'إغلاق التخصيص' : 'تخصيص الـ Widgets'}
          </Button>
        )}
      </PageHeader>

      {/* Mini Widget Builder Drawer/Toggle Area */}
      {isAdmin && isCustomizing && (
        <Card className="border border-secondary/20 shadow-md bg-secondary/5 rounded-3xl p-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isTeacher ? (
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              حصصي القادمة
            </h3>
            <div className="space-y-3">
              {stats.upcomingLessons?.length > 0 ? (
                stats.upcomingLessons.map((lesson) => (
                  <div
                    key={lesson._id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-xs text-muted-foreground">
                        الطالب: {lesson.studentId?.parentName}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold">
                        {new Date(lesson.lessonDate).toLocaleDateString(
                          'ar-KW'
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
              <Button asChild variant="outline" className="w-full">
                <Link to="/scheduling">عرض الجدول الكامل</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2">
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
            <h3 className="font-medium text-muted-foreground">
              الجدول الزمني العام
            </h3>
            <p className="text-sm text-muted-foreground/60 italic">
              يمكنك متابعة كافة الحصص من خلال صفحة الجدولة
            </p>
            <Button asChild variant="link">
              <Link to="/scheduling">انتقل إلى الجدول</Link>
            </Button>
          </div>
        )}

        <div className="bg-card border rounded-xl p-6 space-y-4 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            أحدث النشاطات
          </h3>
          <div className="space-y-3">
            {logsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))
            ) : logsData?.data?.length > 0 ? (
              logsData.data.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-muted/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">
                        {log.userId?.firstName} {log.userId?.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.action} - {log.entityType}
                      </div>
                    </div>
                  </div>
                  <div className="text-left text-[10px] text-muted-foreground font-medium">
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
              <Button asChild variant="link" className="w-full text-xs">
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
