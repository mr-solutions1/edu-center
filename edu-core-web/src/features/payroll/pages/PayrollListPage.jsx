import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, CheckCircle, Calculator, Send, Award } from 'lucide-react';
import React, { useState } from 'react';

import { payrollApi } from '../services/payrollApi';

import { teacherApi } from '@/features/teachers/services/teacherApi';
import { useAuth } from '@/features/auth/AuthContext';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { formatMoney } from '@/shared/utils/money';
import { toast } from 'sonner';

const PayrollListPage = () => {
  const { user } = useAuth();
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
      toast.success('تم صرف الراتب وتسجيل القيد المزدوج بالدفاتر المالية بنجاح');
    },
    onError: (err) => {
      toast.error(err.message || 'فشل صرف الراتب');
    },
  });

  const submitApprovalMutation = useMutation({
    mutationFn: payrollApi.submitApproval,
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll']);
      toast.success('تم تقديم سجل الراتب وسلسلة الاعتمادات بنجاح');
    },
    onError: (err) => {
      toast.error(err.message || 'فشل تقديم طلب الاعتماد');
    },
  });

  const approvePayrollMutation = useMutation({
    mutationFn: payrollApi.approvePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll']);
      toast.success('تم توقيع واعتماد سجل الراتب بنجاح');
    },
    onError: (err) => {
      toast.error(err.message || 'فشل توقيع الاعتماد');
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
      cell: (row) => {
        const user = row.teacherId?.userId;
        if (!user) {
          return <span className="text-muted-foreground italic">مستخدم محذوف</span>;
        }
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return name || <span className="text-muted-foreground italic">معلم بدون اسم</span>;
      },
    },
    { header: 'الشهر/السنة', cell: (row) => `${row.month}/${row.year}` },
    { header: 'الحصص المكتملة', accessor: 'completedLessons' },
    {
      header: 'إجمالي المستحق',
      cell: (row) => formatMoney(row.finalAmount),
    },
    {
      header: 'الحالة المحاسبية',
      cell: (row) => {
        const status = row.status || (row.paid ? 'PAID' : 'CALCULATED');
        const badgeStyles = {
          CALCULATED: 'bg-slate-100 text-slate-800 border-slate-200',
          PENDING_APPROVAL: 'bg-amber-100 text-yellow-800 border-yellow-200 animate-pulse',
          APPROVED: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          PAID: 'bg-green-100 text-green-800 border-green-200',
        };
        const statusLabels = {
          CALCULATED: 'محسوب آلياً',
          PENDING_APPROVAL: 'بانتظار الاعتماد',
          APPROVED: 'جاهز للصرف',
          PAID: 'تم الصرف',
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyles[status] || ''}`}>
            {statusLabels[status] || status}
          </span>
        );
      },
    },
    {
      header: 'إجراءات الحوكمة المالية',
      cell: (row) => {
        const status = row.status || (row.paid ? 'PAID' : 'CALCULATED');
        const isAdminOrAccountant = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

        return (
          <div className="flex items-center gap-2">
            {status === 'CALCULATED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => submitApprovalMutation.mutate(row._id)}
                disabled={submitApprovalMutation.isPending}
                className="gap-1 h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <Send className="h-3 w-3" />
                تقديم للاعتماد
              </Button>
            )}

            {status === 'PENDING_APPROVAL' && isAdminOrAccountant && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => approvePayrollMutation.mutate(row._id)}
                disabled={approvePayrollMutation.isPending}
                className="gap-1 h-8 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              >
                <Award className="h-3 w-3" />
                توقيع واعتماد
              </Button>
            )}

            {status === 'APPROVED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markPaidMutation.mutate(row._id)}
                disabled={markPaidMutation.isPending}
                className="gap-1 h-8 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                <CheckCircle className="h-3 w-3" />
                صرف الراتب
              </Button>
            )}

            {status === 'PAID' && (
              <span className="text-xs text-muted-foreground">صرف كامل بالدفاتر</span>
            )}

            {status !== 'PAID' && (
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
            )}
          </div>
        );
      },
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
            {teachers?.data?.map((t) => {
              const name = t.userId
                ? `${t.userId.firstName || ''} ${t.userId.lastName || ''}`.trim()
                : '';
              return (
                <option key={t._id} value={t._id}>
                  {name || 'معلم غير معروف'}
                </option>
              );
            })}
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
