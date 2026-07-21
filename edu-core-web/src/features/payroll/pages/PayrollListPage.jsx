import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCcw,
  CheckCircle,
  Calculator,
  Send,
  Award,
  Loader2,
  XCircle,
  Clock,
  Check,
  Ban,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { payrollApi } from '../services/payrollApi';

import { useAuth } from '@/features/auth/AuthContext';
import { teacherApi } from '@/features/teachers/services/teacherApi';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { formatMoney } from '@/shared/utils/money';

const PayrollListPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [month] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());

  // Approval Tracking Modal state
  const [activePayrollId, setActivePayrollId] = useState(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // 1. Fetch Payroll Records
  const { data, isLoading } = useQuery({
    queryKey: ['payroll', { teacherId: selectedTeacher, month, year }],
    queryFn: () =>
      payrollApi.getAllPayroll({ teacherId: selectedTeacher, month, year }),
  });

  const activeRecord = data?.data?.find((r) => r._id === activePayrollId);

  // 2. Fetch Teachers
  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAllTeachers({ limit: 100 }),
  });

  // 3. Fetch Active Approval Details
  const { data: approvalDetails, isLoading: loadingApproval } = useQuery({
    queryKey: ['payroll-approval', activePayrollId],
    queryFn: () => payrollApi.getApprovalDetails(activePayrollId),
    enabled: !!activePayrollId && isApprovalOpen,
  });

  // Mutations
  const generateMutation = useMutation({
    mutationFn: payrollApi.generatePayroll,
    onSuccess: () => {
      toast.success('تم احتساب كشف راتب المعلم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message || 'فشل احتساب كشف الراتب'
      );
    },
  });

  const submitApprovalMutation = useMutation({
    mutationFn: payrollApi.submitApproval,
    onSuccess: () => {
      toast.success('تم تقديم سجل الراتب وسلسلة الاعتمادات بنجاح');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message ||
          err.message ||
          'فشل تقديم طلب الاعتماد'
      );
    },
  });

  const approvePayrollMutation = useMutation({
    mutationFn: payrollApi.approvePayroll,
    onSuccess: () => {
      toast.success('تم تسجيل موافقتك واعتماد الخطوة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      if (activePayrollId) {
        queryClient.invalidateQueries({
          queryKey: ['payroll-approval', activePayrollId],
        });
      }
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message ||
          err.message ||
          'فشل تسجيل الاعتماد'
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: payrollApi.rejectPayroll,
    onSuccess: () => {
      toast.success('تم رفض طلب الاعتماد وإرجاع كشف الراتب للمسودة');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      if (activePayrollId) {
        queryClient.invalidateQueries({
          queryKey: ['payroll-approval', activePayrollId],
        });
      }
      setIsApprovalOpen(false);
      setShowRejectForm(false);
      setRejectReason('');
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message || err.message || 'فشل رفض الطلب'
      );
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: payrollApi.markPaid,
    onSuccess: () => {
      toast.success(
        'تم صرف كشف الراتب بنجاح، وتسجيل القيد المزدوج بالدفاتر المالية والصندوق'
      );
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message || err.message || 'فشل صرف الراتب'
      );
    },
  });

  const handleGenerate = () => {
    if (selectedTeacher) {
      generateMutation.mutate({ teacherId: selectedTeacher, month, year });
    }
  };

  const openApprovalFlow = (id) => {
    setActivePayrollId(id);
    setIsApprovalOpen(true);
    setShowRejectForm(false);
    setRejectReason('');
  };

  const columns = [
    {
      header: 'المعلم',
      cell: (row) => {
        const u = row.teacherId?.userId;
        if (!u) {
          return (
            <span className="text-muted-foreground italic">مستخدم محذوف</span>
          );
        }
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        return (
          name || (
            <span className="text-muted-foreground italic">معلم بدون اسم</span>
          )
        );
      },
    },
    { header: 'الشهر/السنة', cell: (row) => `${row.month}/${row.year}` },
    { header: 'الحصص المكتملة', accessor: 'completedLessons' },
    {
      header: 'المستحق الأساسي',
      cell: (row) => formatMoney(row.teacherEarnings || 0),
    },
    {
      header: 'المكافآت (+)',
      cell: (row) => formatMoney(row.bonuses || 0),
    },
    {
      header: 'الخصومات (-)',
      cell: (row) =>
        formatMoney((row.transportDeductions || 0) + (row.penalties || 0)),
    },
    {
      header: 'صافي المستحق',
      cell: (row) => (
        <span className="font-extrabold text-slate-800">
          {formatMoney(row.finalAmount)}
        </span>
      ),
    },
    {
      header: 'الحالة المحاسبية',
      cell: (row) => {
        const status = row.status || (row.paid ? 'PAID' : 'CALCULATED');
        const badgeStyles = {
          CALCULATED: 'bg-slate-100 text-slate-800 border-slate-200',
          PENDING_APPROVAL:
            'bg-amber-100 text-yellow-800 border-yellow-200 animate-pulse',
          APPROVED: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          PAID: 'bg-green-100 text-green-800 border-green-200',
        };
        const statusLabels = {
          CALCULATED: 'محسوب آلياً',
          PENDING_APPROVAL: 'بانتظار الاعتماد',
          APPROVED: 'جاهز للصرف',
          PAID: 'تم الصرف',
        };
        return (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
              badgeStyles[status] || ''
            }`}
          >
            {statusLabels[status] || status}
          </span>
        );
      },
    },
    {
      header: 'إجراءات الحوكمة المالية',
      cell: (row) => {
        const status = row.status || (row.paid ? 'PAID' : 'CALCULATED');
        const isAdminOrAccountant =
          user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

        return (
          <div className="flex items-center gap-2">
            {status === 'CALCULATED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => submitApprovalMutation.mutate(row._id)}
                disabled={submitApprovalMutation.isPending}
                className="gap-1 h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <Send className="h-3 w-3" />
                تقديم للاعتماد
              </Button>
            )}

            {status === 'PENDING_APPROVAL' && isAdminOrAccountant && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => approvePayrollMutation.mutate(row._id)}
                disabled={approvePayrollMutation.isPending}
                className="gap-1 h-8 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              >
                <Award className="h-3 w-3" />
                توقيع واعتماد
              </Button>
            )}

            {status === 'APPROVED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markPaidMutation.mutate(row._id)}
                disabled={markPaidMutation.isPending}
                className="gap-1 h-8 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              >
                <CheckCircle className="h-3 w-3" />
                صرف الراتب
              </Button>
            )}

            {status === 'PAID' && (
              <span className="text-xs text-muted-foreground">
                صرف كامل بالدفاتر
              </span>
            )}

            {status !== 'CALCULATED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openApprovalFlow(row._id)}
                className="gap-1 h-8 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              >
                سير الاعتماد
              </Button>
            )}

            {status !== 'PAID' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  generateMutation.mutate({
                    teacherId: row.teacherId._id,
                    month: row.month,
                    year: row.year,
                  })
                }
                disabled={generateMutation.isPending}
                className="gap-1 h-8"
              >
                <RefreshCcw className="h-3 w-3" />
                تحديث
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const request = approvalDetails?.data?.request;
  const levels = approvalDetails?.data?.levels || ['ACCOUNTANT', 'ADMIN'];

  // Calculate if active logged-in user role is authorized to sign the active pending step
  const activeLevelRole = request && levels[request.currentLevel];
  const isUserAuthorizedToSign =
    approvalDetails?.data?.isAuthorizedToSign !== undefined
      ? approvalDetails.data.isAuthorizedToSign
      : request?.status === 'PENDING' &&
        (user?.role === 'ADMIN' || user?.role === activeLevelRole);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <PageHeader
        title="رواتب المعلمين وسير الاعتمادات"
        description="احتساب كشوف رواتب المعلمين وإدارتها وتوقيع الاعتمادات الإدارية وصرف القيود"
      >
        <div className="flex gap-2">
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="flex h-9 w-48 rounded-xl border border-input bg-white px-3 py-1 text-sm font-bold shadow-sm"
          >
            <option value="">كل المعلمين...</option>
            {teachers?.data?.map((t) => {
              const name = t.userId
                ? `${t.userId.firstName || ''} ${t.userId.lastName || ''}`.trim()
                : '';
              return (
                <option key={t._id} value={t._id}>
                  {name || 'معلم غير معروف'}
                </option>
              );
            })}
          </select>
          <Button
            onClick={handleGenerate}
            disabled={!selectedTeacher || generateMutation.isPending}
            className="gap-2 rounded-xl font-bold h-9"
          >
            <Calculator className="h-4 w-4 ml-1" />
            احتساب الراتب الجديد
          </Button>
        </div>
      </PageHeader>

      <div className="bg-card p-5 border border-slate-200 rounded-2xl shadow-lg">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />
      </div>

      {/* High-Fidelity Visual Multi-Level Approval Progress Dialog */}
      <Dialog open={isApprovalOpen} onOpenChange={setIsApprovalOpen}>
        <DialogContent className="sm:max-w-xl text-right rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-secondary" />
              متابعة سير تواقيع الاعتماد والتدقيق المحاسبي
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              تخضع كشوفات الرواتب المالية لتدقيق متعدد المستويات لضمان منع
              الأخطاء والمطابقة القانونية للمعهد.
            </DialogDescription>
          </DialogHeader>

          {loadingApproval ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
              <p className="text-sm font-bold text-slate-500">
                جاري تحميل مستندات وسلسلة الاعتمادات...
              </p>
            </div>
          ) : (
            <div className="space-y-6 my-4">
              {/* 1. Request Overall Status Header Banner */}
              {request ? (
                <div
                  className={`p-4 rounded-xl border ${
                    request.status === 'APPROVED'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : request.status === 'REJECTED'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm">
                    {request.status === 'APPROVED' && (
                      <CheckCircle className="h-5 w-5" />
                    )}
                    {request.status === 'REJECTED' && (
                      <XCircle className="h-5 w-5" />
                    )}
                    {request.status === 'PENDING' && (
                      <Clock className="h-5 w-5" />
                    )}
                    حالة الملف الإجمالية:{' '}
                    {request.status === 'APPROVED'
                      ? 'معتمد ومصدق بالكامل'
                      : request.status === 'REJECTED'
                        ? 'تم الرفض والإرجاع للتعديل'
                        : 'بانتظار استكمال التواقيع'}
                  </div>
                  {request.status === 'REJECTED' && request.rejectReason && (
                    <div className="mt-2 text-xs font-bold leading-relaxed">
                      <strong>سبب الرفض المدون:</strong> {request.rejectReason}
                    </div>
                  )}
                  {request.notes && (
                    <div className="mt-1 text-xs text-slate-600">
                      <strong>ملاحظات:</strong> {request.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-center text-xs font-bold">
                  لم يتم تفعيل سلسلة التواقيع الإلكترونية لهذا السجل بعد. يرجى
                  تقديمه للاعتماد أولاً.
                </div>
              )}

              {/* High-Fidelity Financial Breakdown Card */}
              {activeRecord && (
                <div className="p-5 border border-slate-200 bg-slate-50 rounded-2xl space-y-3">
                  <h4 className="text-sm font-black text-slate-800 border-b pb-2">
                    التفاصيل المالية لكشف راتب مركز التكلفة:
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        الحصص المكتملة:
                      </span>
                      <span className="font-bold text-slate-800">
                        {activeRecord.completedLessons} حصة
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        إجمالي قيمة الدروس:
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatMoney(activeRecord.totalLessonValue || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        المستحق الأساسي للمعلم:
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatMoney(activeRecord.teacherEarnings || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        خصومات المواصلات (السيارة):
                      </span>
                      <span className="font-bold text-red-600">
                        -{formatMoney(activeRecord.transportDeductions || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        المكافآت الإدارية (+):
                      </span>
                      <span className="font-bold text-green-600">
                        +{formatMoney(activeRecord.bonuses || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">
                        الجزاءات والاستقطاعات (-):
                      </span>
                      <span className="font-bold text-red-600">
                        -{formatMoney(activeRecord.penalties || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-slate-600">
                      صافي المستحق النهائي للصرف:
                    </span>
                    <span className="text-lg font-black text-primary">
                      {formatMoney(activeRecord.finalAmount || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Horizontal/Vertical Step Wizard */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-800">
                  سلسلة مستويات الاعتماد المطلوبة:
                </h4>

                <div className="relative border-r-2 border-slate-200 pr-5 mr-3 space-y-6 py-2">
                  {levels.map((level, idx) => {
                    // Check if signature exists for this level
                    const sig = request?.signatures?.find(
                      (s) => s.role === level
                    );
                    const isPassed = !!sig;
                    const isCurrent =
                      request &&
                      request.status === 'PENDING' &&
                      request.currentLevel === idx;

                    return (
                      <div
                        key={level}
                        className="relative flex items-start gap-4"
                      >
                        {/* Step Marker Indicator Dot */}
                        <div
                          className={`absolute -right-[31px] top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isPassed
                              ? 'bg-green-600 border-green-600 text-white'
                              : isCurrent
                                ? 'bg-amber-500 border-amber-500 text-white animate-pulse'
                                : 'bg-white border-slate-300 text-slate-400'
                          }`}
                        >
                          {isPassed ? (
                            <Check className="h-3 w-3 stroke-[3]" />
                          ) : (
                            <span className="text-[10px] font-black">
                              {idx + 1}
                            </span>
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-black text-slate-800">
                              مستوى الاعتماد {idx + 1}:{' '}
                              {level === 'ACCOUNTANT'
                                ? 'المحاسب المالي'
                                : 'إدارة النظام والأكاديمية'}
                            </h5>
                            {isPassed ? (
                              <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                تم التوقيع والاعتماد
                              </span>
                            ) : isCurrent ? (
                              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
                                معلّق وبانتظار التوقيع
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">
                                غير نشط
                              </span>
                            )}
                          </div>

                          {isPassed && sig && (
                            <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                              <p className="font-bold text-slate-700">
                                الموقع:{' '}
                                {sig.userId
                                  ? `${sig.userId.firstName} ${sig.userId.lastName}`
                                  : 'نظام آلي'}
                              </p>
                              <p className="text-[10px]">
                                تاريخ التوقيع:{' '}
                                {new Date(sig.signedAt).toLocaleString('ar-KW')}
                              </p>
                            </div>
                          )}

                          {isCurrent && isUserAuthorizedToSign && (
                            <div className="mt-2 text-xs font-black text-secondary bg-secondary/5 p-2 rounded-lg border border-secondary/20">
                              صلاحيتك الحالية تمنحك حق التوقيع على هذا المستوى.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Inline Reject Form */}
              {showRejectForm && (
                <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <label
                    htmlFor="reject-reason"
                    className="block text-xs font-black text-red-800"
                  >
                    سبب الرفض أو التوجيه لإعادة الاحتساب (مطلوب):
                  </label>
                  <textarea
                    id="reject-reason"
                    rows={3}
                    placeholder="يرجى كتابة سبب الرفض بوضوح ليتمكن الزملاء من مراجعة الحصص أو الخصومات..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-xs focus:ring-red-500 focus:border-red-500 focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRejectForm(false)}
                      className="text-xs rounded-lg hover:bg-red-100 text-red-700 font-bold"
                    >
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        rejectMutation.mutate({
                          id: activePayrollId,
                          rejectReason,
                        })
                      }
                      disabled={
                        !rejectReason.trim() || rejectMutation.isPending
                      }
                      className="text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      {rejectMutation.isPending
                        ? 'جاري الحفظ...'
                        : 'تأكيد الرفض والإرجاع'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-start flex-row-reverse border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApprovalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              إغلاق النافذة
            </Button>

            {/* If user is authorized and request is pending, offer Accept/Reject controls */}
            {isUserAuthorizedToSign && !showRejectForm && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  className="rounded-xl font-bold border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs"
                >
                  <Ban className="h-4 w-4 ml-1" />
                  رفض وإرجاع
                </Button>
                <Button
                  size="sm"
                  onClick={() => approvePayrollMutation.mutate(activePayrollId)}
                  disabled={approvePayrollMutation.isPending}
                  className="rounded-xl font-black bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                >
                  {approvePayrollMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 ml-1" />
                  )}
                  اعتماد وتوقيع المستوى
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollListPage;
