import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import StudentFormDialog from '../components/StudentFormDialog';
import { studentApi } from '../services/studentApi';

import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import SearchFilterBar from '@/shared/components/SearchFilterBar/SearchFilterBar';
import StatusBadge from '@/shared/components/StatusBadge/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { formatMoney } from '@/shared/utils/money';

const StudentsListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['students', { search }],
    queryFn: () => studentApi.getAllStudents({ search }),
  });

  const createMutation = useMutation({
    mutationFn: studentApi.createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => studentApi.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      setFormOpen(false);
      setEditingStudent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentApi.deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      setDeleteId(null);
    },
  });

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormOpen(true);
  };

  const handleSubmit = (formData) => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    { header: 'الكود', accessor: 'studentCode' },
    { header: 'ولي الأمر', accessor: 'parentName' },
    { header: 'الهاتف', accessor: 'parentPhone' },
    { header: 'المرحلة', accessor: 'grade' },
    {
      header: 'الرسوم',
      cell: (row) => formatMoney(row.monthlyFee),
    },
    {
      header: 'الحالة',
      cell: (row) => <StatusBadge status={row.status} domain="student" />,
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
    <div className="space-y-6">
      <PageHeader title="الطلاب" description="إدارة سجلات الطلاب والاشتراكات">
        <Button
          onClick={() => {
            setEditingStudent(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة طالب
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SearchFilterBar
            onSearch={setSearch}
            placeholder="بحث بالاسم، الهاتف أو المنطقة..."
          />
          <div className="flex gap-2">{/* Filters could go here */}</div>
        </div>

        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />
      </div>

      <StudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingStudent}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={createMutation.error || updateMutation.error}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        title="حذف ملف طالب"
        description="هل أنت متأكد من حذف ملف هذا الطالب؟ سيتم أرشفة السجل ولن يظهر في القوائم النشطة."
      />
    </div>
  );
};

export default StudentsListPage;
