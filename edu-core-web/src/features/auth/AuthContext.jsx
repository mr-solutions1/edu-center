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
import { refreshOnce, broadcastLogin, broadcastLogout, getTabId } from '../../shared/services/refreshManager';

const AuthContext = createContext(null);

let authProviderRenders = 0;

// Module-scoped bootstrap states to survive React StrictMode mounts/unmounts
let bootstrapPromise = null;
let hasBootstrapped = false;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const renderCountRef = useRef(0);
  renderCountRef.current++;
  authProviderRenders++;

  console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
    traceEvent: 'AUTH_PROVIDER_RENDERED',
    timestamp: new Date().toISOString(),
    perfTimeMs: performance.now(),
    renderCountThisInstance: renderCountRef.current,
    globalRendersCount: authProviderRenders,
    currentState: {
      hasUser: !!user,
      hasAccessToken: !!accessToken,
      isLoading,
    }
  }, null, 2));

  useEffect(() => {
    console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
      traceEvent: 'AUTH_PROVIDER_MOUNTED',
      timestamp: new Date().toISOString(),
      perfTimeMs: performance.now(),
    }, null, 2));

    return () => {
      console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
        traceEvent: 'AUTH_PROVIDER_UNMOUNTED',
        timestamp: new Date().toISOString(),
        perfTimeMs: performance.now(),
      }, null, 2));
    };
  }, []);

  // Store accessToken in a ref to avoid re-injecting auth functions on token changes
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    setUser(data.user);
    setAccessToken(data.accessToken);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('flowship_logged_in', 'true');
    }
    broadcastLogin();
    return data.user;
  };

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('flowship_logged_in');
      }
      broadcastLogout();
    }
  }, []);

  const refresh = useCallback(async (source = 'Other') => {
    return refreshOnce(async (src, instanceId) => {
      const { data } = await authApi.refresh(src, instanceId);
      setUser(data.user);
      setAccessToken(data.accessToken);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('flowship_logged_in', 'true');
      }
      return data.accessToken;
    }, source).catch((error) => {
      setUser(null);
      setAccessToken(null);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('flowship_logged_in');
      }

      // Safely redirect to login without crashing the frontend render tree
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login?expired=true';
      }
      throw error;
    });
  }, []);

  useEffect(() => {
    injectAuthFunctions(refresh, getAccessToken);
  }, [refresh, getAccessToken]);

  useEffect(() => {
    const initAuth = async () => {
      // Exactly ONE bootstrap promise can exist across the entire loading sequence
      if (hasBootstrapped) {
        console.info('[EVIDENCE_TRACE] Already bootstrapped. Skipping initAuth.');
        setIsLoading(false);
        return;
      }

      if (bootstrapPromise) {
        console.info('[EVIDENCE_TRACE] Reusing existing bootstrap promise.');
        try {
          await bootstrapPromise;
        } catch {
          // Silent fail
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Check if user has previously logged in. If not, skip silent refresh for immediate rendering.
      const hasLoggedInFlag = typeof window !== 'undefined' &&
        window.localStorage &&
        window.localStorage.getItem('flowship_logged_in') === 'true';

      if (!hasLoggedInFlag) {
        console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
          traceEvent: 'INIT_AUTH_SKIPPED_ANONYMOUS',
          timestamp: new Date().toISOString(),
          perfTimeMs: performance.now(),
          tabId: getTabId(),
        }, null, 2));
        hasBootstrapped = true;
        setIsLoading(false);
        return;
      }

      console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
        traceEvent: 'INIT_AUTH_EFFECT_TRIGGERED',
        timestamp: new Date().toISOString(),
        perfTimeMs: performance.now(),
        tabId: getTabId(),
      }, null, 2));

      bootstrapPromise = refresh('AuthContextInit');

      try {
        await bootstrapPromise;
      } catch {
        // Silent fail - user just needs to login
      } finally {
        hasBootstrapped = true;
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
