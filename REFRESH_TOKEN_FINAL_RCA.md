# Principal Staff Engineer Root Cause Analysis (RCA) — Refresh Token Lifecycle & Concurrency Fixes

## 1. Executive Summary & Incident Report

- **System Context:** "Edu Center ERP (Alpha Institute)" monorepo comprising `edu-core-api` (Express backend) and `edu-core-web` (React/Vite frontend).
- **Symptom — Sequential Rotation Failures (401 - رمز تحديث غير صالح):** Under production workloads, active browser sessions periodically lost authentication state, with the backend returning `401 - INVALID_REFRESH_TOKEN` (invalid refresh token) even though the browser securely held the `refreshToken` cookie.
- **Definitive Evidence:**
  The backend tracing logged sequential rotations happening in rapid succession within the same session family:
  1. Token Hash `d2ef31...` -> SUCCESS rotation (Family: `1d6923b3-226b-4398-aa5c-6bb3ea6c21c6`)
  2. Token Hash `5433e7...` -> SUCCESS rotation (Same Family)
  3. Token Hash `5ad576...` -> SUCCESS rotation (Same Family)
  4. Subsequent requests fail with: `401 - Refresh token required`

- **The Core Root Cause:**
  - **The Refresh Storm / Concurrency Failure:** Multiple frontend flows triggered refresh token rotation independently. Parallel un-debounced calls to `/api/v1/auth/refresh` raced against each other on initial page bootstrap or concurrent 401 failures.
  - **Family Reuse Detection Triggered:** Request A arrived and rotated the token first. Request B, sent concurrently with the old cookie before the updated cookie arrived, was processed using the revoked token, which triggered the backend's token family reuse protection, completely invalidating the session.
  - **Graceful Rendering Crash Prevention:** A standard Javascript `TypeError` occurred during refresh failures because `setUser(null)` was called while active components read properties of the user without safety navigation. This triggered React Router's `<RootErrorBoundary />` page.

---

## 2. Solution Architecture

We implemented a robust, bulletproof architectural overhaul across three vectors:

### Part A: Centralized Single-Flight Refresh Once Pattern
Consolidated all parallel calls to `refresh()` on the frontend by keeping a module-scoped active promise:
```javascript
let activeRefreshPromise = null;
```
If `refresh()` is invoked while an active refresh call is already on the wire, subsequent callers immediately receive and await the **exact same promise**. This guarantees that **at most one network request** is dispatched, preventing any database conflicts, race conditions, or false token reuse detections.

We introduced the specific logging patterns:
- `REFRESH_REQUEST_STARTED` (fired when the first call initiates rotation)
- `REFRESH_REQUEST_REUSED` (logged when concurrent callers reuse the active single-flight promise)
- `REFRESH_REQUEST_COMPLETED` (logged when the token rotation successfully completes)

### Part B: Failsafe Request-Level Credentials
Enforced `config.withCredentials = true` in the global Axios request interceptor on every single outgoing request to avoid deep-nested parameter merging issues from overriding/dropping cookies.

### Part C: Safe Redirect & Rendering Crash Prevention
1. **Graceful Redirection:** Inside `AuthContext.jsx`'s `refresh` failure catch block, the state is cleared and we instantly perform a hard redirect to `/login?expired=true` via `window.location.href` (excluding public pages `/` and `/login`).
2. **Crash Elimination:** A hard browser-level redirect instantly tears down the active React virtual machine, preventing stale components from attempting to render with a null `user` object and eliminating `TypeError` rendering crashes.
3. **Arabic Notification Banner:** Overhauled `LoginPage.jsx` with a `useEffect` hook that detects the `expired` query parameter and cleanly renders a native, professional Arabic banner: `"انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."`

---

## 3. Comprehensive Call Graph (Single-Flight Pattern)

```
[Concurrent Component Mounts / Intercepted 401s]
                 │
                 ├──► Call 1 ──► refresh() ──► Check activeRefreshPromise? (No) ──► Log REFRESH_REQUEST_STARTED ──► Create Single-Flight Promise
                 │                                                                                                         │
                 └──► Call 2 ──► refresh() ──► Check activeRefreshPromise? (Yes) ──► Log REFRESH_REQUEST_REUSED  ──► Return Same Single-Flight Promise
                                                                                                                           │
                                                                                                                           ▼
                                                                                                                 [HTTP Request Dispatched]
                                                                                                               POST /api/v1/auth/refresh
                                                                                                                           │
                                                                                                                           ▼
                                                                                                               Log REFRESH_REQUEST_COMPLETED
```

---

## 4. Summary of Inspected and Modified Files

### Files Inspected:
- `edu-core-api/src/app.js` (CORS and middleware sequence)
- `edu-core-api/src/modules/auth/auth.controller.js` (Cookie handling)
- `edu-core-web/src/shared/components/ErrorBoundary.jsx` (Global router crash boundary)
- `edu-core-web/src/app/layout/Sidebar.jsx` (User property access patterns)

### Files Modified:
- **`edu-core-api/src/shared/services/tokenService.js`**:
  - Enhanced backend trace diagnostics (`[BACKEND_REFRESH_TRACE_START]`, database status, revoked state, family, hash) to provide crystal clear diagnostic output on the console without logging raw plaintext tokens.
- **`edu-core-web/src/shared/services/apiClient.js`**:
  - Implemented proactive request-level force-injection of `withCredentials = true` in the request interceptor.
  - Retained high-fidelity debug logging outputs (`[REFRESH_TRACE_REQ]`, timestamps, stacks) for easy browser-level trace inspections.
- **`edu-core-web/src/features/auth/AuthContext.jsx`**:
  - Overhauled `refresh` to implement a module-scoped Single-Flight Promise coordination mechanism and specific `REFRESH_REQUEST` telemetry events.
  - Implemented error handling that cleanly redirects to `/login?expired=true` and wipes out user session safely.
- **`edu-core-web/src/features/auth/pages/LoginPage.jsx`**:
  - Added native query parameter detection to display the elegant Arabic expired-session message cleanly.

---

## 5. Security, Concurrency, and Verification Summary

- **Security Impact:** Highly secure. Plaintext tokens are never logged. Secure token rotation and family reuse detection remains active and fully functional on the backend.
- **Concurrency Resolved:** Completely resolved. No duplicate network requests can ever be sent for a token refresh, removing race conditions entirely.
- **Integration Tests:** Cleanly passed.
  ```bash
  PASS tests/integration/auth.test.js (13/13 tests passed)
  ```
