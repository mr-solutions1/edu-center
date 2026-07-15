import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { authApi } from './services/authApi';
import { injectAuthFunctions } from '../../shared/services/apiClient';

const AuthContext = createContext(null);

let activeRefreshPromise = null;

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
    if (activeRefreshPromise) {
      console.log('[REFRESH_REQUEST_REUSED] Reusing active single-flight refresh promise.');
      return activeRefreshPromise;
    }

    const callerId = Math.random().toString(36).substring(2, 11);
    console.log(`[REFRESH_REQUEST_STARTED] ID: ${callerId} - Triggering single token rotation.`);

    activeRefreshPromise = (async () => {
      try {
        const { data } = await authApi.refresh();
        console.log(`[REFRESH_REQUEST_COMPLETED] ID: ${callerId} - Successfully rotated token.`);
        setUser(data.user);
        setAccessToken(data.accessToken);
        return data.accessToken;
      } catch (error) {
        console.error(`[AUTH_CONTEXT_REFRESH_FAILED] ID: ${callerId}`, error);
        setUser(null);
        setAccessToken(null);

        // Safely redirect to login without crashing the frontend render tree
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login?expired=true';
        }
        throw error;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
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
