import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { authApi } from './services/authApi';
import { injectAuthFunctions } from '../../shared/services/apiClient';
import { refreshOnce } from '../../shared/services/refreshManager';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Store accessToken in a ref to avoid re-injecting auth functions on token changes
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  // Store user in a ref to avoid re-injecting auth functions on user changes
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getCurrentUser = useCallback(() => userRef.current, []);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    setUser(data.user);
    setAccessToken(data.accessToken);
    localStorage.setItem('flowship_logged_in', 'true');
    return data.user;
  };

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('flowship_logged_in');
    }
  }, []);

  const refresh = useCallback(async (source = 'Other') => {
    return refreshOnce(async (src, instanceId) => {
      const { data } = await authApi.refresh(src, instanceId);
      setUser(data.user);
      setAccessToken(data.accessToken);
      localStorage.setItem('flowship_logged_in', 'true');
      return data.accessToken;
    }, source).catch((error) => {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('flowship_logged_in');

      // Safely redirect to login without crashing the frontend render tree
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/login?expired=true';
      }
      throw error;
    });
  }, []);

  useEffect(() => {
    injectAuthFunctions(refresh, getAccessToken, getCurrentUser);
  }, [refresh, getAccessToken, getCurrentUser]);

  useEffect(() => {
    const initAuth = async () => {
      console.log(`[AUTH_CONTEXT_INIT_AUTH] Initializing auth...`);
      const hasSessionFlag =
        localStorage.getItem('flowship_logged_in') === 'true';

      if (!hasSessionFlag) {
        console.log(
          `[AUTH_CONTEXT_INIT_AUTH] No session flag found. Skipping silent refresh.`
        );
        setIsLoading(false);
        return;
      }

      try {
        await refresh('AuthContextInit');
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
