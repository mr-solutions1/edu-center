import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { studentApi } from '../services/studentApi';

import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';

const TeacherStudentsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-students'],
    queryFn: studentApi.getTeacherStudents,
  });

  const columns = [
    { header: 'اسم الطالب', accessor: 'parentName' },
    { header: 'الكود', accessor: 'studentCode' },
    { header: 'المرحلة', accessor: 'grade' },
    { header: 'المنطقة', accessor: 'area' },
    { header: 'هاتف ولي الأمر', accessor: 'parentPhone' },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader title="طلابي" description="قائمة الطلاب المسجلين في حصصك" />
      <div className="bg-card p-4 border rounded-xl shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default TeacherStudentsPage;
