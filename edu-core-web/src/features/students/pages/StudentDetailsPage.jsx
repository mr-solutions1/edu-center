import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  Clock,
  CreditCard,
  Calendar,
} from 'lucide-react';
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import { teacherApi } from '../../teachers/services/teacherApi';
import HourLedgerTimeline from '../components/HourLedgerTimeline';
import RegistrationFormDialog from '../components/RegistrationFormDialog';
import { studentApi } from '../services/studentApi';

import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { formatMoney } from '@/shared/utils/money';

const StudentDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [regOpen, setRegOpen] = useState(false);
  const [deleteRegId, setDeleteRegId] = useState(null);

  const { data: studentRes, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentApi.getStudentById(id),
  });

  const { data: regsRes, isLoading: loadingRegs } = useQuery({
    queryKey: ['student-registrations', id],
    queryFn: () => studentApi.getRegistrations(id),
  });

  const { data: ledgerRes, isLoading: loadingLedger } = useQuery({
    queryKey: ['student-hour-ledger', id],
    queryFn: () => studentApi.getHourLedger(id),
  });

  const { data: teachersRes } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAllTeachers(),
  });

  const createRegMutation = useMutation({
    mutationFn: (regData) => studentApi.createRegistration(id, regData),
    onSuccess: () => {
      queryClient.invalidateQueries(['student', id]);
      queryClient.invalidateQueries(['student-registrations', id]);
      queryClient.invalidateQueries(['student-hour-ledger', id]);
      setRegOpen(false);
    },
  });

  const deleteRegMutation = useMutation({
    mutationFn: (regId) => studentApi.deleteRegistration(id, regId),
    onSuccess: () => {
      queryClient.invalidateQueries(['student', id]);
      queryClient.invalidateQueries(['student-registrations', id]);
      queryClient.invalidateQueries(['student-hour-ledger', id]);
      setDeleteRegId(null);
    },
  });

  if (loadingStudent || loadingRegs || loadingLedger) {
    return <div className="text-center py-10">جاري التحميل...</div>;
  }

  const student = studentRes?.data;
  const registrations = regsRes?.data || [];
  const ledgerHistory = ledgerRes?.data || [];
  const teachers = teachersRes?.data || [];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <PageHeader
          title={student?.parentName || 'تفاصيل الطالب'}
          description={`كود الطالب: ${student?.studentCode}`}
        >
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/students">
                <ArrowLeft className="ml-2 h-4 w-4" />
                العودة لقائمة الطلاب
              </Link>
            </Button>
            <Button onClick={() => setRegOpen(true)} className="gap-2">
              <Plus className="ml-1 h-4 w-4" />
              تسجيل مادة / حزمة جديدة
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Grid of Student-Level Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-r-4 border-r-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1 justify-between">
              <span>إجمالي الساعات المشتراة</span>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {student?.totalBalance || 0} ساعة
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              المجموع التراكمي لجميع المواد
            </p>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1 justify-between">
              <span>الساعات المستهلكة</span>
              <Clock className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {student?.totalConsumed || 0} ساعة
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              المستهلكة بالحصص المكتملة
            </p>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1 justify-between">
              <span>الساعات المتبقية</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {student?.remainingHours || 0} ساعة
            </div>
            <div className="mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${student?.balanceAlert === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {student?.balanceAlert === 'OK'
                  ? 'رصيد ممتاز'
                  : student?.balanceAlert === 'Hours Exceeded'
                    ? 'تجاوز الساعات'
                    : 'رصيد منخفض'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1 justify-between">
              <span>الوضع المالي</span>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">
              المتبقي: {formatMoney(student?.remainingAmount || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex justify-between">
              <span>المدفوع: {formatMoney(student?.totalPaid || 0)}</span>
              <span>الإجمالي: {formatMoney(student?.totalDue || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Details & Weekly Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">الملف التعريفي للطالب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">اسم ولي الأمر:</span>
              <span className="font-semibold">{student?.parentName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">رقم الهاتف:</span>
              <span className="font-semibold" dir="ltr">
                {student?.parentPhone}
              </span>
            </div>
            {student?.whatsapp && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">واتساب:</span>
                <span className="font-semibold" dir="ltr">
                  {student?.whatsapp}
                </span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">المرحلة الدراسية:</span>
              <span className="font-semibold">{student?.grade}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">الرسوم الشهرية:</span>
              <span className="font-semibold">
                {formatMoney(student?.monthlyFee || 0)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">حالة السداد:</span>
              <span className="font-semibold">{student?.paymentStatus}</span>
            </div>
            {student?.siblingGroup && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">مجموعة الأشقاء:</span>
                <span className="font-semibold">{student?.siblingGroup}</span>
              </div>
            )}
            {student?.address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">العنوان:</span>
                <span className="font-semibold">{student?.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registrations list */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              <span>الحزم والمواد المسجلة</span>
              <Button onClick={() => setRegOpen(true)} size="sm">
                تسجيل جديد
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                لا توجد مواد مسجلة حالياً لهذا الطالب.
              </div>
            ) : (
              <div className="space-y-4">
                {registrations.map((reg) => (
                  <div
                    key={reg._id}
                    className={`p-4 border rounded-lg ${reg.primaryRow ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                          {reg.subject}
                          {reg.registrationId && (
                            <span className="text-sm font-normal text-muted-foreground">
                              ({reg.registrationId})
                            </span>
                          )}
                          {reg.primaryRow && (
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                              التسجيل الرئيسي
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          المعلم:{' '}
                          {reg.teacherId
                            ? `${reg.teacherId.userId?.firstName || ''} ${reg.teacherId.userId?.lastName || ''}`
                            : 'غير محدد'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={reg.status} domain="registration" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteRegId(reg._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs border-t pt-3">
                      <div>
                        <span className="text-muted-foreground block">
                          الساعات المشتراة:
                        </span>
                        <span className="font-bold text-sm">
                          {reg.purchasedHours} ساعة
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          السعر الإجمالي للباقة:
                        </span>
                        <span className="font-bold text-sm">
                          {formatMoney(reg.totalAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-emerald-700">
                          المدفوع الفعلي (FIFO):
                        </span>
                        <span className="font-bold text-sm text-emerald-700">
                          {formatMoney(reg.paidAmount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-rose-700">
                          المتبقي ماليًا:
                        </span>
                        <span className="font-bold text-sm text-rose-700">
                          {formatMoney(Math.max(0, (reg.totalAmount || 0) - (reg.paidAmount || 0)))}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground block">
                          سعر ساعة العقد المجمد:
                        </span>
                        <span className="font-semibold">
                          {formatMoney(reg.pricePerHour || 0)}/ساعة
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          نسبة المعلم المجمدة:
                        </span>
                        <span className="font-semibold">
                          {reg.teacherPercentageSnapshot || 75}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          الساعات الأسبوعية:
                        </span>
                        <span className="font-semibold">
                          {reg.weeklyHours || 0} ساعة
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          مستحقات المعلم (المتراكمة):
                        </span>
                        <span className="font-semibold text-primary">
                          {formatMoney(reg.teacherDue || 0)}
                        </span>
                      </div>

                      {/* Consumed Progress Bar */}
                      <div className="col-span-2 md:col-span-4 mt-2">
                        <div className="flex justify-between mb-1 font-semibold text-slate-500">
                          <span>استهلاك الساعات الدراسية:</span>
                          <span>{reg.purchasedHours > 0 ? Math.round((reg.consumedHours / reg.purchasedHours) * 100) : 0}% ({reg.consumedHours} من {reg.purchasedHours} ساعة)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (reg.purchasedHours > 0 ? (reg.consumedHours / reg.purchasedHours) * 100 : 0) >= 100
                                ? 'bg-red-500'
                                : (reg.purchasedHours > 0 ? (reg.consumedHours / reg.purchasedHours) * 100 : 0) >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(100, reg.purchasedHours > 0 ? Math.round((reg.consumedHours / reg.purchasedHours) * 100) : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {(reg.day1 || reg.day2) && (
                      <div className="mt-2 text-xs bg-muted p-2 rounded-md">
                        <span className="font-semibold text-muted-foreground">
                          الجدول الأسبوعي:
                        </span>
                        <div className="flex gap-4 mt-1 flex-wrap">
                          {reg.day1 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {reg.day1}: {reg.from1} - {reg.to1}
                            </span>
                          )}
                          {reg.day2 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {reg.day2}: {reg.from2} - {reg.to2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* High-Fidelity Student Hour Ledger Timeline */}
      <div className="mt-6">
        <HourLedgerTimeline history={ledgerHistory} />
      </div>

      <RegistrationFormDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        onSubmit={(data) => createRegMutation.mutate(data)}
        isSubmitting={createRegMutation.isPending}
        teachers={teachers}
      />

      <ConfirmDialog
        open={!!deleteRegId}
        onOpenChange={(open) => !open && setDeleteRegId(null)}
        onConfirm={() => deleteRegMutation.mutate(deleteRegId)}
        isLoading={deleteRegMutation.isPending}
        title="حذف تسجيل مادة"
        description="هل أنت متأكد من حذف هذا التسجيل؟ سيتم تعديل الحسابات والمبالغ المستحقة فوراً."
      />
    </div>
  );
};

export default StudentDetailsPage;
