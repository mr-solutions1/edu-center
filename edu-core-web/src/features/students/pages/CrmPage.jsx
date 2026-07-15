import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, Calendar, CreditCard, MessageSquare, Phone, UserCheck, ArrowLeftRight, Clock, Trash2, TrendingUp, AlertCircle, Bookmark, CheckCircle, Info } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { crmApi } from '../services/crmApi';
import PageHeader from '@/shared/components/PageHeader/PageHeader';
import StatCard from '@/shared/components/StatCard/StatCard';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

const CRM_STAGES = [
  { key: 'NEW', label: 'عملاء جدد', color: 'bg-blue-500 text-white' },
  { key: 'CONTACTED', label: 'تم التواصل', color: 'bg-amber-500 text-white' },
  { key: 'QUALIFIED', label: 'مهتم / مؤهل', color: 'bg-indigo-500 text-white' },
  { key: 'LOST', label: 'غير مهتم', color: 'bg-red-500 text-white' },
  { key: 'CONVERTED', label: 'تم التسجيل 🎉', color: 'bg-emerald-500 text-white' },
];

const CrmPage = () => {
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isAddingLead, setIsAddingLead] = useState(false);

  // New Lead fields
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('DIRECT');
  const [newLeadExpected, setNewLeadExpected] = useState(0);

  // Notes/Follow-up fields
  const [noteText, setNoteText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // 1. Fetch CRM leads and statistics
  const { data: crmData, isLoading, isError, refetch } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: () => crmApi.getLeads(),
  });

  // 2. Mutations
  const createLeadMutation = useMutation({
    mutationFn: (data) => crmApi.createLead(data),
    onSuccess: () => {
      toast.success('تم إضافة العميل المحتمل بنجاح');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setIsAddingLead(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadSource('DIRECT');
      setNewLeadExpected(0);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل إضافة العميل');
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => crmApi.updateLead(id, data),
    onSuccess: () => {
      toast.success('تم تحديث حالة المتابعة');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'فشل تحديث العميل');
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, text }) => crmApi.addNote(id, text),
    onSuccess: () => {
      toast.success('تم إضافة الملاحظة والنشاط بنجاح');
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
  });

  const addFollowUpMutation = useMutation({
    mutationFn: ({ id, data }) => crmApi.addFollowUp(id, data),
    onSuccess: () => {
      toast.success('تم جدولة الاتصال القادم بنجاح');
      setFollowUpDate('');
      setFollowUpNotes('');
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
  });

  const leads = crmData?.data || [];
  const metrics = crmData?.metrics || {};

  // Find currently open lead
  const activeLead = leads.find((l) => l._id === selectedLeadId);

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) {
      toast.error('الرجاء تعبئة الاسم ورقم الهاتف');
      return;
    }
    createLeadMutation.mutate({
      name: newLeadName,
      phone: newLeadPhone,
      source: newLeadSource,
      expectedValue: Number(newLeadExpected) * 1000, // KWD to Fils
    });
  };

  if (isLoading) {
    return <div className="text-center py-20 font-black">جاري تحميل لوحة المبيعات والعملاء المحتملين...</div>;
  }

  return (
    <div className="space-y-8 text-right font-sans" dir="rtl">
      <PageHeader
        title="لوحة الـ CRM وإدارة المبيعات"
        description="تتبع العملاء المحتملين ومعدلات التحويل ونشاط المتابعات اليومية بمستوى HubSpot"
      >
        <Button onClick={() => setIsAddingLead(true)} className="rounded-xl font-bold gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="h-4 w-4" />
          إضافة عميل محتمل
        </Button>
      </PageHeader>

      {/* CRM Pipeline Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="إجمالي العملاء المستهدفين"
          value={metrics.totalLeadsCount || 0}
          icon={Bookmark}
        />
        <StatCard
          label="العملاء المسجلين بالفعل"
          value={metrics.convertedCount || 0}
          icon={CheckCircle}
        />
        <StatCard
          label="معدل التحويل الكلي (Conversion Rate)"
          value={`${metrics.conversionRate || 0}%`}
          icon={TrendingUp}
        />
      </div>

      {/* HubSpot Style Swimlane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-x-auto pb-4">
        {CRM_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.key);
          return (
            <div key={stage.key} className="bg-slate-100 p-4 rounded-2xl min-w-[240px] flex flex-col space-y-4 shadow-inner border border-slate-200">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${stage.key === 'CONVERTED' ? 'bg-emerald-500' : 'bg-primary'}`} />
                  {stage.label}
                </span>
                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-black text-slate-600">
                  {stageLeads.length}
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[60vh] flex-1">
                {stageLeads.length > 0 ? (
                  stageLeads.map((lead) => (
                    <div
                      key={lead._id}
                      onClick={() => setSelectedLeadId(lead._id)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-secondary/40 transition-all cursor-pointer space-y-3"
                    >
                      <div>
                        <h4 className="text-xs font-black text-slate-800">{lead.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[9px] border-t pt-2 border-slate-100">
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase">
                          {lead.source}
                        </span>

                        {/* Status shifting actions */}
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {stage.key !== 'CONVERTED' && (
                            <button
                              onClick={() => {
                                const nextStages = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'];
                                const currIdx = nextStages.indexOf(stage.key);
                                if (currIdx < nextStages.length - 1) {
                                  updateLeadMutation.mutate({
                                    id: lead._id,
                                    data: { stage: nextStages[currIdx + 1] },
                                  });
                                }
                              }}
                              className="text-slate-400 hover:text-primary p-0.5"
                              title="نقل للمرحلة التالية"
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center py-6">لا يوجد عملاء</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Dialog overlay */}
      <Dialog open={isAddingLead} onOpenChange={setIsAddingLead}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">إضافة عميل محتمل جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">اسم العميل (الوالد أو الطالب)</Label>
              <Input
                placeholder="مثال: يوسف الكندري"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">رقم الهاتف (واتساب المتابعة)</Label>
              <Input
                placeholder="965XXXXXXXX"
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
                className="rounded-xl h-10 text-xs font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">قناة التسجيل / المصدر</Label>
              <select
                value={newLeadSource}
                onChange={(e) => setNewLeadSource(e.target.value)}
                className="w-full border rounded-xl px-3 h-10 text-xs bg-white"
              >
                <option value="DIRECT">مباشر / استقبال</option>
                <option value="INSTAGRAM">إنستغرام</option>
                <option value="WHATSAPP">واتساب</option>
                <option value="GOOGLE">جوجل</option>
                <option value="FRIEND">توصية صديق</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">القيمة المالية المتوقعة (KWD)</Label>
              <Input
                type="number"
                placeholder="50"
                value={newLeadExpected}
                onChange={(e) => setNewLeadExpected(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddingLead(false)} className="rounded-xl text-xs">
                إلغاء
              </Button>
              <Button type="submit" className="rounded-xl text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={createLeadMutation.isPending}>
                حفظ العميل
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detailed Lead Sheet Dialog overlay */}
      {activeLead && (
        <Dialog open={!!selectedLeadId} onOpenChange={() => setSelectedLeadId(null)}>
          <DialogContent className="max-w-2xl text-right overflow-y-auto max-h-[85vh]" dir="rtl">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="text-lg font-black text-primary">
                تاريخ المتابعة: {activeLead.name}
              </DialogTitle>
              <p className="text-[10px] text-slate-400 font-mono mt-1">الهاتف: {activeLead.phone} • المصدر: {activeLead.source}</p>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">

              {/* Note Logging and Scheduling Forms */}
              <div className="space-y-6">

                {/* Note Log Form */}
                <div className="space-y-2 p-4 border rounded-2xl bg-slate-50/50">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-secondary" />
                    تدوين ملاحظة متابعة جديدة
                  </h4>
                  <Input
                    placeholder="مثال: اتصلت به وأفاد بأنه سيزور المعهد غداً"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="bg-white rounded-xl h-9 text-xs"
                  />
                  <Button
                    size="sm"
                    className="w-full rounded-xl text-xs mt-2"
                    onClick={() => addNoteMutation.mutate({ id: activeLead._id, text: noteText })}
                    disabled={!noteText.trim() || addNoteMutation.isPending}
                  >
                    إضافة الملاحظة
                  </Button>
                </div>

                {/* Follow-up Schedule Form */}
                <div className="space-y-2 p-4 border rounded-2xl bg-slate-50/50">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-secondary" />
                    جدولة اتصال متابعة قادم
                  </h4>
                  <div className="space-y-1">
                    <Label className="text-[10px]">تاريخ المتابعة</Label>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="bg-white rounded-xl h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">تفاصيل المتابعة</Label>
                    <Input
                      placeholder="الاتصال لتأكيد التسجيل في الدورة"
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      className="bg-white rounded-xl h-9 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-xl text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90 mt-2"
                    onClick={() => addFollowUpMutation.mutate({ id: activeLead._id, data: { scheduledAt: followUpDate, notes: followUpNotes } })}
                    disabled={!followUpDate || addFollowUpMutation.isPending}
                  >
                    حفظ الموعد
                  </Button>
                </div>

              </div>

              {/* Timeline Display */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 border-b pb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  الجدول الزمني للأنشطة والاتصالات
                </h4>

                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {activeLead.timeline?.length > 0 ? (
                    activeLead.timeline.map((act, index) => (
                      <div key={index} className="flex gap-3 border-r-2 border-slate-200 pr-3 relative pb-2">
                        <span className="h-2 w-2 rounded-full bg-primary absolute -right-[5px] top-1.5" />
                        <div>
                          <p className="text-[11px] font-black text-slate-800">{act.action}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{act.details}</p>
                          <span className="text-[8px] text-slate-400 font-mono block mt-1">
                            {new Date(act.createdAt).toLocaleString('ar-KW')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic text-center py-8">لا توجد أنشطة مسجلة</p>
                  )}
                </div>
              </div>

            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
};

export default CrmPage;
