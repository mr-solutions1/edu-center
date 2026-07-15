import axios from 'axios';

import {
  isRefreshing,
  getRefreshPromise,
  getLastRefreshTime,
} from './refreshManager';

const getBaseURL = () => {
  const viteApiUrl = import.meta.env.VITE_API_BASE_URL;
  const reactApiUrl = import.meta.env.REACT_APP_API_URL;

  if (viteApiUrl) {
    return viteApiUrl;
  }
  if (reactApiUrl) {
    return reactApiUrl;
  }

  // Fallback to localhost during development or test runs if we are not in production
  if (
    import.meta.env.MODE === 'development' ||
    import.meta.env.MODE === 'test'
  ) {
    return 'http://localhost:5000/api';
  }

  throw new Error(
    'Configuration Error: Neither VITE_API_BASE_URL nor REACT_APP_API_URL is defined.'
  );
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Explicitly reinforce withCredentials defaults on the client instance
apiClient.defaults.withCredentials = true;

// To be injected from AuthProvider to avoid circular dependency
let refreshAuthToken = null;
let getAccessToken = null;
let getCurrentUser = null;

export const injectAuthFunctions = (refreshFn, tokenFn, userFn) => {
  refreshAuthToken = refreshFn;
  getAccessToken = tokenFn;
  getCurrentUser = userFn;
};

// Request interceptor to attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    // Record request initiation timestamp
    if (!config._initiatedAt) {
      config._initiatedAt = Date.now();
    }

    // Proactively enforce withCredentials on every single outgoing request
    config.withCredentials = true;

    if (config.url?.includes('/auth/refresh')) {
      // Synchronize requestId with what refreshOnce generated if possible
      const requestId =
        config.headers['X-Refresh-Instance'] ||
        config.headers['X-Refresh-Request-ID'] ||
        Math.random().toString(36).substring(2, 11);
      config.headers['X-Refresh-Request-ID'] = requestId;
      config.headers['X-Refresh-Instance'] = requestId;

      const timestamp = new Date().toISOString();
      const stackTrace = new Error().stack;
      const currentRoute = window.location.pathname;
      const currentUser = getCurrentUser?.() || null;
      const currentToken = getAccessToken?.() || null;
      const visibilityState = document.visibilityState;
      const readyState = document.readyState;
      const navigationType =
        window.performance?.getEntriesByType?.('navigation')?.[0]?.type ||
        'unknown';
      const queueState = isRefreshing() ? 'Active' : 'Empty';
      const promiseState = getRefreshPromise() ? 'Pending' : 'Resolved/Null';

      console.group(`[REFRESH_TRACE_REQ] ID: ${requestId}`);
      console.log(`Timestamp: ${timestamp}`);
      console.log(`Caller: ${config.headers['X-Refresh-Source'] || 'unknown'}`);
      console.log(
        `Component: ${config.headers['X-Refresh-Source'] === 'AuthContextInit' ? 'AuthProvider' : 'AxiosInterceptor'}`
      );
      console.log(`Current Route: ${currentRoute}`);
      console.log(`Current User State:`, currentUser);
      console.log(
        `Current Token State:`,
        currentToken ? `Present (length: ${currentToken.length})` : 'Missing'
      );
      console.log(`Current Visibility State: ${visibilityState}`);
      console.log(`Current Document Ready State: ${readyState}`);
      console.log(`Current Navigation Type: ${navigationType}`);
      console.log(`withCredentials: ${config.withCredentials}`);
      console.log(`Headers:`, JSON.parse(JSON.stringify(config.headers)));
      console.log(`Axios Config:`, {
        url: config.url,
        baseURL: config.baseURL,
        method: config.method,
        timeout: config.timeout,
        adapter: config.adapter
          ? Array.isArray(config.adapter)
            ? 'array'
            : typeof config.adapter
          : 'default',
        signal: config.signal ? 'Present' : 'None',
      });
      console.log(`Body:`, config.data || '{}');
      console.log(`Retry Flag: ${config._retry ? 'true' : 'false'}`);
      console.log(`Queue State: ${queueState}`);
      console.log(`Refresh Lock State: ${isRefreshing()}`);
      console.log(`Promise State: ${promiseState}`);
      console.log(`Stack Trace:`, stackTrace);
      console.groupEnd();
    }
    const token = getAccessToken?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and silent refresh
apiClient.interceptors.response.use(
  (response) => {
    if (response.config?.url?.includes('/auth/refresh')) {
      const requestId =
        response.config.headers['X-Refresh-Request-ID'] || 'unknown';
      console.group(`[REFRESH_TRACE_RES_SUCCESS] ID: ${requestId}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log(`Status: ${response.status}`);
      console.log(`Data:`, response.data);
      console.groupEnd();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.url?.includes('/auth/refresh')) {
      const requestId =
        originalRequest.headers['X-Refresh-Request-ID'] || 'unknown';
      console.group(`[REFRESH_TRACE_RES_ERROR] ID: ${requestId}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log(`Status: ${error.response?.status}`);
      console.log(`Error Message:`, error.response?.data || error.message);
      console.log(`Stack trace:`, new Error().stack);
      console.groupEnd();
    }

    // If error is 401 and not a retry and not the refresh request itself, and we have a refresh function
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      refreshAuthToken
    ) {
      // Check if we have a new token from a very recent refresh
      const lastRefresh = getLastRefreshTime();
      if (
        lastRefresh &&
        originalRequest._initiatedAt &&
        originalRequest._initiatedAt < lastRefresh
      ) {
        const latestToken = getAccessToken?.();
        if (latestToken) {
          console.log(
            `[INTERCEPTOR_401_RETRY_RECENT] Request ${originalRequest.url} was initiated at ${new Date(originalRequest._initiatedAt).toISOString()} which is before last refresh at ${new Date(lastRefresh).toISOString()}. Retrying immediately with the new token without refreshing.`
          );
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${latestToken}`;
          originalRequest.withCredentials = true;
          return apiClient(originalRequest);
        }
      }

      const activeRefreshing = isRefreshing();
      console.log(
        `[INTERCEPTOR_401] Intercepted 401 for ${originalRequest.url}. activeRefreshing: ${activeRefreshing}`
      );

      if (activeRefreshing) {
        console.log(
          `[INTERCEPTOR_QUEUED] A refresh is already active. Waiting for existing refresh promise...`
        );
        const activePromise = getRefreshPromise();
        if (activePromise) {
          return activePromise
            .then((token) => {
              console.log(
                `[INTERCEPTOR_QUEUED_RESOLVED] Retrying queued request for ${originalRequest.url}`
              );
              originalRequest.headers.Authorization = `Bearer ${token}`;
              originalRequest.withCredentials = true;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }
      }

      originalRequest._retry = true;

      try {
        console.log(
          `[INTERCEPTOR_TRIGGER_REFRESH] Triggering token refresh via unified refreshAuthToken...`
        );
        const newToken = await refreshAuthToken('AxiosInterceptor');
        console.log(
          `[INTERCEPTOR_REFRESH_SUCCESS] Successfully refreshed token.`
        );
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.withCredentials = true;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error(
          `[INTERCEPTOR_REFRESH_FAILED] Token refresh failed.`,
          refreshError
        );
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
