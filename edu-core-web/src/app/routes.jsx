import React, { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';

import RootLayout from './RootLayout';
import { RootErrorBoundary } from '../shared/components/ErrorBoundary';
import ProtectedRoute from '../shared/components/ProtectedRoute';

// Lazy loading pages
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const DashboardPage = lazy(
  () => import('../features/dashboard/pages/DashboardPage')
);
const StudentsListPage = lazy(
  () => import('../features/students/pages/StudentsListPage')
);
const TeacherStudentsPage = lazy(
  () => import('../features/students/pages/TeacherStudentsPage')
);
const TeachersListPage = lazy(
  () => import('../features/teachers/pages/TeachersListPage')
);
const TeacherProfilePage = lazy(
  () => import('../features/teachers/pages/TeacherProfilePage')
);
const SchedulePage = lazy(
  () => import('../features/scheduling/pages/SchedulePage')
);
const PaymentsListPage = lazy(
  () => import('../features/payments/pages/PaymentsListPage')
);
const PayrollListPage = lazy(
  () => import('../features/payroll/pages/PayrollListPage')
);
const SalariesListPage = lazy(
  () => import('../features/salaries/pages/SalariesListPage')
);
const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage'));
const CoursesPage = lazy(() => import('../features/courses/pages/CoursesPage'));
const GroupsPage = lazy(() => import('../features/groups/pages/GroupsPage'));
const SettingsPage = lazy(
  () => import('../features/settings/pages/SettingsPage')
);
const ActivityLogPage = lazy(
  () => import('../features/activity-log/pages/ActivityLogPage')
);
const StyleguidePage = lazy(
  () => import('../features/dashboard/pages/StyleguidePage')
);

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RootErrorBoundary />,
    children: [
      {
        path: '/login',
        element: (
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                Loading...
              </div>
            }
          >
            <LoginPage />
          </Suspense>
        ),
      },
      {
        element: <RootLayout />,
        children: [
          {
            path: '/',
            element: (
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Dashboard...
                    </div>
                  }
                >
                  <DashboardPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/settings/activity-log',
            element: (
              <ProtectedRoute roles={['ADMIN']}>
                <Suspense fallback={<div>جاري التحميل...</div>}>
                  <ActivityLogPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/teacher/profile',
            element: (
              <ProtectedRoute roles={['TEACHER']}>
                <Suspense fallback={<div>جاري التحميل...</div>}>
                  <TeacherProfilePage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/settings',
            element: (
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Settings...
                    </div>
                  }
                >
                  <SettingsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/reports',
            element: (
              <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Reports...
                    </div>
                  }
                >
                  <ReportsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/salaries',
            element: (
              <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Salaries...
                    </div>
                  }
                >
                  <SalariesListPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/payroll',
            element: (
              <ProtectedRoute roles={['ADMIN', 'ACCOUNTANT']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Payroll...
                    </div>
                  }
                >
                  <PayrollListPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/payments',
            element: (
              <ProtectedRoute roles={['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Payments...
                    </div>
                  }
                >
                  <PaymentsListPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/scheduling',
            element: (
              <ProtectedRoute roles={['ADMIN', 'RECEPTIONIST', 'TEACHER']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Schedule...
                    </div>
                  }
                >
                  <SchedulePage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/teachers',
            element: (
              <ProtectedRoute roles={['ADMIN']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Teachers...
                    </div>
                  }
                >
                  <TeachersListPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/courses',
            element: (
              <ProtectedRoute roles={['ADMIN', 'RECEPTIONIST']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Courses...
                    </div>
                  }
                >
                  <CoursesPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/groups',
            element: (
              <ProtectedRoute roles={['ADMIN', 'RECEPTIONIST']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Groups...
                    </div>
                  }
                >
                  <GroupsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/teacher/students',
            element: (
              <ProtectedRoute roles={['TEACHER']}>
                <Suspense fallback={<div>جاري التحميل...</div>}>
                  <TeacherStudentsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/students',
            element: (
              <ProtectedRoute roles={['ADMIN', 'RECEPTIONIST']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Students...
                    </div>
                  }
                >
                  <StudentsListPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/activity-log',
            element: (
              <ProtectedRoute roles={['ADMIN']}>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading Logs...
                    </div>
                  }
                >
                  <ActivityLogPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/styleguide',
            element: (
              <ProtectedRoute roles={['ADMIN']}>
                <Suspense fallback={<div>جاري التحميل...</div>}>
                  <StyleguidePage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
