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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and not a retry and not the refresh request itself, and we have a refresh function
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      refreshAuthToken
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest.withCredentials = true; // explicitly enforce credentials on queued retried requests
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAuthToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.withCredentials = true; // explicitly enforce credentials on retried requests
        return apiClient(originalRequest);
      } catch (refreshError) {
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
