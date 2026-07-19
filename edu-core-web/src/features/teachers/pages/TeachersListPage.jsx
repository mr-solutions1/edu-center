import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Landmark, Coins, Globe } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import TeacherFormDialog from '../components/TeacherFormDialog';
import { teacherApi } from '../services/teacherApi';

import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import SearchFilterBar from '@/shared/components/SearchFilterBar/SearchFilterBar';
import { Button } from '@/shared/components/ui/button';
import { formatMoney } from '@/shared/utils/money';
import { toast } from 'sonner';
import { parseApiError } from '@/shared/utils/errorParser';

const TeachersListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [validationErrors, setValidationErrors] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', { search }],
    queryFn: () => teacherApi.getAllTeachers({ search }),
  });

  const createMutation = useMutation({
    mutationFn: teacherApi.createTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      setFormOpen(false);
      setValidationErrors(null);
    },
    onError: (error) => {
      const parsed = error.parsed || parseApiError(error);
      const errorsList = parsed.details && parsed.details.length > 0
        ? parsed.details.map((d) => `• ${d}`).join('\n')
        : parsed.message;
      toast.error(`❌ فشل إنشاء المعلم:\n${errorsList}`);

      const backendErrors = error?.response?.data?.errors;
      if (backendErrors) {
        setValidationErrors(backendErrors);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => teacherApi.updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      setFormOpen(false);
      setEditingTeacher(null);
      setValidationErrors(null);
    },
    onError: (error) => {
      const parsed = error.parsed || parseApiError(error);
      const errorsList = parsed.details && parsed.details.length > 0
        ? parsed.details.map((d) => `• ${d}`).join('\n')
        : parsed.message;
      toast.error(`❌ فشل تحديث المعلم:\n${errorsList}`);

      const backendErrors = error?.response?.data?.errors;
      if (backendErrors) {
        setValidationErrors(backendErrors);
      }
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
    setValidationErrors(null);
    setFormOpen(true);
  };

  const handleSubmit = (formData) => {
    setValidationErrors(null);
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
    { header: 'الساعات المنفذة', cell: (row) => `${row.metrics?.executedHours || 0} ساعة` },
    {
      header: 'الاستحقاق الإجمالي',
      cell: (row) => formatMoney(row.metrics?.dueBeforeDeduction || 0),
    },
    {
      header: 'صافي المستحق',
      cell: (row) => formatMoney(row.metrics?.netDue || 0),
    },
    {
      header: 'المتبقي غير المدفوع',
      cell: (row) => (
        <span className="font-bold text-red-600">
          {formatMoney(row.metrics?.remainingDue || 0)}
        </span>
      ),
    },
    {
      header: 'الحالة',
      cell: (row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {row.isActive ? 'نشط' : 'غير نشط'}
        </span>
      ),
    },
    {
      header: 'إجراءات',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild title="الملف التعريفي العام">
            <a href={`/teachers/portfolio/${row._id}`} target="_blank" rel="noreferrer">
              <Globe className="h-4 w-4 text-blue-500" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild title="تسوية مستحقات">
            <Link to="/teachers/settlement">
              <Coins className="h-4 w-4 text-primary" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} title="تعديل">
            <Edit className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row._id)}
            title="حذف"
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
        <div className="flex gap-2">
          <Button asChild variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10">
            <Link to="/teachers/settlement">
              <Coins className="h-4 w-4" />
              تسوية مستحقات المعلمين
            </Link>
          </Button>
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
        </div>
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
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setValidationErrors(null);
          }
        }}
        onSubmit={handleSubmit}
        initialData={editingTeacher}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        serverErrors={validationErrors}
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
