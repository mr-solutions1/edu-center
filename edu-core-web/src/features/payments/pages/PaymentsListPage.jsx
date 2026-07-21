import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import PaymentFormDialog from '../components/PaymentFormDialog';
import { paymentApi } from '../services/paymentApi';

import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { formatDate } from '@/shared/utils/date';
import { formatMoney } from '@/shared/utils/money';

const PaymentsListPage = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingTeacher] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentApi.getAllPayments(),
  });

  const createMutation = useMutation({
    mutationFn: paymentApi.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => paymentApi.updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      setFormOpen(false);
      setEditingTeacher(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: paymentApi.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      setDeleteId(null);
    },
  });

  const handleEdit = (payment) => {
    setEditingTeacher({
      ...payment,
      studentId: payment.studentId?._id || payment.studentId,
    });
    setFormOpen(true);
  };

  const handleSubmit = (formData) => {
    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    {
      header: 'الطالب',
      cell: (row) =>
        `${row.studentId?.parentName || 'محذوف'} (${row.studentId?.studentCode || ''})`,
    },
    {
      header: 'المبلغ',
      cell: (row) => formatMoney(row.amount),
    },
    {
      header: 'توزيعات الباقات (FIFO)',
      cell: (row) => {
        const allocs = row.allocations || [];
        if (allocs.length === 0) {
          return <span className="text-muted-foreground text-[10px]">— لا توجد توزيعات —</span>;
        }
        return (
          <div className="flex flex-col gap-1 text-[11px] select-none">
            {allocs.map((alloc, idx) => (
              <div key={alloc._id || idx} className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2 py-0.5 rounded-md w-max font-semibold">
                <span>{alloc.subject}:</span>
                <span className="font-bold">{formatMoney(alloc.amount)}</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      header: 'التاريخ',
      cell: (row) => formatDate(row.createdAt, 'yyyy/MM/dd'),
    },
    {
      header: 'الحالة',
      cell: (row) => <StatusBadge status={row.status} domain="payment" />,
    },
    {
      header: 'إجراءات',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row._id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader title="المدفوعات" description="تتبع تحصيل الرسوم والمدفوعات">
        <Button
          onClick={() => {
            setEditingTeacher(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          تسجيل دفعة
        </Button>
      </PageHeader>

      <div className="bg-card p-4 border rounded-xl">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />
      </div>

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingPayment}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        title="حذف سجل مالي"
        description="هل أنت متأكد من حذف هذا السجل؟ هذا الإجراء سيؤثر على التقارير المالية."
      />
    </div>
  );
};

export default PaymentsListPage;
