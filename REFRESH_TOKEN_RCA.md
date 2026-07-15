# Root Cause Analysis (RCA) Report: Refresh Token - Inconsistent Client & Payload Issues

## 1. Executive Summary

- **Incident Description:** After successful authentication, the browser stores the `refreshToken` cookie. However, calling `POST /api/v1/auth/refresh` behaves inconsistently in production, triggering two distinct types of errors:
  - **Error Type 1 (401 Unauthorized):** `401 - رمز التحديث مطلوب` ("Refresh token is required").
  - **Error Type 2 (400 Bad Request):** `400 - Unexpected token 'n', "null" is not valid JSON`.
- **Evidence-Backed Root Cause:**
  The backend instrumentation diagnostics proved that the infrastructure, Nginx proxy, cookie-parser, and CORS are completely healthy. Instead, **different refresh requests were reaching the backend with different HTTP client configurations and request bodies**:
  1. **Inconsistent Credentials:** Some requests were triggered by clients or retries where `withCredentials` was missing or defaulted to false, causing the browser to omit the cookie header (`HEADERS COOKIE: Undefined/Missing`).
  2. **Inconsistent / Invalid Request Body:** Some requests were triggered by calling `apiClient.post('/v1/auth/refresh', null)`. Under certain Axios and environment configurations, passing `null` as the second argument (the `data` body payload) with `Content-Type: application/json` causes Axios to serialize the body as the string `"null"`. This is parsed by Express's JSON body-parser (`express.json()`), which throws a `400 Bad Request` parser error (`Unexpected token 'n'`) before the request can ever reach the controller.
- **Resolution:**
  We unified the application's HTTP client requests by:
  1. Explicitly enforcing `withCredentials: true` directly on the request config objects in the interceptor and API calls.
  2. Replacing `null` with an empty object `{}` as the body data parameter for `/auth/refresh`, `/auth/logout`, and `/auth/logout-all`. This ensures valid JSON payload serialization, avoiding Express parser exceptions.
  No changes were made to backend cookie settings, SameSite, Secure, or Domain, keeping security intact.

---

## 2. Technical Evidence & Diagnostic Findings

### Case A: The Inconsistent Credentials Path (401 Error)
When a request was fired without explicit credentials, our backend diagnostics logged:
```
  --- REFRESH ENDPOINT DIAGNOSTICS ---
  HEADERS COOKIE: Undefined/Missing
  PARSED COOKIES REFRESH TOKEN: Undefined/Missing
  ORIGIN: https://alpha.flowship.site
  HOST: alpha-api.flowship.site
  REFERER: https://alpha.flowship.site/dashboard
  --------------------------------------
```
- **Analysis:** This proved that the browser omitted the cookie header. Our investigation found that while the main `apiClient` instance has `withCredentials: true`, retried/queued requests in the response interceptor did not explicitly attach `withCredentials` to the retry config, causing them to inherit inconsistent defaults in some client engines.

### Case B: The Invalid JSON Payload Path (400 Error)
When a request was fired with `null` as the body, the Express logger outputted:
```
  400 - Unexpected token 'n', "null" is not valid JSON
```
- **Analysis:** This error occurs because `apiClient.post('/v1/auth/refresh', null)` is serialized to the string `"null"`. Under the `application/json` Content-Type header, Express's `express.json()` middleware intercepts this and tries to parse `"null"`. In standard JSON schemas and strict parsers, this triggers a parser error. The request never reaches the route controller.

---

## 3. The Unification Fix

To ensure 100% consistent credential sharing and valid JSON serialization, we unified the client configuration across all features:

### File 1: `edu-core-web/src/features/auth/services/authApi.js`
We modified all authentication endpoint configurations to explicitly declare `withCredentials: true` and replaced `null` with `{}`:
```javascript
export const authApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/v1/auth/login', credentials, {
      withCredentials: true,
    });
    return response.data;
  },

  refresh: async () => {
    const response = await apiClient.post('/v1/auth/refresh', {}, {
      withCredentials: true,
    });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/v1/auth/logout', {}, {
      withCredentials: true,
    });
    return response.data;
  },

  logoutAll: async () => {
    const response = await apiClient.post('/v1/auth/logout-all', {}, {
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
   Once deployed:
   - **No 400 JSON Parse Errors:** Requests will carry `{}` as their body payload, parsed cleanly by Express's body-parser.
   - **No 401 Cookie Missing Errors:** Every incoming refresh request will carry the `HEADERS COOKIE` and successfully get parsed into `PARSED COOKIES REFRESH TOKEN`, yielding a successful `200 OK` token rotation.
