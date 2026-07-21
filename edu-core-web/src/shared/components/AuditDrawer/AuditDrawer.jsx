import React from 'react';
import { X, User, Clock, ShieldCheck, Landmark } from 'lucide-react';
import { formatMoney } from '@/shared/utils/money';

export const AuditDrawer = ({ open, onClose, title = 'تفاصيل وسجلات التدقيق المالي', referenceId, creator, logs = [], ledgerEntries = [] }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-start bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col p-6 animate-slide-left text-right" dir="rtl">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h3 className="text-lg font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Reference Info */}
          {referenceId && (
            <div className="space-y-1">
              <span className="text-xs text-slate-400 block font-bold">معرّف المرجع (Reference ID):</span>
              <code className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border">
                {referenceId}
              </code>
            </div>
          )}

          {/* Creator details */}
          {creator && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <User className="h-4 w-4 text-slate-400" />
                القائم بالعملية (Creator)
              </h4>
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg">
                <p>الاسم: {creator.name}</p>
                <p>الدور: {creator.role}</p>
              </div>
            </div>
          )}

          {/* Revision history */}
          {logs && logs.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                سجل التغييرات (Revision Log)
              </h4>
              <div className="relative border-r border-slate-200 pr-3 space-y-4">
                {logs.map((log, idx) => (
                  <div key={log.id || idx} className="relative">
                    <span className="absolute -right-[17px] mt-1 flex h-2 w-2 items-center justify-center rounded-full bg-slate-300 border border-white" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-slate-800">{log.actionName}</p>
                      <p className="text-slate-500">{log.performerName} - {new Date(log.date).toLocaleDateString('ar-KW')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Double-Entry Ledger Posting Details */}
          {ledgerEntries && ledgerEntries.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-slate-400" />
                القيود المحاسبية الثنائية (Double-Entry GL)
              </h4>
              <div className="space-y-2">
                {ledgerEntries.map((entry, idx) => (
                  <div key={idx} className="text-xs p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                    <p className="font-bold text-slate-700">{entry.accountName}</p>
                    <div className="flex justify-between font-mono">
                      <span className="text-emerald-700">{entry.debit ? `مدين (Debit): ${formatMoney(entry.debit)}` : ''}</span>
                      <span className="text-rose-700">{entry.credit ? `دائن (Credit): ${formatMoney(entry.credit)}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditDrawer;
