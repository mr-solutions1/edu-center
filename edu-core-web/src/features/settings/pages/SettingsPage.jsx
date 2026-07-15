import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { userApi } from '../services/userApi';

import { useAuth } from '@/features/auth/AuthContext';
import { authApi } from '@/features/auth/services/authApi';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { formatDate } from '@/shared/utils/date';
import RbacSettings from '../components/RbacSettings';

const SettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authApi.getSessions(),
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(),
    enabled: isAdmin,
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => userApi.changePassword(user.id, data),
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح');
      setOldPassword('');
      setNewPassword('');
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.error?.message || 'فشل تغيير كلمة المرور'
      );
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('تم إنهاء الجلسة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: () => {
      toast.success('تم تسجيل الخروج من جميع الأجهزة');
      window.location.reload();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => userApi.updateUser(id, data),
    onSuccess: () => {
      toast.success('تم تحديث بيانات المستخدم');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      return;
    }
    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  const sessionColumns = [
    { header: 'IP Address', accessor: 'ipAddress' },
    { header: 'User Agent', accessor: 'userAgent' },
    {
      header: 'تاريخ الدخول',
      cell: (row) => formatDate(row.createdAt, 'yyyy/MM/dd HH:mm'),
    },
    {
      header: 'إجراءات',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => revokeSessionMutation.mutate(row._id)}
        >
          إنهاء
        </Button>
      ),
    },
  ];

  const userColumns = [
    { header: 'الاسم', cell: (row) => `${row.firstName} ${row.lastName}` },
    { header: 'البريد الإلكتروني', accessor: 'email' },
    {
      header: 'الدور',
      cell: (row) => (
        <select
          value={row.role}
          onChange={(e) =>
            updateUserMutation.mutate({
              id: row._id,
              data: { role: e.target.value },
            })
          }
          className="bg-transparent border-none text-sm"
        >
          <option value="ADMIN">مدير</option>
          <option value="RECEPTIONIST">موظف استقبال</option>
          <option value="TEACHER">معلم</option>
          <option value="ACCOUNTANT">محاسب</option>
        </select>
      ),
    },
    {
      header: 'الحالة',
      cell: (row) => (
        <span className={row.isActive ? 'text-green-600' : 'text-red-600'}>
          {row.isActive ? 'نشط' : 'غير نشط'}
        </span>
      ),
    },
    {
      header: 'إجراءات',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            updateUserMutation.mutate({
              id: row._id,
              data: { isActive: !row.isActive },
            })
          }
        >
          {row.isActive ? 'تعطيل' : 'تفعيل'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader title="الإعدادات" description="إدارة حسابك وتفضيلات النظام" />

      <Tabs defaultValue="account" className="w-full">
        <TabsList className={`grid w-full mb-8 ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <TabsTrigger value="account">حسابي</TabsTrigger>
          <TabsTrigger value="sessions">الجلسات النشطة</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">المستخدمين</TabsTrigger>}
          {isAdmin && <TabsTrigger value="rbac">الأدوار والصلاحيات</TabsTrigger>}
        </TabsList>

        <TabsContent value="account">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>الملف الشخصي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>الاسم</Label>
                  <Input
                    value={`${user?.firstName} ${user?.lastName}`}
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={user?.email} readOnly />
                </div>
                <div className="space-y-1">
                  <Label>الدور</Label>
                  <Input value={user?.role} readOnly />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تغيير كلمة المرور</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1">
                    <Label>كلمة المرور القديمة</Label>
                    <Input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>كلمة المرور الجديدة</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending
                      ? 'جاري الحفظ...'
                      : 'تغيير كلمة المرور'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الجلسات النشطة</CardTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => logoutAllMutation.mutate()}
                disabled={logoutAllMutation.isPending}
              >
                تسجيل الخروج من كل الأجهزة
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={sessionColumns}
                data={sessions?.data || []}
                isLoading={loadingSessions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المستخدمين</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={userColumns}
                  data={users?.data || []}
                  isLoading={loadingUsers}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="rbac" className="space-y-6">
            <RbacSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;
