import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { authApi } from './services/authApi';
import { injectAuthFunctions } from '../../shared/services/apiClient';
import { refreshOnce } from '../../shared/services/refreshManager';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    setUser(data.user);
    setAccessToken(data.accessToken);
    return data.user;
  };

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    return refreshOnce(async () => {
      const { data } = await authApi.refresh();
      setUser(data.user);
      setAccessToken(data.accessToken);
      return data.accessToken;
    }).catch((error) => {
      setUser(null);
      setAccessToken(null);

      // Safely redirect to login without crashing the frontend render tree
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login?expired=true';
      }
      throw error;
    });
  }, []);

  useEffect(() => {
    injectAuthFunctions(refresh, () => accessToken);
  }, [refresh, accessToken]);

  useEffect(() => {
    const initAuth = async () => {
      console.log(`[AUTH_CONTEXT_INIT_AUTH] Initializing auth...`);
      try {
        await refresh();
      } catch {
        // Silent fail - user just needs to login
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refresh]);

  const value = {
    user,
    accessToken,
    isLoading,
    login,
    logout,
    refresh,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
