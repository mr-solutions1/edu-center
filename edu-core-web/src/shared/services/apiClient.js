import axios from 'axios';

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

// To be injected from AuthProvider to avoid circular dependency
let refreshAuthToken = null;
let getAccessToken = null;

export const injectAuthFunctions = (refreshFn, tokenFn) => {
  refreshAuthToken = refreshFn;
  getAccessToken = tokenFn;
};

// Request interceptor to attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    // Proactively enforce withCredentials on every single outgoing request
    config.withCredentials = true;

    if (config.url?.includes('/auth/refresh')) {
      const requestId = Math.random().toString(36).substring(2, 11);
      config.headers['X-Refresh-Request-ID'] = requestId;
      console.group(`[REFRESH_TRACE_REQ] ID: ${requestId}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log(`URL: ${config.url}`);
      console.log(`baseURL: ${config.baseURL}`);
      console.log(`withCredentials: ${config.withCredentials}`);
      console.log(`headers:`, JSON.parse(JSON.stringify(config.headers)));
      console.log(`Stack trace:`, new Error().stack);
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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for error handling and silent refresh
apiClient.interceptors.response.use(
  (response) => {
    if (response.config?.url?.includes('/auth/refresh')) {
      const requestId = response.config.headers['X-Refresh-Request-ID'];
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
      const requestId = originalRequest.headers['X-Refresh-Request-ID'] || 'unknown';
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
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      refreshAuthToken
    ) {
      console.log(`[INTERCEPTOR_401] Intercepted 401 for ${originalRequest.url}. isRefreshing: ${isRefreshing}`);
      if (isRefreshing) {
        console.log(`[INTERCEPTOR_QUEUED] Queuing request for ${originalRequest.url}`);
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            console.log(`[INTERCEPTOR_QUEUED_RESOLVED] Retrying queued request for ${originalRequest.url}`);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest.withCredentials = true; // explicitly enforce credentials on queued retried requests
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log(`[INTERCEPTOR_TRIGGER_REFRESH] Triggering token refresh...`);
        const newToken = await refreshAuthToken();
        console.log(`[INTERCEPTOR_REFRESH_SUCCESS] Successfully refreshed token. Processing queue...`);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.withCredentials = true; // explicitly enforce credentials on retried requests
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error(`[INTERCEPTOR_REFRESH_FAILED] Token refresh failed.`, refreshError);
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
