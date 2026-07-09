import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { courseApi } from '../../courses/services/courseApi';
import { teacherApi } from '../../teachers/services/teacherApi';
import { groupApi } from '../services/groupApi';

import DataTable from '@/shared/components/DataTable/DataTable';
import FormDialog from '@/shared/components/FormDialog/FormDialog';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const GroupsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupApi.getAll,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: courseApi.getAll,
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: teacherApi.getAllTeachers,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      editingGroup
        ? groupApi.update(editingGroup._id, data)
        : groupApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setOpen(false);
      setEditingGroup(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: groupApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['groups']),
  });

  const onSubmit = (data) => mutation.mutate(data);

  const columns = [
    { header: 'اسم المجموعة', accessor: 'name' },
    { header: 'الدورة', cell: (row) => row.courseId?.name },
    { header: 'المعلم', cell: (row) => row.teacherId?.employeeCode },
    { header: 'عدد الطلاب', cell: (row) => row.students?.length || 0 },
    {
      header: 'الإجراءات',
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingGroup(row);
              reset(row);
              setOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500"
            onClick={() => deleteMutation.mutate(row._id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader
        title="المجموعات الدراسية"
        description="إدارة المجموعات والطلاب"
      >
        <Button
          onClick={() => {
            setEditingGroup(null);
            reset({});
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة مجموعة
        </Button>
      </PageHeader>

      <div className="bg-card p-4 border rounded-xl shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editingGroup ? 'تعديل مجموعة' : 'إضافة مجموعة جديدة'}
        formId="group-form"
        isSubmitting={mutation.isPending}
      >
        <form
          id="group-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2 text-right">
            <Label>اسم المجموعة</Label>
            <Input
              {...register('name')}
              placeholder="مثال: مجموعة التقوية - رياضيات"
            />
          </div>
          <div className="space-y-2 text-right">
            <Label>الدورة</Label>
            <select
              {...register('courseId')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">اختر الدورة</option>
              {courses?.data?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 text-right">
            <Label>المعلم</Label>
            <select
              {...register('teacherId')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">اختر المعلم</option>
              {teachers?.data?.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.employeeCode} - {t.userId?.firstName}
                </option>
              ))}
            </select>
          </div>
        </form>
      </FormDialog>
    </div>
  );
};

export default GroupsPage;
