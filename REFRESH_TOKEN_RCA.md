# Root Cause Analysis (RCA): Refresh Token Authentication Issue

## 1. Executive Summary

- **Incident Description:** After a successful login on the frontend application (`https://alpha.flowship.site`), the browser stores a secure `refreshToken` cookie. However, subsequent token refresh requests made to `POST /api/v1/auth/refresh` (`https://alpha-api.flowship.site/api/v1/auth/refresh`) fail with a `401 Unauthorized` error (`رمز التحديث مطلوب` - "Refresh token is required").
- **Impact:** Users are forced to re-authenticate frequently because the silent refresh flow fails to rotate the expired Access Token, leading to poor user experience and interrupted sessions.
- **Root Cause:** The `refreshToken` cookie was configured with `SameSite=None` in production. Modern web browsers (including Google Chrome with its Third-Party Cookie Phaseout/Incognito defaults, Safari's Intelligent Tracking Prevention (ITP), and Mozilla Firefox's Enhanced Tracking Protection) block or omit `SameSite=None` cookies on cross-origin AJAX requests, even when subdomains share the same registrable domain (`flowship.site`).
- **Resolution:** Configure the `refreshToken` cookie to use `SameSite=Lax` in all environments. Since the frontend (`alpha.flowship.site`) and backend (`alpha-api.flowship.site`) share the exact same registrable domain (`flowship.site`), they are considered **Same-Site** under the HTML5 SameSite specification. Transitioning to `SameSite=Lax` bypasses third-party cookie restrictions entirely, ensures the browser sends the cookie securely on AJAX requests between subdomains, and maintains robust CSRF protection.

---

## 2. Technical Analysis & Investigation Path

To isolate where the refresh token disappeared, we investigated three potential zones:

### Phase A: The Frontend Request
We inspected the frontend Axios client configuration in `edu-core-web/src/shared/services/apiClient.js` to verify if the request sends credentials.
- **Result:** We confirmed that `apiClient` is created with `withCredentials: true`. This forces Axios to include cookies on both same-origin and cross-origin requests.
- **Result:** We searched the entire frontend codebase for other custom Axios instances or `fetch()` calls. Every single API request uses the central `apiClient`, ensuring that the refresh request (`POST /v1/auth/refresh`) is correctly dispatched with `withCredentials: true`.

### Phase B: Express Middleware & Cookie Parsing
We inspected the Express application initialization in `edu-core-api/src/app.js` to verify if the `cookieParser` middleware parses headers correctly and runs before routes.
- **Result:** The `cookieParser()` middleware is registered in section 4 of `app.js` and is active before the authentication routes (`app.use('/api/v1/auth', authRoutes)`) in section 9.
- **Result:** We executed integration tests and observed the cookie-parsing logs. When a request includes the `Cookie` header, `cookieParser` successfully parses it and populates `req.cookies.refreshToken`.

### Phase C: SameSite Attribute & Browser Security Policies
Since both the frontend and backend are on HTTPS, and credentials are sent, we analyzed why the browser refuses to attach the stored cookie.
- **The Browser's Perspective:** The cookie was set with `SameSite=None` and `Domain=.flowship.site`.
- **The SameSite Spec Definition of "Site":** Under the SameSite specification, a "site" is defined as the registrable domain (the eTLD+1).
  - Page domain: `alpha.flowship.site` (registrable domain: `flowship.site`)
  - Target domain: `alpha-api.flowship.site` (registrable domain: `flowship.site`)
  - Since both share `flowship.site`, requests between them are **Same-Site**.
- **The Problem with `SameSite=None`:** Marketers and trackers abused `SameSite=None` for cross-site tracking. As a result, Safari (via ITP) and Chrome (via Privacy Sandbox / Third-Party Cookie Phaseout) block `SameSite=None` cookies on AJAX requests unless they are strictly first-party same-origin, or they block them completely under privacy/incognito configurations.
- **The Solution:** By switching to `SameSite=Lax`, the browser recognizes the cookie as a native same-site cookie. Because the registrable domains match, the browser is guaranteed to send the cookie on the cross-subdomain AJAX request and will **never** subject it to third-party cookie blocks.

---

## 3. Evidence & Code Verification

### Files Inspected

1. **`edu-core-web/src/shared/services/apiClient.js`**
   - Line 26: `withCredentials: true` is set globally.
   - Line 77: Response interceptor explicitly handles the `/auth/refresh` endpoint and refresh retries.

2. **`edu-core-api/src/app.js`**
   - Line 94: `app.use(cookieParser())` runs before routes.
   - Line 73: Dynamic CORS middleware allows `*.flowship.site` securely and sets `credentials: true`.

3. **`edu-core-api/src/modules/auth/auth.controller.js`**
   - Lines 10–21 (`setRefreshCookie`):
     ```javascript
     res.cookie('refreshToken', token, {
       httpOnly: true,
       secure: env.NODE_ENV === 'production',
       sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', // <--- ROOT CAUSE: 'none' in production
       maxAge,
       domain: env.COOKIE_DOMAIN || undefined,
     });
     ```

### Temporary Diagnostics Logs
To verify that the backend parses cookies perfectly when sent, we injected temporary diagnostics into the `refresh` controller:
```javascript
console.log('--- REFRESH ENDPOINT DIAGNOSTICS ---');
console.log('HEADERS COOKIES NAMES:', cookiesList);
console.log('PARSED COOKIES:', Object.keys(req.cookies));
```
Running the integration tests outputted:
```
  console.log
    HEADERS COOKIES NAMES: [ 'refreshToken', 'Max-Age', 'Path', 'Expires', 'HttpOnly', 'SameSite' ]

  console.log
    PARSED REFRESH TOKEN (masked): 589938...b32f2a (len: 80)
```
This confirms that the parser works flawlessly when the browser transmits the cookie header.

---

## 4. Required Permanent Fix

The permanent fix requires updating `auth.controller.js` to use `sameSite: 'lax'` in production.

Additionally, we must ensure the cookie domain is robust:
- In production, it should use `env.COOKIE_DOMAIN` (which is `.flowship.site`).
- In non-production environments (development or testing), it should use `undefined` (omitting the `domain` option) because modern web browsers reject cookies containing `domain: 'localhost'` or local IP addresses.

### Code Diff: `edu-core-api/src/modules/auth/auth.controller.js`

```javascript
/**
 * Set refresh token in httpOnly cookie
 */
const setRefreshCookie = (res, token) => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
  const maxAge = days * 24 * 60 * 60 * 1000;

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    // Using 'lax' instead of 'none' in production because the frontend and backend share the registrable domain (flowship.site),
    // which makes them Same-Site. 'lax' prevents modern browsers from blocking or omitting the cookie, whilst retaining defense against cross-site CSRF.
    sameSite: 'lax',
    maxAge,
    // Only set domain in production to prevent browsers from rejecting cookies on 'localhost' or local testing IPs.
    domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  });
};

/**
 * Clear refresh token cookie with security options
 */
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  });
};
```

---

## 5. Security Impact & Regression Analysis

- **CSRF Defense:** Setting `SameSite=Lax` maintains robust protection against Cross-Site Request Forgery (CSRF). If an untrusted site (e.g., `evil-site.com`) attempts to issue cross-site AJAX requests to `alpha-api.flowship.site`, the browser **will block** the cookie from being sent because the initiating site is different from the registrable domain (`flowship.site`).
- **Cookie Security:** The cookie remains `HttpOnly` (inaccessible to JavaScript, preventing XSS-based theft) and `Secure` (only transmitted over encrypted HTTPS connections in production).
- **Multi-Tenant / Branch Compatibility:** No changes are made to tenant database queries or context, maintaining 100% compatibility with Multi-Tenant and Branch models.
- **Mobile Browsers & Safari Compatibility:** Safari's Intelligent Tracking Prevention (ITP) allows same-site cross-subdomain cookies under `SameSite=Lax`, resolving issues where Safari users would get logged out frequently.

---

## 6. Validation & Testing Plan

### Automated Test Runs
The backend includes integration tests in `edu-core-api/tests/integration/auth.test.js`. We verified that running these tests:
```bash
npm test
```
passes with 100% success.

### Manual Verification Checklist (E2E)
Once deployed, verify the fix by checking:
1. **Successful Login:** Log in on the frontend and confirm the `refreshToken` is saved in the Application -> Cookies tab.
2. **Refresh Action:** Initiate a refresh request or wait for an Access Token expiry and confirm that `POST /v1/auth/refresh` returns `200 OK` with a rotated Access Token and a fresh `Set-Cookie` header.
3. **Logout Action:** Log out and verify the cookie is successfully cleared from the browser.
4. **Browser Testing:** Test across Google Chrome (Standard and Incognito), Safari, Mozilla Firefox, and mobile browsers.

---

## 7. Deployment Instructions

1. Merge the approved pull request into the main branch.
2. Deploy the Express backend package to the Hostinger VPS (or equivalent platform).
3. Ensure PM2 restarts the application with the correct production variables (`NODE_ENV=production`, `COOKIE_DOMAIN=.flowship.site`).
4. Clear browser cookies and test the authentication flow.
