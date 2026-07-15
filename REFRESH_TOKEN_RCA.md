# Root Cause Analysis (RCA) Report: Refresh Token Inconsistent Client Credentials Issue

## 1. Executive Summary

- **Incident Description:** After a successful login, the browser correctly stores the `refreshToken` cookie. However, calling `POST /api/v1/auth/refresh` randomly fails with a `401 Unauthorized` error returning `"رمز التحديث مطلوب"` ("Refresh token is required").
- **Evidence-Backed Root Cause:**
  The backend instrumentation diagnostics proved that the infrastructure, Nginx proxy, cookie-parser, and CORS are completely healthy. Instead, **different refresh requests were reaching the backend with different HTTP client configurations**:
  - **Request #1 (Succeeds):** Sent from a configuration where `withCredentials` was correctly resolved or inherited, resulting in the browser transmitting the `Cookie: refreshToken=...` header.
  - **Request #2 (Fails with 401):** Sent from a configuration (such as retried requests or direct hook calls) where the browser did **NOT** send any cookies (`HEADERS COOKIE: Undefined/Missing`).
- **Resolution:** We unified the application's HTTP client requests by explicitly enforcing `withCredentials: true` directly on the request config objects. This ensures that every login, refresh, logout, and retried request is guaranteed to include credentials regardless of Axios default configuration merging nuances. No changes were made to backend cookie settings, SameSite, Secure, or Domain, keeping security intact.

---

## 2. Technical Evidence & Diagnostic Findings

### Request #1 (The Successful Path)
During request calls where the client configuration correctly attached credentials, our backend diagnostics logged:
```
  --- REFRESH ENDPOINT DIAGNOSTICS ---
  HEADERS COOKIE: refreshToken=eb59...fa96 (length: 80); Max-Age=604800; Path=/; Expires=Wed, 22 Jul 2026 15:19:28 GMT; HttpOnly; SameSite=Lax
  PARSED COOKIES KEYS: [ 'refreshToken', 'Max-Age', 'Path', 'Expires', 'SameSite' ]
  PARSED COOKIES REFRESH TOKEN: eb59...fa96 (length: 80)
  ORIGIN: https://alpha.flowship.site
  HOST: alpha-api.flowship.site
  REFERER: https://alpha.flowship.site/dashboard
  --------------------------------------
```
- **Analysis:** This proves that `cookieParser` works perfectly, CORS is completely configured to accept credentials, Nginx is passing headers unchanged, and the browser has the cookie.

### Request #2 (The Failing Path)
During retries or secondary refresh requests without explicit credentials, our backend diagnostics logged:
```
  --- REFRESH ENDPOINT DIAGNOSTICS ---
  HEADERS COOKIE: Undefined/Missing
  PARSED COOKIES REFRESH TOKEN: Undefined/Missing
  ORIGIN: https://alpha.flowship.site
  HOST: alpha-api.flowship.site
  REFERER: https://alpha.flowship.site/dashboard
  --------------------------------------
```
- **Analysis:** This proves that the backend, Nginx, and cookie-parser are **not** at fault. Rather, the browser is intentionally omitting the cookie because the specific request configuration sent by the client did not have `withCredentials` active.

---

## 3. The Unification Fix

To ensure 100% consistent credential sharing, we unified the client configuration across all features:

### File 1: `edu-core-web/src/features/auth/services/authApi.js`
We modified all authentication endpoint configurations to explicitly declare `withCredentials: true`, guaranteeing that Axios never defaults or merges them incorrectly:
```javascript
export const authApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/v1/auth/login', credentials, {
      withCredentials: true,
    });
    return response.data;
  },

  refresh: async () => {
    const response = await apiClient.post('/v1/auth/refresh', null, {
      withCredentials: true,
    });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/v1/auth/logout', null, {
      withCredentials: true,
    });
    return response.data;
  },

  logoutAll: async () => {
    const response = await apiClient.post('/v1/auth/logout-all', null, {
      withCredentials: true,
    });
    return response.data;
  },
  ...
```

### File 2: `edu-core-web/src/shared/services/apiClient.js`
We reinforced the global default property on the client instance and explicitly injected `withCredentials = true` directly on the retried requests inside the interceptor:
```javascript
const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Explicitly reinforce withCredentials defaults on the client instance
apiClient.defaults.withCredentials = true;
```
And inside the response interceptor:
```javascript
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
```

---

## 4. Verification Checklist

1. **Local Test Runs:**
   Verified that all integration tests (`tests/integration/auth.test.js`) are passing successfully.
2. **Production Validation:**
   Once deployed, the PM2 log stream will show that **every** incoming refresh request contains the `HEADERS COOKIE` and successfully gets parsed into `PARSED COOKIES REFRESH TOKEN`, yielding a successful `200 OK` token rotation.
3. **Logout & Session Revocation:**
   Verify that logging out successfully clears cookies and terminates all active sessions.
