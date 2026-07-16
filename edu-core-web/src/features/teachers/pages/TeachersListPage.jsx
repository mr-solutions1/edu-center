import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import TeacherFormDialog from '../components/TeacherFormDialog';
import { teacherApi } from '../services/teacherApi';

import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import SearchFilterBar from '@/shared/components/SearchFilterBar/SearchFilterBar';
import { Button } from '@/shared/components/ui/button';

const TeachersListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', { search }],
    queryFn: () => teacherApi.getAllTeachers({ search }),
  });

  const createMutation = useMutation({
    mutationFn: teacherApi.createTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teacherApi.updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      setFormOpen(false);
      setEditingTeacher(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teacherApi.deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      setDeleteId(null);
    },
  });

  const handleEdit = (teacher) => {
    // Simplify data for form
    const formData = {
      ...teacher,
      userId: teacher.userId?._id || teacher.userId,
    };
    setEditingTeacher(formData);
    setFormOpen(true);
  };

  const handleSubmit = (formData) => {
    if (editingTeacher) {
      updateMutation.mutate({ id: editingTeacher._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    { header: 'الكود', accessor: 'employeeCode' },
    {
      header: 'الاسم',
      cell: (row) =>
        `${row.userId?.firstName || ''} ${row.userId?.lastName || ''}`,
    },
    { header: 'القسم', accessor: 'department' },
    { header: 'واتساب', accessor: 'whatsapp' },
    {
      header: 'الحالة',
      cell: (row) => (
        <span className={row.isActive ? 'text-green-600' : 'text-red-500'}>
          {row.isActive ? 'نشط' : 'غير نشط'}
        </span>
      ),
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
      <PageHeader
        title="المعلمون"
        description="إدارة سجلات المعلمين والبيانات المالية"
      >
        <Button
          onClick={() => {
            setEditingTeacher(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة معلم
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SearchFilterBar
            onSearch={setSearch}
            placeholder="بحث بالكود أو القسم..."
          />
        </div>
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />
      </div>

      <TeacherFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingTeacher}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={createMutation.error || updateMutation.error}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        title="حذف سجل معلم"
        description="هل أنت متأكد من حذف سجل هذا المعلم؟ سيتم إلغاء تنشيط الحساب وأرشفة البيانات."
      />
    </div>
  );
};

export default TeachersListPage;
