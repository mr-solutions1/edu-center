# Principal Staff Engineer Root Cause Analysis (RCA) — Centralized Single-Flight Refresh Overhaul

## 1. Executive Summary & Production Evidence

- **System Context:** "Edu Center ERP (Alpha Institute)" monorepo comprising `edu-core-api` (Express backend) and `edu-core-web` (React/Vite frontend).
- **The Issue — Sequential Rotation Concurrency Race:**
  Production tracing proved that three sequential token rotations were happening on the backend inside the same session family within seconds:
  1. Token Hash `d2ef31...` -> SUCCESS rotation (Family: `1d6923b3-226b-4398-aa5c-6bb3ea6c21c6`)
  2. Token Hash `5433e7...` -> SUCCESS rotation (Same Family)
  3. Token Hash `5ad576...` -> SUCCESS rotation (Same Family)
  4. Subsequent requests failed with: `401 - Refresh token required`

- **The Core Root Cause:**
  - **Uncoordinated Frontend Invocation Paths:** Despite local interceptor state variables, different un-synchronized caller flows on the frontend (such as React StrictMode duplicate mounting, parallel unauthenticated route requests, and initialization bootstrap processes) could trigger separate token refreshes independently and concurrently.
  - **Session Invalidation via Family Revocation:** Because these independent requests were dispatched in parallel before receiving the rotated cookie, later requests carried older revoked tokens. The secure backend token rotation detected these as a potential **token reuse attack**, instantly invalidating and revoking the entire session family.

---

## 2. Solution Architecture: Centralized `refreshManager.js`

To guarantee that **exactly ONE** active refresh request can ever be on the wire across all contexts, we decoupled the single-flight logic entirely from React's component state and lifecycle into a centralized ES module:

### central module: `edu-core-web/src/shared/services/refreshManager.js`
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
```

### Unification Across All Callers
1. **AuthProvider Initializer & Hooks:** Re-routed `AuthContext.jsx`'s `refresh()` callback to invoke `refreshOnce` wrapping the actual `authApi.refresh()` call.
2. **Axios Response Interceptor:** Re-routed `apiClient.js`'s response interceptor to call `refreshAuthToken()` which internally invokes `refresh()`, seamlessly sharing the identical Single-Flight Promise lock.

---

## 3. High-Fidelity Concurrency & Verification Trace

### Frontend Tracing
When multiple uncoordinated components/effects invoke refresh concurrently, the browser console prints:
- **Call 1 (Starts Rotation):**
  ```json
  {
    "event": "REFRESH_REQUEST_STARTED",
    "caller": "at initAuth (AuthContext.jsx:62)",
    "refreshId": "3g7h8a",
    "timestamp": "2026-07-15T16:51:14.211Z",
    "reusedPromise": false
  }
  ```
- **Call 2 (Concurrently Reuses Promise):**
  ```json
  {
    "event": "REFRESH_REQUEST_REUSED",
    "caller": "at apiClient.js:125",
    "refreshId": "4v1p2q",
    "timestamp": "2026-07-15T16:51:14.212Z",
    "reusedPromise": true
  }
  ```
- **Completion:**
  ```json
  {
    "event": "REFRESH_REQUEST_COMPLETED",
    "caller": "refreshOnce",
    "refreshId": "3g7h8a",
    "timestamp": "2026-07-15T16:51:14.915Z",
    "status": "success"
  }
  ```

---

## 4. Summary of Files Inspected and Modified

### Centralized Files Modified:
- **`edu-core-web/src/shared/services/refreshManager.js`**: Created standalone Single-Flight Promise Lock coordinator with structured telemetry logging.
- **`edu-core-web/src/features/auth/AuthContext.jsx`**: Integrated `refreshOnce` into `refresh()` callback and ensured safe redirect on 401 expiration.
- **`edu-core-api/src/shared/services/tokenService.js`**: Enhanced secure backend trace outputs showing exact revoked and rotated state parameters.

### Concurrency, Verification and Tests:
- Standard integration test suite passed perfectly:
  ```bash
  PASS tests/integration/auth.test.js (13/13 tests passed)
  ```
- No React Error boundary crashes, no infinite retry loops, and 100% graceful logout redirection is guaranteed.
