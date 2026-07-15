import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Calendar,
  CreditCard,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  BookOpen,
} from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';

import logoAlpha from '@/assets/logo_alpha.jpeg';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../shared/utils';

const menuItems = [
  {
    icon: LayoutDashboard,
    label: 'لوحة التحكم',
    path: '/',
    roles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'TEACHER'],
  },
  {
    icon: UserSquare2,
    label: 'ملفي الشخصي',
    path: '/teacher/profile',
    roles: ['TEACHER'],
  },
  {
    icon: Users,
    label: 'طلابي',
    path: '/teacher/students',
    roles: ['TEACHER'],
  },
  {
    icon: Users,
    label: 'الطلاب',
    path: '/students',
    roles: ['ADMIN', 'RECEPTIONIST'],
  },
  {
    icon: BookOpen,
    label: 'الدورات',
    path: '/courses',
    roles: ['ADMIN', 'RECEPTIONIST'],
  },
  {
    icon: Users,
    label: 'المجموعات',
    path: '/groups',
    roles: ['ADMIN', 'RECEPTIONIST'],
  },
  { icon: UserSquare2, label: 'المعلمون', path: '/teachers', roles: ['ADMIN'] },
  {
    icon: Calendar,
    label: 'الجدول الدراسي',
    path: '/scheduling',
    roles: ['ADMIN', 'RECEPTIONIST', 'TEACHER'],
  },
  {
    icon: CreditCard,
    label: 'المدفوعات',
    path: '/payments',
    roles: ['ADMIN', 'ACCOUNTANT'],
  },
  {
    icon: Wallet,
    label: 'الرواتب',
    path: '/payroll',
    roles: ['ADMIN', 'ACCOUNTANT'],
  },
  {
    icon: BarChart3,
    label: 'التقارير',
    path: '/reports',
    roles: ['ADMIN', 'ACCOUNTANT'],
  },
  { icon: Settings, label: 'الإعدادات', path: '/settings', roles: ['ADMIN'] },
];

const Sidebar = () => {
  const { user, logout } = useAuth();

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <aside
      className="w-64 bg-primary text-primary-foreground flex flex-col h-screen sticky top-0 shadow-xl"
      dir="rtl"
    >
      <div className="p-5 border-b border-primary-foreground/10 flex items-center gap-3 bg-black/5">
        <img src={logoAlpha} alt="Alpha Logo" className="w-11 h-11 rounded-lg object-cover bg-white p-0.5 shadow-sm" />
        <div>
          <h1 className="text-base font-black tracking-tight leading-tight">معهد ألفا العالمي</h1>
          <p className="text-[9px] text-secondary font-medium uppercase tracking-widest mt-0.5">
            نظام الإدارة المتكامل
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20'
                  : 'text-primary-foreground/70 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <item.icon
              className={cn(
                'h-5 w-5 transition-transform duration-200',
                'group-hover:scale-110'
              )}
            />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-foreground/10 space-y-2 bg-black/10">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="h-10 w-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm shadow-md">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-primary-foreground/60 truncate font-medium">
              {user?.role === 'ADMIN' ? 'مدير النظام' : user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
