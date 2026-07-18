import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { userApi } from '../services/userApi';
import { settingsApi } from '../services/settingsApi';

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
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const isAdmin = hasPermission('rbac.manage');

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authApi.getSessions(),
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(),
    enabled: isAdmin,
  });

  const { data: tenantSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['tenantSettings'],
    queryFn: () => settingsApi.getSettings(),
    enabled: isAdmin,
  });

  // Settings form state
  const [instituteName, setInstituteName] = useState('');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [lowHoursThreshold, setLowHoursThreshold] = useState(2);
  const [teacherPercentage, setTeacherPercentage] = useState(75);
  const [siblingDiscountPct, setSiblingDiscountPct] = useState(10);
  const [carDeduction, setCarDeduction] = useState(0.5);
  const [hourlyRates, setHourlyRates] = useState({
    PRIMARY: 7,
    INTERMEDIATE: 8,
    SECONDARY: 10,
    UNIVERSITY: 10,
    FOREIGN: 15,
    SPECIAL_NEEDS: 10,
  });

  useEffect(() => {
    if (tenantSettings?.data) {
      const data = tenantSettings.data;
      setInstituteName(data.instituteName || 'أكاديمية ركان');
      setReportYear(data.reportYear ?? new Date().getFullYear());
      setLowHoursThreshold(data.financialRules?.lowHoursThreshold ?? 2);
      setTeacherPercentage(data.financialRules?.teacherPercentage ?? 75);
      setSiblingDiscountPct(data.financialRules?.siblingDiscountPercentage ?? 10);
      setCarDeduction(data.financialRules?.transportationDeductionRate ?? 0.5);
      if (data.financialRules?.hourlyRates) {
        setHourlyRates(data.financialRules.hourlyRates);
      }
    }
  }, [tenantSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => settingsApi.updateSettings(data),
    onSuccess: () => {
      toast.success('تم تحديث إعدادات المعهد بنجاح');
      queryClient.invalidateQueries({ queryKey: ['tenantSettings'] });
    },
    onError: () => {
      toast.error('فشل في تحديث الإعدادات');
    },
  });

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      instituteName,
      reportYear: Number(reportYear),
      financialRules: {
        siblingDiscountPercentage: Number(siblingDiscountPct),
        teacherPercentage: Number(teacherPercentage),
        lowHoursThreshold: Number(lowHoursThreshold),
        transportationDeductionRate: Number(carDeduction),
        hourlyRates: {
          PRIMARY: Number(hourlyRates.PRIMARY),
          INTERMEDIATE: Number(hourlyRates.INTERMEDIATE),
          SECONDARY: Number(hourlyRates.SECONDARY),
          UNIVERSITY: Number(hourlyRates.UNIVERSITY),
          FOREIGN: Number(hourlyRates.FOREIGN),
          SPECIAL_NEEDS: Number(hourlyRates.SPECIAL_NEEDS),
        }
      }
    });
  };

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
        <TabsList className={`grid w-full mb-8 ${isAdmin ? 'grid-cols-5' : 'grid-cols-2'}`}>
          <TabsTrigger value="account">حسابي</TabsTrigger>
          <TabsTrigger value="sessions">الجلسات النشطة</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">المستخدمين</TabsTrigger>}
          {isAdmin && <TabsTrigger value="rbac">الأدوار والصلاحيات</TabsTrigger>}
          {isAdmin && <TabsTrigger value="institute">إعدادات المعهد</TabsTrigger>}
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

        {isAdmin && (
          <TabsContent value="institute">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات المعهد والبيانات المالية</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSettingsSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>اسم المعهد</Label>
                      <Input
                        value={instituteName}
                        onChange={(e) => setInstituteName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>السنة المالية للتقارير (Report Year)</Label>
                      <Input
                        type="number"
                        value={reportYear}
                        onChange={(e) => setReportYear(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تنبيه رصيد الساعات المنخفض (Low Hours Alert)</Label>
                      <Input
                        type="number"
                        value={lowHoursThreshold}
                        onChange={(e) => setLowHoursThreshold(e.target.value)}
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>النسبة الافتراضية للمعلم (%) (Teacher Percentage)</Label>
                      <Input
                        type="number"
                        value={teacherPercentage}
                        onChange={(e) => setTeacherPercentage(e.target.value)}
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>نسبة خصم الأشقاء (%)</Label>
                      <Input
                        type="number"
                        value={siblingDiscountPct}
                        onChange={(e) => setSiblingDiscountPct(e.target.value)}
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>قيمة خصم السيارة (KWD لكل حصة)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={carDeduction}
                        onChange={(e) => setCarDeduction(e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">جدول أسعار الساعات حسب المرحلة الدراسية (دينار كويتي)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>تأسيس / ابتدائي (PRIMARY)</Label>
                        <Input
                          type="number"
                          value={hourlyRates.PRIMARY}
                          onChange={(e) =>
                            setHourlyRates({
                              ...hourlyRates,
                              PRIMARY: e.target.value,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>متوسط (INTERMEDIATE)</Label>
                        <Input
                          type="number"
                          value={hourlyRates.INTERMEDIATE}
                          onChange={(e) =>
                            setHourlyRates({
                              ...hourlyRates,
                              INTERMEDIATE: e.target.value,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ثانوي (SECONDARY)</Label>
                        <Input
                          type="number"
                          value={hourlyRates.SECONDARY}
                          onChange={(e) =>
                            setHourlyRates({
                              ...hourlyRates,
                              SECONDARY: e.target.value,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>جامعي (UNIVERSITY)</Label>
                        <Input
                          type="number"
                          value={hourlyRates.UNIVERSITY}
                          onChange={(e) =>
                            setHourlyRates({
                              ...hourlyRates,
                              UNIVERSITY: e.target.value,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>قدرات / مدارس أجنبية (FOREIGN)</Label>
                        <Input
                          type="number"
                          value={hourlyRates.FOREIGN}
                          onChange={(e) =>
                            setHourlyRates({
                              ...hourlyRates,
                              FOREIGN: e.target.value,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>صعوبات تعلم / تحصيلي (SPECIAL_NEEDS)</Label>
                        <Input
                          type="number"
                          value={hourlyRates.SPECIAL_NEEDS}
                          onChange={(e) =>
                            setHourlyRates({
                              ...hourlyRates,
                              SPECIAL_NEEDS: e.target.value,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;
