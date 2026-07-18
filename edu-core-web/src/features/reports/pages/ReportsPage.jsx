import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Users, GraduationCap, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

import { reportsApi } from '../services/reportsApi';
import { studentApi } from '@/features/students/services/studentApi';
import { teacherApi } from '@/features/teachers/services/teacherApi';

import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { formatMoney } from '@/shared/utils/money';

const ReportsPage = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState('teacher'); // 'teacher', 'subject', 'level', 'student_financial', 'teacher_financial'

  // Standard Performance Reports
  const { data: teacherData, isLoading: loadingTeacher } = useQuery({
    queryKey: ['reports-by-teacher', { month, year }],
    queryFn: () => reportsApi.getByTeacher({ month, year }),
    enabled: reportType === 'teacher',
  });

  const { data: subjectData, isLoading: loadingSubject } = useQuery({
    queryKey: ['reports-by-subject', { month, year }],
    queryFn: () => reportsApi.getBySubject({ month, year }),
    enabled: reportType === 'subject',
  });

  const { data: levelData, isLoading: loadingLevel } = useQuery({
    queryKey: ['reports-by-level', { month, year }],
    queryFn: () => reportsApi.getByLevel({ month, year }),
    enabled: reportType === 'level',
  });

  // Comprehensive Live Student Financial Report
  const { data: studentsRes, isLoading: loadingStudents } = useQuery({
    queryKey: ['reports-students-financial'],
    queryFn: () => studentApi.getAllStudents({ limit: 100 }),
    enabled: reportType === 'student_financial',
  });

  // Comprehensive Live Teacher Financial Report
  const { data: teachersRes, isLoading: loadingTeachers } = useQuery({
    queryKey: ['reports-teachers-financial'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
    enabled: reportType === 'teacher_financial',
  });

  const handleExportCSV = async () => {
    const data = await reportsApi.exportCSV({ month, year });
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${month}-${year}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportPDF = async () => {
    const data = await reportsApi.exportPDF({ month, year });
    const url = window.URL.createObjectURL(
      new Blob([data], { type: 'application/pdf' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${month}-${year}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const setToThisMonth = () => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const setToLastMonth = () => {
    const now = new Date();
    let m = now.getMonth();
    let y = now.getFullYear();
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
  };

  const setToThisYear = () => {
    const now = new Date();
    setYear(now.getFullYear());
  };

  const teacherPerformanceColumns = [
    { header: 'المعلم', accessor: 'teacherName' },
    { header: 'عدد الحصص', accessor: 'totalLessons' },
    {
      header: 'إجمالي القيمة',
      cell: (row) => formatMoney(row.grossValue),
    },
    {
      header: 'نصيب المعلم',
      cell: (row) => formatMoney(row.teacherShare),
    },
    {
      header: 'نصيب المعهد',
      cell: (row) => formatMoney(row.instituteShare),
    },
  ];

  const subjectColumns = [
    { header: 'المادة', accessor: '_id' },
    { header: 'عدد الحصص', accessor: 'totalLessons' },
    {
      header: 'إجمالي القيمة',
      cell: (row) => formatMoney(row.grossValue),
    },
  ];

  const levelColumns = [
    { header: 'المرحلة الدراسية', accessor: '_id' },
    { header: 'عدد الحصص', accessor: 'totalLessons' },
    {
      header: 'إجمالي القيمة',
      cell: (row) => formatMoney(row.grossValue),
    },
  ];

  // Student Report Columns (as specified)
  const studentFinancialColumns = [
    { header: 'كود الطالب', accessor: 'studentCode' },
    { header: 'اسم الطالب / ولي الأمر', accessor: 'parentName' },
    { header: 'المرحلة الدراسية', accessor: 'grade' },
    { header: 'الساعات المشتراة', accessor: 'totalBalance' },
    { header: 'الساعات المستهلكة', accessor: 'totalConsumed' },
    { header: 'الساعات المتبقية', accessor: 'remainingHours' },
    {
      header: 'المبالغ المدفوعة',
      cell: (row) => formatMoney(row.totalPaid || 0),
    },
    {
      header: 'المبالغ المتبقية',
      cell: (row) => formatMoney(row.remainingAmount || 0),
    },
    {
      header: 'حالة السداد (Status)',
      cell: (row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          row.paymentStatus === 'Fully Paid' ? 'bg-green-100 text-green-800' :
          row.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.paymentStatus}
        </span>
      ),
    },
    {
      header: 'تنبيه الرصيد (Alerts)',
      cell: (row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          row.balanceAlert === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.balanceAlert}
        </span>
      ),
    },
  ];

  // Teacher Report Columns (as specified)
  const teacherFinancialColumns = [
    { header: 'كود الموظف', accessor: 'employeeCode' },
    {
      header: 'المعلم',
      cell: (row) => `${row.userId?.firstName || ''} ${row.userId?.lastName || ''}`,
    },
    { header: 'ساعات منفذة', cell: (row) => `${row.metrics?.executedHours || 0} ساعة` },
    {
      header: 'الاستحقاق الإجمالي (Gross)',
      cell: (row) => formatMoney(row.metrics?.dueBeforeDeduction || 0),
    },
    {
      header: 'خصم السيارة',
      cell: (row) => formatMoney(row.metrics?.transportationDeduction || 0),
    },
    {
      header: 'صافي المستحق (Net)',
      cell: (row) => formatMoney(row.metrics?.netDue || 0),
    },
    {
      header: 'المبالغ المصروفة (Paid)',
      cell: (row) => formatMoney(row.metrics?.paidToTeacher || 0),
    },
    {
      header: 'المستحق المعلق (Remaining)',
      cell: (row) => (
        <span className="font-bold text-red-600">
          {formatMoney(row.metrics?.remainingDue || 0)}
        </span>
      ),
    },
  ];

  const getActiveData = () => {
    if (reportType === 'teacher') {
      return {
        data: teacherData?.data || [],
        columns: teacherPerformanceColumns,
        loading: loadingTeacher,
      };
    }
    if (reportType === 'subject') {
      return {
        data: subjectData?.data || [],
        columns: subjectColumns,
        loading: loadingSubject,
      };
    }
    if (reportType === 'level') {
      return {
        data: levelData?.data || [],
        columns: levelColumns,
        loading: loadingLevel,
      };
    }
    if (reportType === 'student_financial') {
      return {
        data: studentsRes?.data || [],
        columns: studentFinancialColumns,
        loading: loadingStudents,
      };
    }
    if (reportType === 'teacher_financial') {
      return {
        data: teachersRes?.data || [],
        columns: teacherFinancialColumns,
        loading: loadingTeachers,
      };
    }
    return { data: [], columns: [], loading: false };
  };

  const { data, columns, loading } = getActiveData();

  const isFinancialReport = reportType === 'student_financial' || reportType === 'teacher_financial';

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader title="تقارير الأداء والبيانات المالية" description="تحليل الإيرادات، مصروفات التشغيل ومستحقات المعلمين والطلاب.">
        <div className="flex flex-wrap gap-2 justify-end">
          {!isFinancialReport && (
            <div className="flex gap-1 border rounded-md p-1 bg-muted/50">
              <Button variant="ghost" size="sm" onClick={setToThisMonth}>
                الشهر الحالي
              </Button>
              <Button variant="ghost" size="sm" onClick={setToLastMonth}>
                الشهر الماضي
              </Button>
              <Button variant="ghost" size="sm" onClick={setToThisYear}>
                السنة الحالية
              </Button>
            </div>
          )}
          {!isFinancialReport && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="ml-2 h-4 w-4" />
                تصدير CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="ml-2 h-4 w-4" />
                تصدير PDF
              </Button>
            </>
          )}
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="h-9 border rounded-md px-2 text-sm font-semibold"
          >
            <option value="teacher">حصص المعلم وأدائه</option>
            <option value="subject">أداء المواد الدراسية</option>
            <option value="level">أداء المراحل التعليمية</option>
            <option value="student_financial">تقرير الطلاب المالي والتعليمي (كشف كامل)</option>
            <option value="teacher_financial">تقرير المعلمين المالي الشامل (كشف مستحقات)</option>
          </select>
          {!isFinancialReport && (
            <>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 border rounded-md px-2"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 border rounded-md px-2"
              >
                {[2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </PageHeader>

      <div className="bg-card p-6 border rounded-xl space-y-4">
        <h3 className="text-lg font-bold">
          {reportType === 'teacher' && 'ملخص الأداء الشهري لكل معلم'}
          {reportType === 'subject' && 'ملخص الأداء الشهري لكل مادة'}
          {reportType === 'level' && 'ملخص الأداء الشهري لكل مرحلة تعليمية'}
          {reportType === 'student_financial' && 'كشف تقرير الطلاب المالي والتنبيهي الشامل'}
          {reportType === 'teacher_financial' && 'كشف تقرير المعلمين المالي وصرف المستحقات الشامل'}
        </h3>
        <DataTable columns={columns} data={data} isLoading={loading} />
      </div>
    </div>
  );
};

export default ReportsPage;
