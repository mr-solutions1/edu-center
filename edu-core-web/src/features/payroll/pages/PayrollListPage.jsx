import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, CheckCircle, Calculator } from 'lucide-react';
import React, { useState } from 'react';

import { payrollApi } from '../services/payrollApi';

import { teacherApi } from '@/features/teachers/services/teacherApi';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { formatMoney } from '@/shared/utils/money';

const PayrollListPage = () => {
  const queryClient = useQueryClient();
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [month] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', { teacherId: selectedTeacher, month, year }],
    queryFn: () =>
      payrollApi.getAllPayroll({ teacherId: selectedTeacher, month, year }),
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
  });

  const generateMutation = useMutation({
    mutationFn: payrollApi.generatePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll']);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: payrollApi.markPaid,
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll']);
    },
  });

  const handleGenerate = () => {
    if (selectedTeacher) {
      generateMutation.mutate({ teacherId: selectedTeacher, month, year });
    }
  };

  const columns = [
    {
      header: 'المعلم',
      cell: (row) =>
        `${row.teacherId?.userId?.firstName} ${row.teacherId?.userId?.lastName}`,
    },
    { header: 'الشهر/السنة', cell: (row) => `${row.month}/${row.year}` },
    { header: 'الحصص المكتملة', accessor: 'completedLessons' },
    {
      header: 'إجمالي المستحق',
      cell: (row) => formatMoney(row.finalAmount),
    },
    {
      header: 'الحالة',
      cell: (row) => (
        <span className={row.paid ? 'text-green-600' : 'text-yellow-600'}>
          {row.paid ? 'تم الصرف' : 'بانتظار الصرف'}
        </span>
      ),
    },
    {
      header: 'إجراءات',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {!row.paid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markPaidMutation.mutate(row._id)}
              disabled={markPaidMutation.isPending}
              className="gap-1 h-8"
            >
              <CheckCircle className="h-3 w-3" />
              صرف الراتب
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              generateMutation.mutate({
                teacherId: row.teacherId._id,
                month: row.month,
                year: row.year,
              })
            }
            disabled={generateMutation.isPending}
            className="gap-1 h-8"
          >
            <RefreshCcw className="h-3 w-3" />
            تحديث
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader title="الرواتب" description="احتساب وصرف مستحقات المعلمين">
        <div className="flex gap-2">
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="">كل المعلمين...</option>
            {teachers?.data?.map((t) => (
              <option key={t._id} value={t._id}>
                {t.userId?.firstName} {t.userId?.lastName}
              </option>
            ))}
          </select>
          <Button
            onClick={handleGenerate}
            disabled={!selectedTeacher || generateMutation.isPending}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            احتساب الراتب
          </Button>
        </div>
      </PageHeader>

      <div className="bg-card p-4 border rounded-xl">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default PayrollListPage;
