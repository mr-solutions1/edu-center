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
  TrendingUp,
  Mail,
  Globe,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

import logoAlpha from '@/assets/logo_alpha.jpeg';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../shared/utils';
import { useNavigation } from './NavigationContext';

const menuItems = [
  {
    icon: LayoutDashboard,
    label: 'لوحة التحكم',
    path: '/dashboard',
    roles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    icon: Mail,
    label: 'صندوق الرسائل',
    path: '/inbox',
    roles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT'],
  },
  {
    icon: Globe,
    label: 'الموقع التعريفي',
    path: '/',
    roles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT'],
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
    icon: TrendingUp,
    label: 'إدارة العملاء CRM',
    path: '/crm',
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
  console.info(`[EVIDENCE_TRACE] [${new Date().toISOString()}] SIDEBAR_RENDER - Role: ${user?.role || 'guest'}`);
  const location = useLocation();
  const {
    isMobileOpen,
    setIsMobileOpen,
    isTabletCollapsed,
    setIsTabletCollapsed,
  } = useNavigation();

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-primary text-primary-foreground">
      {/* Brand Header */}
      <div className="p-5 border-b border-primary-foreground/10 flex items-center justify-between bg-black/5">
        <Link
          to="/"
          onClick={handleLinkClick}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity overflow-hidden"
        >
          <img
            src={logoAlpha}
            alt="Alpha Logo"
            className="w-11 h-11 rounded-lg object-cover bg-white p-0.5 shadow-sm shrink-0"
          />
          {(!isTabletCollapsed || isMobileOpen) && (
            <div className="truncate animate-fadeIn">
              <h1 className="text-base font-black tracking-tight leading-tight truncate">
                معهد ألفا العالمي
              </h1>
              <p className="text-[9px] text-secondary font-medium uppercase tracking-widest mt-0.5 truncate">
                نظام الإدارة المتكامل
              </p>
            </div>
          )}
        </Link>
        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-primary-foreground lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 select-none">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              title={isTabletCollapsed ? item.label : undefined}
              className={() =>
                cn(
                  'flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative',
                  isTabletCollapsed && !isMobileOpen
                    ? 'justify-center p-3 h-12 w-12 mx-auto'
                    : 'gap-3 px-4 py-3',
                  isActive
                    ? 'bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20'
                    : 'text-primary-foreground/70 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200 shrink-0',
                  'group-hover:scale-110'
                )}
              />
              {(!isTabletCollapsed || isMobileOpen) && (
                <span className="truncate animate-fadeIn">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile details & actions */}
      <div className="p-4 border-t border-primary-foreground/10 space-y-2 bg-black/10">
        <div
          className={cn(
            'flex items-center gap-3',
            isTabletCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-4 py-2'
          )}
        >
          <div className="h-10 w-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm shadow-md shrink-0">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          {(!isTabletCollapsed || isMobileOpen) && (
            <div className="flex-1 overflow-hidden text-right animate-fadeIn">
              <p className="text-sm font-bold truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-primary-foreground/60 truncate font-medium">
                {user?.role === 'ADMIN' ? 'مدير النظام' : user?.role}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title="تسجيل الخروج"
          className={cn(
            'flex items-center text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200',
            isTabletCollapsed && !isMobileOpen
              ? 'justify-center p-3 h-12 w-12 mx-auto rounded-xl'
              : 'gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!isTabletCollapsed || isMobileOpen) && (
            <span className="animate-fadeIn">تسجيل الخروج</span>
          )}
        </button>
      </div>

      {/* Tablet collapse toggler */}
      <div className="hidden lg:flex md:hidden items-center justify-center border-t border-primary-foreground/5 py-2">
        <button
          onClick={() => setIsTabletCollapsed(!isTabletCollapsed)}
          className="p-1.5 rounded-full hover:bg-white/10 text-primary-foreground/70"
          title={isTabletCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {isTabletCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Right Drawer Menu */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex justify-end lg:hidden transition-opacity duration-300 pointer-events-none',
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
        )}
      >
        {/* Backdrop scrim */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
        {/* Sidebar Drawer */}
        <aside
          className={cn(
            'relative w-72 h-full shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col',
            isMobileOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          dir="rtl"
        >
          {sidebarContent}
        </aside>
      </div>

      {/* Desktop / Tablet Persistent Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen sticky top-0 shadow-xl transition-all duration-300 bg-primary z-30 shrink-0',
          isTabletCollapsed ? 'w-20' : 'w-64'
        )}
        dir="rtl"
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
