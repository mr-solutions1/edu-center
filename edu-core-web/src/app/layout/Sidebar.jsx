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
  ChevronDown,
  X,
  Shield,
  Home,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { NavLink, Link } from 'react-router-dom';

import { useNavigation } from './NavigationContext';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../shared/utils';

import logoAlpha from '@/assets/logo_alpha.jpeg';

const menuItems = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
    path: '/dashboard',
    permission: 'dashboard.view',
    category: 'الرئيسية',
  },
  {
    id: 'new-student-sidebar',
    label: 'إضافة طالب جديد',
    icon: Users,
    path: '/students', // fallback list link, can trigger dialog
    category: 'الرئيسية',
    stateTrigger: 'open_new_student_modal', // helper flag for global handlers or navigation click
  },
  {
    id: 'teacher-profile',
    label: 'ملفي الشخصي',
    icon: UserSquare2,
    path: '/teacher/profile',
    permission: 'lesson.attendance',
    excludeRoles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'PARENT', 'STUDENT'],
    category: 'التعليم والطلاب',
  },
  {
    id: 'teacher-students',
    label: 'طلابي',
    icon: Users,
    path: '/teacher/students',
    permission: 'lesson.attendance',
    excludeRoles: ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT', 'PARENT', 'STUDENT'],
    category: 'التعليم والطلاب',
  },
  {
    id: 'students-section',
    label: 'شؤون الطلاب',
    icon: Users,
    excludeRoles: ['TEACHER', 'PARENT', 'STUDENT'],
    category: 'الطلاب والأكاديميا',
    children: [
      {
        id: 'students-list',
        label: 'قائمة الطلاب',
        icon: Users,
        path: '/students',
        permission: 'student.view',
      },
      {
        id: 'guardians-list',
        label: 'أولياء الأمور',
        icon: Shield,
        path: '/guardians',
        permission: 'student.view',
      },
    ],
  },
  {
    id: 'academic',
    label: 'الأكاديميا والصفوف',
    icon: BookOpen,
    excludeRoles: ['TEACHER', 'PARENT', 'STUDENT'],
    category: 'الطلاب والأكاديميا',
    children: [
      {
        id: 'courses',
        label: 'الدورات الدراسية',
        icon: BookOpen,
        path: '/courses',
        permission: 'student.create',
      },
      {
        id: 'rooms',
        label: 'القاعات والغرف الدراسية',
        icon: Home,
        path: '/rooms',
        permission: 'student.create',
      },
      {
        id: 'groups',
        label: 'المجموعات المشتركة',
        icon: Users,
        path: '/groups',
        permission: 'student.create',
      },
    ],
  },
  {
    id: 'teachers',
    label: 'المعلمون',
    icon: UserSquare2,
    path: '/teachers',
    permission: 'teacher.view',
    category: 'التعليم والطلاب',
  },
  {
    id: 'scheduling',
    label: 'الجدول الدراسي',
    icon: Calendar,
    path: '/scheduling',
    permission: 'lesson.view',
    category: 'التعليم والطلاب',
  },
  {
    id: 'financial',
    label: 'المالية والحسابات',
    icon: CreditCard,
    excludeRoles: ['TEACHER', 'PARENT', 'STUDENT'],
    category: 'المالية والتقارير',
    children: [
      {
        id: 'payments',
        label: 'سجل المدفوعات',
        icon: CreditCard,
        path: '/payments',
        permission: 'payment.view',
      },
      {
        id: 'payroll',
        label: 'رواتب المعلمين',
        icon: Wallet,
        path: '/payroll',
        permission: 'payroll.view',
      },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير والإحصائيات',
    icon: BarChart3,
    path: '/reports',
    permission: 'reports.view',
    category: 'المالية والتقارير',
  },
  {
    id: 'settings',
    label: 'الإعدادات العامة',
    icon: Settings,
    path: '/settings',
    permission: 'settings.view',
    category: 'النظام',
  },
];

const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState({});

  console.info(
    `[EVIDENCE_TRACE] [${new Date().toISOString()}] SIDEBAR_RENDER - Role: ${user?.role || 'guest'}`
  );
  const {
    isMobileOpen,
    setIsMobileOpen,
    isTabletCollapsed,
    setIsTabletCollapsed,
  } = useNavigation();

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSidebarClick = (item, e) => {
    if (item.stateTrigger === 'open_new_student_modal') {
      console.info('Dispatched global add student form trigger.');
      window.dispatchEvent(new CustomEvent('edu:open_new_student'));
    }
    handleLinkClick();
  };

  const filteredItems = useMemo(() => {
    const filterRec = (items) => {
      return items
        .map((item) => {
          if (item.id === 'website' && user?.role === 'TEACHER') {
            return { ...item, path: '/teachers/portfolio/me' };
          }
          if (item.permission) {
            const allowed = hasPermission(item.permission);
            // Allow dashboard for TEACHER even if permission is dashboard.view is not granted
            if (!allowed && !(item.id === 'dashboard' && user?.role === 'TEACHER')) {
              return null;
            }
          }
          if (item.excludeRoles && item.excludeRoles.includes(user?.role)) {
            return null;
          }
          if (item.children) {
            const visibleChildren = filterRec(item.children);
            if (visibleChildren.length === 0) {
              return null;
            }
            return { ...item, children: visibleChildren };
          }
          return item;
        })
        .filter(Boolean);
    };

    return filterRec(menuItems);
  }, [user, hasPermission]);

  const categorizedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach((item) => {
      const cat = item.category || 'الرئيسية';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d121f] dark:bg-[#070a13] border-l border-border/30 text-primary-foreground">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/10">
        <Link
          to="/"
          onClick={handleLinkClick}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity overflow-hidden"
        >
          <img
            src={logoAlpha}
            alt="Alpha Logo"
            className="w-11 h-11 rounded-lg object-cover bg-card p-0.5 shadow-premium-sm shrink-0"
          />
          {(!isTabletCollapsed || isMobileOpen) && (
            <div className="truncate animate-fadeIn text-right">
              <h1 className="text-base font-black tracking-tight leading-tight truncate">
                معهد ألفا العالمي
              </h1>
              <p className="text-[9px] text-accent font-medium uppercase tracking-widest mt-0.5 truncate">
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
      <nav className="flex-1 overflow-y-auto p-4 space-y-5 select-none text-right">
        {Object.entries(categorizedItems).map(([categoryName, items]) => (
          <div key={categoryName} className="space-y-1.5">
            {/* Category Header (Hidden when collapsed) */}
            {(!isTabletCollapsed || isMobileOpen) && (
              <h3 className="text-[10px] font-black text-primary-foreground/40 uppercase tracking-widest px-4 mb-2 select-none text-right">
                {categoryName}
              </h3>
            )}

            <div className="space-y-1">
              {items.map((item) => {
                if (item.children) {
                  const isExpanded = expandedGroups[item.id];
                  return (
                    <div key={item.id} className="space-y-1">
                      {/* Parent Row Toggle */}
                      <button
                        onClick={() => toggleGroup(item.id)}
                        title={isTabletCollapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center rounded-lg text-sm font-medium transition-all duration-150 w-full text-right hover:bg-white/5 hover:text-white',
                          isTabletCollapsed && !isMobileOpen
                            ? 'justify-center p-3 h-10 w-10 mx-auto'
                            : 'gap-3 px-4 py-2 justify-between text-primary-foreground/75'
                        )}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <item.icon
                            className={cn(
                              'h-4.5 w-4.5 transition-transform duration-150 shrink-0 text-primary-foreground/60'
                            )}
                          />
                          {(!isTabletCollapsed || isMobileOpen) && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                        {(!isTabletCollapsed || isMobileOpen) && (
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200 text-primary-foreground/40',
                              isExpanded && 'transform rotate-180 text-accent'
                            )}
                          />
                        )}
                      </button>

                      {/* Sub items indented list */}
                      {isExpanded && (!isTabletCollapsed || isMobileOpen) && (
                        <div className="mr-5 pr-2 border-r border-white/10 space-y-1 mt-1 animate-slideDown">
                          {item.children.map((subItem) => (
                            <NavLink
                              key={subItem.path}
                              to={subItem.path}
                              onClick={(e) => handleSidebarClick(subItem, e)}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center rounded-lg text-xs font-medium transition-all duration-150 gap-3 px-4 py-2 hover:bg-white/4 hover:text-white',
                                  isActive ? 'text-secondary font-bold bg-white/5' : 'text-primary-foreground/60'
                                )
                              }
                            >
                              <subItem.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{subItem.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Render flat link (same as old sidebar link)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={(e) => handleSidebarClick(item, e)}
                    title={isTabletCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg text-sm font-medium transition-all duration-150 group relative hover:bg-white/5 hover:text-white',
                        isTabletCollapsed && !isMobileOpen
                          ? 'justify-center p-3 h-10 w-10 mx-auto'
                          : 'gap-3 px-4 py-2',
                        isActive
                          ? 'bg-white/8 text-white font-bold'
                          : 'text-primary-foreground/75'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-accent rounded-l-md" />
                        )}
                        <item.icon
                          className={cn(
                            'h-4.5 w-4.5 transition-transform duration-150 shrink-0',
                            isActive
                              ? 'text-accent scale-105'
                              : 'text-primary-foreground/60 group-hover:text-white group-hover:scale-105'
                          )}
                        />
                        {(!isTabletCollapsed || isMobileOpen) && (
                          <span className="truncate animate-fadeIn">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile details & actions */}
      <div className="p-4 border-t border-white/5 space-y-2 bg-black/15 text-right">
        <div
          className={cn(
            'flex items-center gap-3',
            isTabletCollapsed && !isMobileOpen
              ? 'justify-center px-0'
              : 'px-4 py-2'
          )}
        >
          <div className="h-10 w-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shadow-premium-md shrink-0">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          {(!isTabletCollapsed || isMobileOpen) && (
            <div className="flex-1 overflow-hidden text-right animate-fadeIn">
              <p className="text-sm font-bold truncate text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-white/65 truncate font-medium">
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
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
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
          'hidden lg:flex flex-col h-screen sticky top-0 shadow-premium-xl transition-all duration-300 bg-[#0d121f] dark:bg-[#070a13] z-30 shrink-0',
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
