import { useAuth } from '../AuthContext';

export const useAuthSession = () => {
  const { user, accessToken, isAuthenticated, isLoading, login, logout, hasPermission } =
    useAuth();

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    isAdmin: hasPermission('rbac.manage'),
    isReceptionist: hasPermission('crm.manage') && !hasPermission('rbac.manage'),
    isTeacher: hasPermission('lesson.attendance'),
    isAccountant: hasPermission('payroll.view') && !hasPermission('rbac.manage'),
  };
};
