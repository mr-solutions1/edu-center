import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { courseApi } from '../services/courseApi';

import DataTable from '@/shared/components/DataTable/DataTable';
import FormDialog from '@/shared/components/FormDialog/FormDialog';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const CoursesPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: courseApi.getAll,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      editingCourse
        ? courseApi.update(editingCourse._id, data)
        : courseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      setOpen(false);
      setEditingCourse(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: courseApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['courses']),
  });

  const onSubmit = (data) => mutation.mutate(data);

  const columns = [
    { header: 'اسم الدورة', accessor: 'name' },
    { header: 'الكود', accessor: 'code' },
    { header: 'المادة', accessor: 'subject' },
    { header: 'المرحلة', accessor: 'educationalLevel' },
    {
      header: 'الإجراءات',
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCourse(row);
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
        title="الدورات التدريبية"
        description="إدارة المناهج والدورات"
      >
        <Button
          onClick={() => {
            setEditingCourse(null);
            reset({});
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة دورة
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
        title={editingCourse ? 'تعديل دورة' : 'إضافة دورة جديدة'}
        formId="course-form"
        isSubmitting={mutation.isPending}
      >
        <form
          id="course-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2 text-right">
            <Label>اسم الدورة</Label>
            <Input {...register('name')} placeholder="مثال: تأسيس لغة عربية" />
          </div>
          <div className="space-y-2 text-right">
            <Label>كود الدورة</Label>
            <Input {...register('code')} placeholder="مثال: ARB-01" />
          </div>
          <div className="space-y-2 text-right">
            <Label>المادة</Label>
            <Input {...register('subject')} placeholder="مثال: لغة عربية" />
          </div>
          <div className="space-y-2 text-right">
            <Label>المرحلة الدراسية</Label>
            <Input
              {...register('educationalLevel')}
              placeholder="مثال: ابتدائي"
            />
          </div>
        </form>
      </FormDialog>
    </div>
  );
};

export default CoursesPage;
