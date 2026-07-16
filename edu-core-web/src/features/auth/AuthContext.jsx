import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { authApi } from './services/authApi';
import { injectAuthFunctions, abortAllPendingRequests } from '../../shared/services/apiClient';
import { refreshOnce, broadcastLogin, broadcastLogout, getTabId, clearRefreshPromise } from '../../shared/services/refreshManager';
import { queryClient } from '../../shared/lib/queryClient';
import { globalNavigate } from '../../shared/utils/navigation';
import { toast } from 'sonner';

const AuthContext = createContext(null);

let authProviderRenders = 0;

// Module-scoped bootstrap states to survive React StrictMode mounts/unmounts
let bootstrapPromise = null;
let hasBootstrapped = false;

// Module-scoped flag to prevent duplicate toasts
let isSessionExpiredToastShown = false;

// Module-scoped lock to ensure atomic, single-execution of logout/cleanup routine
let isLoggingOut = false;

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

  // Synchronous authorization state updates to guarantee that any immediate requests
  // triggered in the same macro/micro-task turn have the absolute latest access token
  const updateAuth = useCallback((newUser, newToken) => {
    accessTokenRef.current = newToken;
    setUser(newUser);
    setAccessToken(newToken);
  }, []);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const performLogoutCleanup = useCallback(async (isSessionExpired = false) => {
    if (isLoggingOut) {
      console.warn('[EVIDENCE_TRACE] Logout cleanup already in progress. Skipping duplicate execution.');
      return;
    }
    isLoggingOut = true;
    console.info('[EVIDENCE_TRACE] Starting full application logout cleanup...');

    // 1. Abort any pending authenticated requests
    try {
      abortAllPendingRequests();
    } catch (e) {
      console.error('Error aborting requests on logout:', e);
    }

    // 2. Clear any pending refresh promise
    try {
      clearRefreshPromise();
    } catch (e) {
      console.error('Error clearing refresh promise on logout:', e);
    }

    // 3. Cancel all pending React Query queries and clear the React Query cache
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch (e) {
      console.error('Error clearing query client on logout:', e);
    }

    // 4. Clear local React authentication state
    updateAuth(null, null);

    // 5. Clear application stores/localStorage flags
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('flowship_logged_in');
    }

    // 6. Broadcast logout to sync other tabs
    broadcastLogout();

    // 7. Show toast if session expired
    if (isSessionExpired) {
      if (!isSessionExpiredToastShown) {
        isSessionExpiredToastShown = true;
        toast.error('Your session has expired. Please sign in again.', {
          onDismiss: () => { isSessionExpiredToastShown = false; },
          onAutoClose: () => { isSessionExpiredToastShown = false; }
        });
      }
      // 8. Redirect to login with expired query param
      globalNavigate('/login?expired=true');
    } else {
      // If manual/normal logout, redirect to login page
      globalNavigate('/login');
    }
  }, [updateAuth]);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    isLoggingOut = false; // Reset logout lock on successful login
    isSessionExpiredToastShown = false; // Reset toast flag on successful login
    updateAuth(data.user, data.accessToken);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('flowship_logged_in', 'true');
    }
    broadcastLogin();
    return data.user;
  };

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      await performLogoutCleanup(false);
    }
  }, [performLogoutCleanup]);

  const refresh = useCallback(async (source = 'Other') => {
    return refreshOnce(async (src, instanceId) => {
      const { data } = await authApi.refresh(src, instanceId);
      isLoggingOut = false; // Reset logout lock on successful token rotation
      updateAuth(data.user, data.accessToken);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('flowship_logged_in', 'true');
      }
      return data.accessToken;
    }, source).catch((error) => {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      if (pathname !== '/login' && pathname !== '/') {
        performLogoutCleanup(true);
      } else {
        updateAuth(null, null);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('flowship_logged_in');
        }
      }
      throw error;
    });
  }, [performLogoutCleanup, updateAuth]);

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
        isLoggingOut = false; // Reset lock if we are starting clean as anonymous
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
