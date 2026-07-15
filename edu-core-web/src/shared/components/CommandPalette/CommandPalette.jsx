import { useQuery } from '@tanstack/react-query';
import { Search, Compass, Zap, Keyboard, Sparkles, User, CreditCard, TrendingUp, Mail } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Listen for Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Standard commands
  const commands = [
    // Navigation Category
    { category: 'التنقل السريع', name: 'لوحة التحكم العامة', shortcut: 'G D', action: () => navigate('/') },
    { category: 'التنقل السريع', name: 'إدارة الطلاب والملفات', shortcut: 'G S', action: () => navigate('/students') },
    { category: 'التنقل السريع', name: 'لوحة الـ CRM والمتابعات', shortcut: 'G C', action: () => navigate('/crm') },
    { category: 'التنقل السريع', name: 'الجدول الدراسي والتحضير', shortcut: 'G T', action: () => navigate('/scheduling') },
    { category: 'التنقل السريع', name: 'صندوق الرسائل الداخلي', shortcut: 'G I', action: () => navigate('/inbox') },
    { category: 'التنقل السريع', name: 'حسابات المدفوعات والفواتير', shortcut: 'G P', action: () => navigate('/payments') },
    { category: 'التنقل السريع', name: 'الرواتب والمالية', shortcut: 'G W', action: () => navigate('/payroll') },
    { category: 'التنقل السريع', name: 'إعدادات النظام والهوية', shortcut: 'G O', action: () => navigate('/settings') },

    // Quick Actions Category
    { category: 'إجراءات سريعة', name: 'تسجيل عميل محتمل جديد CRM', shortcut: 'A L', action: () => { navigate('/crm'); } },
    { category: 'إجراءات سريعة', name: 'تعديل الصلاحيات والأدوار', shortcut: 'A R', action: () => navigate('/settings') },
  ];

  // Filter commands by search string
  const filtered = commands.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  // Manage list keyboard navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleNavigation = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 text-right font-sans" dir="rtl">

      {/* Modal Dialog Box */}
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Search Bar Input */}
        <div className="p-4 border-b flex items-center gap-3 relative bg-slate-50/50">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="اكتب أمراً أو انتقل لصفحة (مثال: CRM, رواتب)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-800"
            autoFocus
          />
          <span className="text-[10px] bg-slate-200 px-2 py-1 rounded-lg text-slate-400 font-mono select-none font-bold shrink-0">ESC</span>
        </div>

        {/* Commands List Results */}
        <div className="flex-1 max-h-[350px] overflow-y-auto p-3 space-y-4">
          {filtered.length > 0 ? (
            // Group commands by category
            Object.entries(
              filtered.reduce((acc, curr) => {
                if (!acc[curr.category]) acc[curr.category] = [];
                acc[curr.category].push(curr);
                return acc;
              }, {})
            ).map(([category, items]) => (
              <div key={category} className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-black block px-3 uppercase tracking-wider">
                  {category}
                </span>

                {items.map((item) => {
                  const globalIndex = filtered.indexOf(item);
                  const isFocused = globalIndex === selectedIndex;
                  return (
                    <div
                      key={item.name}
                      onClick={() => {
                        item.action();
                        setIsOpen(false);
                      }}
                      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                        isFocused
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Zap className={`h-4 w-4 ${isFocused ? 'text-secondary' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">{item.name}</span>
                      </div>

                      {item.shortcut && (
                        <kbd className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                          isFocused ? 'bg-white/20 border-white/10 text-white' : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {item.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-8">لا يوجد نتائج تطابق بحثك</p>
          )}
        </div>

        {/* Keyboard Footer Guide */}
        <div className="bg-slate-50 border-t p-3 flex items-center justify-between text-[9px] text-slate-400 font-bold px-5">
          <span className="flex items-center gap-1">
            <Compass className="h-3 w-3" />
            استخدم الأسهم ⇅ للتنقل و Enter للتأكيد
          </span>
          <span className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            Ctrl + K لفتح / إغلاق الأوامر
          </span>
        </div>

      </div>

    </div>
  );
};

export default CommandPalette;
