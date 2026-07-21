import React from 'react';
import { Calculator } from 'lucide-react';

export const ExplainabilityPanel = ({ title, equation, values = [] }) => {
  return (
    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-3 text-right" dir="rtl">
      <div className="text-xs font-bold text-blue-800 flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        {title}
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600">
        {values.map((v) => (
          <React.Fragment key={v.label}>
            <span className="text-slate-500">{v.label}:</span>
            <span className="font-bold text-left">{v.value}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="border-t border-blue-100 pt-2 text-xs font-black text-slate-800 flex justify-between items-center">
        <span>الصيغة الحسابية:</span>
        <code className="text-blue-700 tracking-wider font-mono bg-white px-2 py-0.5 rounded border border-blue-100/50">
          {equation}
        </code>
      </div>
    </div>
  );
};

export default ExplainabilityPanel;
