import axios from 'axios';
import { isRefreshing, getRefreshPromise, getTabId } from './refreshManager';
import { parseApiError } from '../utils/errorParser';

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
  if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
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

// Map to track active request AbortControllers
const activeControllers = new Set();

export const abortAllPendingRequests = () => {
  console.info('[EVIDENCE_TRACE] Aborting all pending API requests...');
  for (const controller of activeControllers) {
    try {
      controller.abort();
    } catch (e) {
      console.error('Error aborting request:', e);
    }
  }
  activeControllers.clear();
};

// To be injected from AuthProvider to avoid circular dependency
let refreshAuthToken = null;
let getAccessToken = null;

export const injectAuthFunctions = (refreshFn, tokenFn) => {
  refreshAuthToken = refreshFn;
  getAccessToken = tokenFn;
};

let apiRequestCounter = 0;

// Request interceptor to attach Access Token
apiClient.interceptors.request.use(
  async (config) => {
    // Proactively enforce withCredentials on every single outgoing request
    config.withCredentials = true;
    const currentApiReqCount = ++apiRequestCounter;

    // Suspend and wait if a token refresh is currently in progress
    if (
      !config.url?.includes('/auth/refresh') &&
      !config.url?.includes('/auth/login') &&
      !config.url?.includes('/auth/logout')
    ) {
      const activeRefreshPromise = getRefreshPromise();
      if (activeRefreshPromise) {
        console.info(
          `[EVIDENCE_TRACE] Suspending request and waiting for active refresh: ${config.url}`
        );
        try {
          const freshToken = await activeRefreshPromise;
          config.headers.Authorization = `Bearer ${freshToken}`;
        } catch (refreshError) {
          console.error(
            `[EVIDENCE_TRACE] Active refresh failed; rejecting suspended request ${config.url}`
          );
          return Promise.reject(refreshError);
        }
      }
    }

    // Support both original signal (e.g. from React Query) and global logout aborting
    const controller = new AbortController();
    const originalSignal = config.signal;
    if (originalSignal) {
      if (originalSignal.aborted) {
        controller.abort();
      } else {
        originalSignal.addEventListener('abort', () => {
          controller.abort();
        });
      }
    }
    config.signal = controller.signal;
    config._controller = controller;
    activeControllers.add(controller);

    // Attach tracing headers for all auth refresh requests
    if (config.url?.includes('/auth/refresh')) {
      const tabId = getTabId();
      const requestId = config.headers['X-Refresh-Instance'] || Math.random().toString(36).substring(2, 11);

      config.headers['X-Refresh-Request-ID'] = requestId;
      config.headers['X-Refresh-Tab-ID'] = tabId;
      if (!config.headers['X-Refresh-Source']) {
        config.headers['X-Refresh-Source'] = 'AxiosInterceptor';
      }
    }

    const requestDetails = {
      traceEvent: 'AXIOS_REQUEST_INTERCEPTOR_FIRED',
      apiReqNumber: currentApiReqCount,
      timestamp: new Date().toISOString(),
      perfTimeMs: performance.now(),
      url: config.url,
      baseURL: config.baseURL,
      method: config.method?.toUpperCase(),
      headers: JSON.parse(JSON.stringify(config.headers || {})),
      withCredentials: config.withCredentials,
      adapter: config.adapter ? (typeof config.adapter === 'string' ? config.adapter : 'function') : 'default',
      data: config.data,
      hasSignal: !!config.signal,
    };

    console.info('[EVIDENCE_TRACE] ' + JSON.stringify(requestDetails, null, 2));

    const token = getAccessToken?.();
    if (token && !config.url?.includes('/auth/refresh')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and silent refresh
apiClient.interceptors.response.use(
  (response) => {
    const controller = response.config?._controller;
    if (controller) {
      activeControllers.delete(controller);
    }

    const currentApiResCount = apiRequestCounter;
    console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
      traceEvent: 'AXIOS_RESPONSE_SUCCESS',
      apiReqNumber: currentApiResCount,
      timestamp: new Date().toISOString(),
      perfTimeMs: performance.now(),
      url: response.config?.url,
      status: response.status,
      data: response.data,
    }, null, 2));

    return response;
  },
  async (error) => {
    const controller = error.config?._controller;
    if (controller) {
      activeControllers.delete(controller);
    }

    // Centralized error parsing attached directly to the rejected error object
    if (error) {
      error.parsed = parseApiError(error);
    }

    const originalRequest = error.config;
    const currentApiResCount = apiRequestCounter;

    console.error('[EVIDENCE_TRACE] ' + JSON.stringify({
      traceEvent: 'AXIOS_RESPONSE_ERROR',
      apiReqNumber: currentApiResCount,
      timestamp: new Date().toISOString(),
      perfTimeMs: performance.now(),
      url: originalRequest?.url,
      status: error.response?.status,
      errorMsg: error.response?.data || error.message,
    }, null, 2));

    // If error is 401 and not a retry and not the refresh request itself, and we have a refresh function
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      refreshAuthToken
    ) {
      const activeRefreshing = isRefreshing();

      console.info('[EVIDENCE_TRACE] ' + JSON.stringify({
        traceEvent: 'INTERCEPTOR_401_HANDLED',
        apiReqNumber: currentApiResCount,
        timestamp: new Date().toISOString(),
        perfTimeMs: performance.now(),
        url: originalRequest.url,
        activeRefreshing,
      }, null, 2));

      if (activeRefreshing) {
        const activePromise = getRefreshPromise();
        if (activePromise) {
          return activePromise
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              originalRequest.withCredentials = true;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }
      }

      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthToken('AxiosInterceptor');
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.withCredentials = true;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
