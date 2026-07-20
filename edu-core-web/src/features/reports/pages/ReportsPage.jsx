import { useQuery } from '@tanstack/react-query';
import { Download, FileText, BarChart3, Scale, Wallet } from 'lucide-react';
import React, { useState } from 'react';

import { reportsApi } from '../services/reportsApi';

import { studentApi } from '@/features/students/services/studentApi';
import { teacherApi } from '@/features/teachers/services/teacherApi';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/components/ui/card';
import { formatMoney } from '@/shared/utils/money';

const ReportsPage = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState('teacher'); // 'teacher', 'subject', 'level', 'student_financial', 'teacher_financial', 'financial_statements'

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

  // Dynamic Double-Entry Financial Statements Report
  const { data: financialStatementsRes, isLoading: loadingStatements } =
    useQuery({
      queryKey: ['reports-financial-statements'],
      queryFn: () => reportsApi.getFinancialStatements(),
      enabled: reportType === 'financial_statements',
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

  // Student Report Columns
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
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            row.paymentStatus === 'Fully Paid'
              ? 'bg-green-100 text-green-800'
              : row.paymentStatus === 'Partially Paid'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {row.paymentStatus}
        </span>
      ),
    },
    {
      header: 'تنبيه الرصيد (Alerts)',
      cell: (row) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            row.balanceAlert === 'OK'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.balanceAlert}
        </span>
      ),
    },
  ];

  // Teacher Report Columns
  const teacherFinancialColumns = [
    { header: 'كود الموظف', accessor: 'employeeCode' },
    {
      header: 'المعلم',
      cell: (row) =>
        `${row.userId?.firstName || ''} ${row.userId?.lastName || ''}`,
    },
    {
      header: 'ساعات منفذة',
      cell: (row) => `${row.metrics?.executedHours || 0} ساعة`,
    },
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

  const isFinancialReport =
    reportType === 'student_financial' || reportType === 'teacher_financial';
  const isStatementsReport = reportType === 'financial_statements';

  const statements = financialStatementsRes?.data || {};
  const incomeStatement = statements.incomeStatement || {
    revenue: {},
    expenses: {},
    netIncome: 0,
  };
  const balanceSheet = statements.balanceSheet || {
    assets: [],
    liabilities: [],
    equity: [],
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
  };
  const cashFlow = statements.cashFlowStatement || {
    inflows: 0,
    outflows: 0,
    netCashFlow: 0,
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader
        title="تقارير الأداء والبيانات المالية"
        description="تحليل الإيرادات، مصروفات التشغيل ومستحقات المعلمين والطلاب."
      >
        <div className="flex flex-wrap gap-2 justify-end">
          {!isFinancialReport && !isStatementsReport && (
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
          {!isFinancialReport && !isStatementsReport && (
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
            className="h-9 border rounded-md px-2 text-sm font-semibold bg-background"
          >
            <option value="teacher">حصص المعلم وأدائه</option>
            <option value="subject">أداء المواد الدراسية</option>
            <option value="level">أداء المراحل التعليمية</option>
            <option value="student_financial">
              تقرير الطلاب المالي والتعليمي (كشف كامل)
            </option>
            <option value="teacher_financial">
              تقرير المعلمين المالي الشامل (كشف مستحقات)
            </option>
            <option value="financial_statements">
              القوائم المالية المزدوجة (SaaS Double-Entry)
            </option>
          </select>
          {!isFinancialReport && !isStatementsReport && (
            <>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 border rounded-md px-2 bg-background"
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
                className="h-9 border rounded-md px-2 bg-background"
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

      {isStatementsReport ? (
        <div className="space-y-6">
          {loadingStatements ? (
            <div className="flex justify-center p-12">
              <span className="text-muted-foreground">
                جاري تحميل القوائم المالية المزدوجة...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Income Statement */}
              <Card className="border-r-4 border-r-primary">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    قائمة الدخل (Income Statement)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">
                      {incomeStatement.revenue?.name || 'إيرادات الرسوم'}:
                    </span>
                    <span className="font-bold text-green-600">
                      {formatMoney(incomeStatement.revenue?.amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">
                      {incomeStatement.expenses?.name || 'المصروفات التشغيلية'}:
                    </span>
                    <span className="font-bold text-red-600">
                      {formatMoney(incomeStatement.expenses?.amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 text-base font-bold bg-primary/5 p-2 rounded">
                    <span>صافي الأرباح (Net Income):</span>
                    <span
                      className={
                        incomeStatement.netIncome >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatMoney(incomeStatement.netIncome || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Balance Sheet */}
              <Card className="border-r-4 border-r-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Scale className="h-5 w-5 text-green-500" />
                    الميزانية العمومية (Balance Sheet)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2 border-b pb-2">
                    <span className="font-bold block text-xs text-muted-foreground">
                      الأصول (Assets)
                    </span>
                    {balanceSheet.assets?.map((asset, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{asset.name}:</span>
                        <span className="font-semibold">
                          {formatMoney(asset.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold pt-1 border-t">
                      <span>إجمالي الأصول (Total Assets):</span>
                      <span className="text-green-600">
                        {formatMoney(balanceSheet.totalAssets)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-b pb-2">
                    <span className="font-bold block text-xs text-muted-foreground">
                      الالتحامات (Liabilities)
                    </span>
                    {balanceSheet.liabilities?.map((lib, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{lib.name}:</span>
                        <span className="font-semibold">
                          {formatMoney(lib.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold pt-1 border-t">
                      <span>إجمالي الالتزامات:</span>
                      <span className="text-red-600">
                        {formatMoney(balanceSheet.totalLiabilities)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold block text-xs text-muted-foreground">
                      حقوق الملكية (Equity)
                    </span>
                    {balanceSheet.equity?.map((eq, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{eq.name}:</span>
                        <span className="font-semibold">
                          {formatMoney(eq.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold pt-1 border-t">
                      <span>إجمالي حقوق الملكية & الالتزامات:</span>
                      <span className="text-primary">
                        {formatMoney(
                          balanceSheet.totalLiabilities +
                            balanceSheet.totalEquity
                        )}
                      </span>
                    </div>
                  </div>

                  {balanceSheet.totalAssets ===
                  balanceSheet.totalLiabilities + balanceSheet.totalEquity ? (
                    <div className="text-center bg-green-50 text-green-800 text-xs py-1 rounded font-bold">
                      ✓ الحسابات متوازنة تماماً (Assets = Liabilities + Equity)
                    </div>
                  ) : (
                    <div className="text-center bg-red-50 text-red-800 text-xs py-1 rounded font-bold">
                      ⚠️ فروقات تسوية في دفتر الأستاذ المالي
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cash Flow Statement */}
              <Card className="border-r-4 border-r-amber-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-amber-500" />
                    قائمة التدفقات النقدية (Cash Flow)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">
                      المتحصلات والتدفقات الداخلة (Inflows):
                    </span>
                    <span className="font-bold text-green-600">
                      {formatMoney(cashFlow.inflows || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">
                      المدفوعات والتدفقات الخارجة (Outflows):
                    </span>
                    <span className="font-bold text-red-600">
                      {formatMoney(cashFlow.outflows || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 text-base font-bold bg-amber-50 p-2 rounded">
                    <span>صافي التدفقات النقدية:</span>
                    <span
                      className={
                        cashFlow.netCashFlow >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatMoney(cashFlow.netCashFlow || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card p-6 border rounded-xl space-y-4">
          <h3 className="text-lg font-bold">
            {reportType === 'teacher' && 'ملخص الأداء الشهري لكل معلم'}
            {reportType === 'subject' && 'ملخص الأداء الشهري لكل مادة'}
            {reportType === 'level' && 'ملخص الأداء الشهري لكل مرحلة تعليمية'}
            {reportType === 'student_financial' &&
              'كشف تقرير الطلاب المالي والتنبيهي الشامل'}
            {reportType === 'teacher_financial' &&
              'كشف تقرير المعلمين المالي وصرف المستحقات الشامل'}
          </h3>
          <DataTable columns={columns} data={data} isLoading={loading} />
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
