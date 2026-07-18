import { useQuery } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  Calendar,
  GraduationCap,
  TrendingUp,
  FileSpreadsheet,
  Coins,
  Landmark,
  PiggyBank,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { dashboardApi } from '../services/dashboardApi';

import { useAuth } from '@/features/auth/AuthContext';
import ErrorState from '@/shared/components/ErrorState/ErrorState';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import StatCard from '@/shared/components/StatCard/StatCard';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoney } from '@/shared/utils/money';

import StudentDashboard from '../components/StudentDashboard';
import ParentDashboard from '../components/ParentDashboard';

const DashboardPage = () => {
  const { user, accessToken, isAuthenticated, hasPermission } = useAuth();

  const isStudent = hasPermission('exams.view') && !hasPermission('student.view');
  const isParent = hasPermission('student.view') && !hasPermission('lesson.attendance') && !hasPermission('student.create');

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

  const isOverviewQueryEnabled = isAuthenticated && !!accessToken;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    enabled: isOverviewQueryEnabled,
  });

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const stats = data?.data || {};

  return (
    <div className="space-y-6 md:space-y-8 text-right" dir="rtl">
      <PageHeader
        title="لوحة التحكم الرئيسية"
        description={`أهلاً بك مجدداً، ${user?.firstName || ''} ${user?.lastName || ''} - مراجعة سريعة لأرقام الأكاديمية والتدفقات المالية اليومية.`}
      />

      {/* 8 KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 sm:h-32 w-full rounded-lg" />
          ))
        ) : (
          <>
            <StatCard
              label="إجمالي الطلاب"
              value={stats.activeStudents ?? 0}
              icon={Users}
              className="border-r-4 border-r-blue-500"
            />
            <StatCard
              label="المعلمون النشطون"
              value={stats.activeTeachers ?? 0}
              icon={GraduationCap}
              className="border-r-4 border-r-indigo-500"
            />
            <StatCard
              label="إجمالي الإيرادات"
              value={formatMoney(stats.monthlyRevenue ?? 0)}
              icon={DollarSign}
              className="border-r-4 border-r-green-500"
            />
            <StatCard
              label="إجمالي المصروفات"
              value={formatMoney(stats.monthlyExpenses ?? 0)}
              icon={FileSpreadsheet}
              className="border-r-4 border-r-red-500"
            />
            <StatCard
              label="تكلفة رواتب المعلمين"
              value={formatMoney(stats.teacherCost ?? 0)}
              icon={Coins}
              className="border-r-4 border-r-orange-500"
            />
            <StatCard
              label="صافي الأرباح"
              value={formatMoney(stats.instituteProfit ?? 0)}
              icon={PiggyBank}
              className="border-r-4 border-r-teal-500"
            />
            <StatCard
              label="مستحقات الطلاب المعلقة"
              value={formatMoney(stats.outstandingStudentBalances ?? 0)}
              icon={Landmark}
              className="border-r-4 border-r-amber-500"
            />
            <StatCard
              label="مستحقات المعلمين غير المدفوعة"
              value={formatMoney(stats.outstandingTeacherDues ?? 0)}
              icon={Landmark}
              className="border-r-4 border-r-rose-500"
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Monthly Revenue Chart */}
        <Card className="p-5 md:p-6 space-y-4">
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-4 w-4 text-green-500" />
              منحنى الإيرادات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-48 flex items-end justify-center relative">
            {/* Elegant pure SVG bar/area chart */}
            <svg className="w-full h-full" viewBox="0 0 400 150">
              <defs>
                <linearGradient id="gradRev" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M10,120 Q80,70 150,90 T290,40 T400,60 L400,150 L10,150 Z" fill="url(#gradRev)" />
              <path d="M10,120 Q80,70 150,90 T290,40 T400,60" fill="none" stroke="#22c55e" strokeWidth="3" />
              <circle cx="150" cy="90" r="4" fill="#22c55e" />
              <circle cx="290" cy="40" r="4" fill="#22c55e" />
              <text x="150" y="80" fontSize="8" fill="#1e293b" textAnchor="middle">{formatMoney(stats.monthlyRevenue ?? 0)}</text>
              <text x="350" y="145" fontSize="8" fill="#94a3b8">الشهر الحالي</text>
            </svg>
          </CardContent>
        </Card>

        {/* Monthly Expenses Chart */}
        <Card className="p-5 md:p-6 space-y-4">
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-4 w-4 text-red-500" />
              منحنى المصروفات الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-48 flex items-end justify-center relative">
            <svg className="w-full h-full" viewBox="0 0 400 150">
              <defs>
                <linearGradient id="gradExp" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M10,130 Q100,110 200,80 T400,100 L400,150 L10,150 Z" fill="url(#gradExp)" />
              <path d="M10,130 Q100,110 200,80 T400,100" fill="none" stroke="#ef4444" strokeWidth="3" />
              <circle cx="200" cy="80" r="4" fill="#ef4444" />
              <text x="200" y="70" fontSize="8" fill="#1e293b" textAnchor="middle">{formatMoney(stats.monthlyExpenses ?? 0)}</text>
              <text x="350" y="145" fontSize="8" fill="#94a3b8">الشهر الحالي</text>
            </svg>
          </CardContent>
        </Card>

        {/* Student Growth Chart */}
        <Card className="p-5 md:p-6 space-y-4">
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <Users className="h-4 w-4 text-blue-500" />
              نمو الطلاب المشتركين
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-48 flex items-end justify-center relative">
            <svg className="w-full h-full" viewBox="0 0 400 150">
              <defs>
                <linearGradient id="gradGrowth" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M10,140 Q100,100 200,60 T400,30 L400,150 L10,150 Z" fill="url(#gradGrowth)" />
              <path d="M10,140 Q100,100 200,60 T400,30" fill="none" stroke="#3b82f6" strokeWidth="3" />
              <circle cx="200" cy="60" r="4" fill="#3b82f6" />
              <circle cx="400" cy="30" r="4" fill="#3b82f6" />
              <text x="200" y="50" fontSize="8" fill="#1e293b" textAnchor="middle">{stats.activeStudents ?? 0} طالب</text>
              <text x="350" y="145" fontSize="8" fill="#94a3b8">الشهر الحالي</text>
            </svg>
          </CardContent>
        </Card>

        {/* Teacher Payments Chart */}
        <Card className="p-5 md:p-6 space-y-4">
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <GraduationCap className="h-4 w-4 text-indigo-500" />
              تكاليف رواتب المعلمين الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-48 flex items-end justify-center relative">
            <svg className="w-full h-full" viewBox="0 0 400 150">
              <defs>
                <linearGradient id="gradTeach" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M10,120 Q120,90 240,110 T400,50 L400,150 L10,150 Z" fill="url(#gradTeach)" />
              <path d="M10,120 Q120,90 240,110 T400,50" fill="none" stroke="#6366f1" strokeWidth="3" />
              <circle cx="400" cy="50" r="4" fill="#6366f1" />
              <text x="350" y="40" fontSize="8" fill="#1e293b" textAnchor="middle">{formatMoney(stats.teacherCost ?? 0)}</text>
              <text x="350" y="145" fontSize="8" fill="#94a3b8">الشهر الحالي</text>
            </svg>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
