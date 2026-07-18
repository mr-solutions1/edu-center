import { useCallback } from 'react';
import { useAuth } from '../AuthContext';

/**
 * Enterprise RBAC hook to manage frontend permission and role authorization queries.
 */
export const usePermissions = () => {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  const can = useCallback((permission) => {
    return hasPermission(permission);
  }, [hasPermission]);

  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  const canAny = useCallback((permissions) => {
    return hasAnyPermission(permissions);
  }, [hasAnyPermission]);

  const canAll = useCallback((permissions) => {
    return hasAllPermissions(permissions);
  }, [hasAllPermissions]);

  return {
    user,
    can,
    hasRole,
    canAny,
    canAll,
    hasAnyPermission,
    hasAllPermissions,
  };
};
