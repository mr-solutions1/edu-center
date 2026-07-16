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
    return <Navigate to="/dashboard" replace />;
  }

  console.info(`[EVIDENCE_TRACE] [${new Date().toISOString()}] AUTH_READY - User is authorized.`);
  return children;
};

export default ProtectedRoute;
