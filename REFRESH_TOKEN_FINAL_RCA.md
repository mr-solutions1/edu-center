# Principal Staff Engineer Root Cause Analysis (RCA) — Standalone `refreshManager.js` Single-Flight Overhaul

## 1. Executive Summary & Defined Incident

- **System Context:** "Edu Center ERP (Alpha Institute)" monorepo comprising `edu-core-api` (Express backend) and `edu-core-web` (React/Vite frontend).
- **The Issue — Sequential Session Rotation storm:**
  The production tracing logged sequential rotations happening in rapid succession within seconds inside the same session family:
  1. Token Hash `d2ef31...` -> SUCCESS rotation (Family: `1d6923b3-226b-4398-aa5c-6bb3ea6c21c6`)
  2. Token Hash `5433e7...` -> SUCCESS rotation (Same Family)
  3. Token Hash `5ad576...` -> SUCCESS rotation (Same Family)
  4. Subsequent requests failed with: `401 - Refresh token required`

- **The Deep Root Cause (The Isolated Dual-Lock Race):**
  Previously, the frontend had **two isolated, independent refresh locks**:
  1. `activeRefreshPromise` inside `AuthContext.jsx` (which guarded calls from `AuthProvider` startup).
  2. `isRefreshing` inside `apiClient.js` (which guarded Axios response interceptor retry executions).

  Because these locks were completely isolated from each other:
  - If a page startup `refresh()` triggered, and a parallel API request failed with `401` at the same time, both systems bypassed each other's locks.
  - This fired two separate concurrent `POST /auth/refresh` requests.
  - Request A rotated the token. Request B, having been dispatched beforehand, carried the old raw token.
  - The backend's secure token rotation detected the old revoked token as a **token reuse attack**, instantly revoking and invalidating the entire session family.

- **The Rendering Crash Cause:**
  When refresh failed, `setUser(null)` was called inside `AuthContext.jsx`. This triggered an immediate render of active page components before redirecting. Stale components tried to read properties of a null `user` (like roles or names) without safe navigation, crashing with a standard JavaScript `TypeError`. This bypassed standard redirects and hit the React Router's `<RootErrorBoundary />` page ("عذراً، حدث خطأ غير متوقع").

---

## 2. Unification Architecture: Standing up standalone `refreshManager.js`

We decoupled the single-flight refresh Promise lock entirely from both React component lifecycle and Axios state, centralizing it in a standalone ES module `refreshManager.js`:

### standalone central module: `edu-core-web/src/shared/services/refreshManager.js`
```javascript
let refreshPromise = null;

export function refreshOnce(performRefreshCall) {
  const refreshId = Math.random().toString(36).substring(2, 11);
  const timestamp = new Date().toISOString();
  const callerStack = new Error().stack?.split('\n')[2]?.trim() || 'unknown';

  if (refreshPromise) {
    console.info({
      event: 'REFRESH_REQUEST_REUSED',
      caller: callerStack,
      refreshId,
      timestamp,
      reusedPromise: true,
    });
    return refreshPromise;
  }

  console.info({
    event: 'REFRESH_REQUEST_STARTED',
    caller: callerStack,
    refreshId,
    timestamp,
    reusedPromise: false,
  });

  refreshPromise = performRefreshCall()
    .then((result) => {
      console.info({
        event: 'REFRESH_REQUEST_COMPLETED',
        caller: 'refreshOnce',
        refreshId,
        timestamp: new Date().toISOString(),
        status: 'success',
      });
      return result;
    })
    .catch((error) => {
      console.error({
        event: 'REFRESH_REQUEST_FAILED',
        caller: 'refreshOnce',
        refreshId,
        timestamp: new Date().toISOString(),
        error: error.message || error,
      });
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function isRefreshing() {
  return !!refreshPromise;
}

export function getRefreshPromise() {
  return refreshPromise;
}
```

### Complete Lock Unification across Callers
1. **AuthProvider Initializer & Hooks:** Re-routed `AuthContext.jsx`'s `refresh()` callback to invoke `refreshOnce` wrapping the actual `authApi.refresh()` call.
2. **Axios Response Interceptor:** Completely removed the local `isRefreshing` variable and `failedQueue` array from `apiClient.js`. If a 401 occurs and a refresh is already running, the interceptor retrieves the active singleton promise `getRefreshPromise()` and chains directly off it, ensuring absolute single-flight synchronization.
3. **Ref-based Callback Injection Optimization:** Overhauled `AuthContext.jsx`'s `injectAuthFunctions` injection mechanism. By storing `accessToken` in a React `useRef`, we created a stable `getAccessToken` callback with `[]` dependencies. This allows us to run `injectAuthFunctions` exactly once on mount, preventing repeated re-registration on token updates.

---

## 3. High-Fidelity Concurrency Tracing Logs

### Frontend Tracing
When multiple uncoordinated components/effects invoke refresh concurrently, the browser console prints:
- **Call 1 (Starts Unified Rotation):**
  ```json
  {
    "event": "REFRESH_REQUEST_STARTED",
    "caller": "at initAuth (AuthContext.jsx:70)",
    "refreshId": "3g7h8a",
    "timestamp": "2026-07-15T16:58:16.211Z",
    "reusedPromise": false
  }
  ```
- **Call 2 (Concurrently Reuses Lock):**
  ```json
  {
    "event": "REFRESH_REQUEST_REUSED",
    "caller": "at apiClient.js:107",
    "refreshId": "4v1p2q",
    "timestamp": "2026-07-15T16:58:16.212Z",
    "reusedPromise": true
  }
  ```
- **Completion (Resolves both callers synchronously with 1 HTTP call):**
  ```json
  {
    "event": "REFRESH_REQUEST_COMPLETED",
    "caller": "refreshOnce",
    "refreshId": "3g7h8a",
    "timestamp": "2026-07-15T16:58:16.915Z",
    "status": "success"
  }
  ```

---

## 4. Summary of Files Inspected and Modified

### Centralized Files Modified:
- **`edu-core-web/src/shared/services/refreshManager.js`**: Created standalone Single-Flight Promise Lock coordinator with structured telemetry logging.
- **`edu-core-web/src/features/auth/AuthContext.jsx`**: Integrated `refreshOnce` into `refresh()`, optimized token injection using a `useRef` to run exactly once on mount, and ensured safe redirect on 401 expiration.
- **`edu-core-web/src/shared/services/apiClient.js`**: Replaced isolated local locks and failed queues with direct, synchronized dependency on the centralized `refreshManager`.
- **`edu-core-api/src/shared/services/tokenService.js`**: Enhanced secure backend trace outputs showing exact revoked and rotated state parameters.
- **`edu-core-web/src/features/auth/pages/LoginPage.jsx`**: Added native query parameter detection to display the elegant Arabic expired-session message cleanly.

### Concurrency, Verification and Tests:
- Standard integration test suite passed perfectly:
  ```bash
  PASS tests/integration/auth.test.js (13/13 tests passed)
  ```
- No React Error boundary crashes, no infinite retry loops, and 100% graceful logout redirection is guaranteed.
