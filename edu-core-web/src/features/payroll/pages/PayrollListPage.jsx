import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCcw,
  CheckCircle,
  Calculator,
  Eye,
  ShieldAlert,
  Check,
  Clock,
  Loader2,
  XCircle,
  Ban,
  Lock,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { payrollApi } from '../services/payrollApi';

import { teacherApi } from '@/features/teachers/services/teacherApi';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import DataTable from '@/shared/components/DataTable/DataTable';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { formatMoney } from '@/shared/utils/money';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';

const PayrollListPage = () => {
  const queryClient = useQueryClient();
  const { user } = usePermissions();
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
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل احتساب كشف الراتب');
    },
  });

  const submitApprovalMutation = useMutation({
    mutationFn: payrollApi.submitForApproval,
    onSuccess: () => {
      toast.success('تم تقديم طلب الاعتماد بنجاح');
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل تقديم طلب الاعتماد');
    },
  });

  const approveMutation = useMutation({
    mutationFn: payrollApi.approvePayroll,
    onSuccess: () => {
      toast.success('تم تسجيل موافقتك واعتماد الخطوة بنجاح');
      queryClient.invalidateQueries(['payroll']);
      queryClient.invalidateQueries(['payroll-approval', activePayrollId]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل تسجيل الاعتماد');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: payrollApi.rejectPayroll,
    onSuccess: () => {
      toast.success('تم رفض طلب الاعتماد وإرجاع كشف الراتب للمسودة');
      queryClient.invalidateQueries(['payroll']);
      queryClient.invalidateQueries(['payroll-approval', activePayrollId]);
      setIsApprovalOpen(false);
      setShowRejectForm(false);
      setRejectReason('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل رفض الطلب');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: payrollApi.markPaid,
    onSuccess: () => {
      toast.success('تم صرف كشف الراتب بنجاح، وتم تسجيل الحركات في القيود المحاسبية والصندوق');
      queryClient.invalidateQueries(['payroll']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل عملية صرف الراتب');
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
          return <span className="text-muted-foreground italic">مستخدم محذوف</span>;
        }
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        return name || <span className="text-muted-foreground italic">معلم بدون اسم</span>;
      },
    },
    { header: 'الشهر/السنة', cell: (row) => `${row.month}/${row.year}` },
    { header: 'الحصص المكتملة', accessor: 'completedLessons' },
    {
      header: 'إجمالي المستحق',
      cell: (row) => formatMoney(row.finalAmount),
    },
    {
      header: 'الحالة',
      cell: (row) => {
        // Map status to Arabic badges
        const status = row.status || (row.paid ? 'PAID' : 'CALCULATED');
        if (status === 'PAID') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-green-50 text-green-700 border border-green-200">
              <CheckCircle className="h-3.5 w-3.5 ml-1" />
              تم الصرف
            </span>
          );
        }
        if (status === 'APPROVED') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              <Check className="h-3.5 w-3.5 ml-1" />
              معتمد (جاهز للصرف)
            </span>
          );
        }
        if (status === 'PENDING_APPROVAL') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="h-3.5 w-3.5 ml-1" />
              قيد المراجعة والاعتماد
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
            <Lock className="h-3.5 w-3.5 ml-1" />
            مسودة محتسبة
          </span>
        );
      },
    },
    {
      header: 'إجراءات سير العمل والاعتمادات',
      cell: (row) => {
        const status = row.status || (row.paid ? 'PAID' : 'CALCULATED');
        return (
          <div className="flex items-center gap-2">
            {/* 1. CALCULATED: Action to submit for approval */}
            {status === 'CALCULATED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => submitApprovalMutation.mutate(row._id)}
                disabled={submitApprovalMutation.isPending}
                className="gap-1 h-8 rounded-xl font-bold bg-slate-50 border-slate-200 hover:bg-slate-100 text-xs"
              >
                <RefreshCcw className="h-3 w-3 ml-0.5" />
                تقديم للاعتماد
              </Button>
            )}

            {/* 2. PENDING_APPROVAL: Action to view levels, approve, or reject */}
            {status === 'PENDING_APPROVAL' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => openApprovalFlow(row._id)}
                className="gap-1 h-8 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white text-xs"
              >
                <Eye className="h-3 w-3 ml-0.5" />
                مراجعة واعتماد
              </Button>
            )}

            {/* 3. APPROVED: Action to pay salary */}
            {status === 'APPROVED' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => markPaidMutation.mutate(row._id)}
                disabled={markPaidMutation.isPending}
                className="gap-1 h-8 rounded-xl font-black bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                <CheckCircle className="h-3 w-3 ml-0.5" />
                صرف الراتب والقيود
              </Button>
            )}

            {/* PAID: No active actions except tracking log */}
            {status === 'PAID' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openApprovalFlow(row._id)}
                className="gap-1 h-8 rounded-xl font-bold text-slate-500 hover:bg-slate-50 text-xs"
              >
                <Eye className="h-3 w-3 ml-0.5" />
                تتبع التواقيع
              </Button>
            )}

            {/* Recalculate (always available except when paid) */}
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
                className="gap-1 h-8 rounded-xl text-xs hover:bg-slate-100"
              >
                <RefreshCcw className="h-3 w-3 ml-0.5" />
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
    request?.status === 'PENDING' &&
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
              تخضع كشوفات الرواتب المالية لتدقيق متعدد المستويات لضمان منع الأخطاء والمطابقة القانونية للمعهد.
            </DialogDescription>
          </DialogHeader>

          {loadingApproval ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
              <p className="text-sm font-bold text-slate-500">جاري تحميل مستندات وسلسلة الاعتمادات...</p>
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
                    {request.status === 'APPROVED' && <CheckCircle className="h-5 w-5" />}
                    {request.status === 'REJECTED' && <XCircle className="h-5 w-5" />}
                    {request.status === 'PENDING' && <Clock className="h-5 w-5" />}
                    حالة الملف الإجمالية: {
                      request.status === 'APPROVED' ? 'معتمد ومصدق بالكامل' :
                      request.status === 'REJECTED' ? 'تم الرفض والإرجاع للتعديل' :
                      'بانتظار استكمال التواقيع'
                    }
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
                  لم يتم تفعيل سلسلة التواقيع الإلكترونية لهذا السجل بعد. يرجى تقديمه للاعتماد أولاً.
                </div>
              )}

              {/* 2. Horizontal/Vertical Step Wizard */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-800">سلسلة مستويات الاعتماد المطلوبة:</h4>

                <div className="relative border-r-2 border-slate-200 pr-5 mr-3 space-y-6 py-2">
                  {levels.map((level, idx) => {
                    // Check if signature exists for this level
                    const sig = request?.signatures?.find((s) => s.role === level);
                    const isPassed = !!sig;
                    const isCurrent = request && request.status === 'PENDING' && request.currentLevel === idx;

                    return (
                      <div key={level} className="relative flex items-start gap-4">
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
                            <span className="text-[10px] font-black">{idx + 1}</span>
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-black text-slate-800">
                              مستوى الاعتماد {idx + 1}:{' '}
                              {level === 'ACCOUNTANT' ? 'المحاسب المالي' : 'إدارة النظام والأكاديمية'}
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
                              <span className="text-[10px] font-bold text-slate-400">غير نشط</span>
                            )}
                          </div>

                          {isPassed && sig && (
                            <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                              <p className="font-bold text-slate-700">
                                الموقع: {sig.userId ? `${sig.userId.firstName} ${sig.userId.lastName}` : 'نظام آلي'}
                              </p>
                              <p className="text-[10px]">
                                تاريخ التوقيع: {new Date(sig.signedAt).toLocaleString('ar-KW')}
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
                  <label className="block text-xs font-black text-red-800">
                    سبب الرفض أو التوجيه لإعادة الاحتساب (مطلوب):
                  </label>
                  <textarea
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
                        rejectMutation.mutate({ id: activePayrollId, rejectReason })
                      }
                      disabled={!rejectReason.trim() || rejectMutation.isPending}
                      className="text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      {rejectMutation.isPending ? 'جاري الحفظ...' : 'تأكيد الرفض والإرجاع'}
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
                  onClick={() => approveMutation.mutate(activePayrollId)}
                  disabled={approveMutation.isPending}
                  className="rounded-xl font-black bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                >
                  {approveMutation.isPending ? (
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
