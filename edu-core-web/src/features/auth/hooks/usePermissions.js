import { useAuth } from '../AuthContext';

export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, user } = useAuth();

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
  };
};
