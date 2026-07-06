import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import React, { useState } from 'react';

import { reportsApi } from '../services/reportsApi';

import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { formatMoney } from '@/shared/utils/money';

const ReportsPage = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState('teacher');

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

  const handleExport = async () => {
    const data = await reportsApi.exportCSV({ month, year });
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${month}-${year}.csv`);
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

  const teacherColumns = [
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

  const getActiveData = () => {
    if (reportType === 'teacher') {
      return {
        data: teacherData?.data || [],
        columns: teacherColumns,
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
    return { data: [], columns: [], loading: false };
  };

  const { data, columns, loading } = getActiveData();

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader title="تقارير الأداء" description="تحليل الإيرادات والأداء">
        <div className="flex flex-wrap gap-2 justify-end">
          <div className="flex gap-1 border rounded-md p-1 bg-muted/50">
            <Button variant="ghost" size="sm" onClick={setToThisMonth}>
              الشهر الحالي
            </Button>
            <Button variant="ghost" size="sm" onClick={setToLastMonth}>
              الشهر الماضي
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="ml-2 h-4 w-4" />
            تصدير CSV
          </Button>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="h-9 border rounded-md px-2"
          >
            <option value="teacher">حسب المعلم</option>
            <option value="subject">حسب المادة</option>
            <option value="level">حسب المرحلة</option>
          </select>
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
        </div>
      </PageHeader>

      <div className="bg-card p-6 border rounded-xl space-y-4">
        <h3 className="text-lg font-bold">
          {reportType === 'teacher' && 'ملخص الأداء لكل معلم'}
          {reportType === 'subject' && 'ملخص الأداء لكل مادة'}
          {reportType === 'level' && 'ملخص الأداء لكل مرحلة'}
        </h3>
        <DataTable columns={columns} data={data} isLoading={loading} />
      </div>
    </div>
  );
};

export default ReportsPage;
