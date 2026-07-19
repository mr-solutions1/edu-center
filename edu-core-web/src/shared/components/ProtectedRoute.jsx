import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6 bg-slate-50 rounded-3xl border border-slate-100" dir="rtl">
        <div className="p-4 bg-amber-50 rounded-2xl">
          <svg className="h-12 w-12 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800">
            غير مسموح لك بالوصول / Access Denied
          </h2>
          <p className="text-slate-500 max-w-md mx-auto font-medium">
            ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. يرجى مراجعة مسؤول النظام.
            <br />
            <span className="text-xs text-slate-400 font-mono">You do not have permission to access this page.</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => window.history.back()} variant="outline" className="h-11 rounded-xl font-bold">
            العودة للخلف / Go Back
          </Button>
          <Button onClick={() => window.location.href = '/dashboard'} className="h-11 rounded-xl font-bold">
            الرئيسية / Dashboard
          </Button>
        </div>
      </div>
    );
  }

  console.info(`[EVIDENCE_TRACE] [${new Date().toISOString()}] AUTH_READY - User is authorized.`);
  return children;
};

export default ProtectedRoute;
