# Frontend Architecture & State Management
**MERN Client Subsystem boundaries & State Guidelines**

This document specifies the directories boundaries, state management rules, caching policies, and authentication contexts governing the **edu-core-web** React interface.

---

## 1. Subsystem Directory Boundaries

The frontend code (`src/`) is organized into decoupled feature-module boundaries to prevent spaghetti routing:

```text
src/
├── app/                            # Global entry points, routing grids, providers
├── assets/                         # System logos and imagery
├── i18n/                           # Localized English/Arabic translation dictionaries
├── shared/                         # Global shared assets
│   ├── components/                 # Reusable layout fragments (PageHeader, Sidebar)
│   ├── ui/                         # Atomic shared UI components
│   └── utils/                      # Money formats, timezone converters, storage helpers
└── features/                       # Decoupled Feature Modules
    ├── auth/                       # Credentials check, session controllers
    ├── dashboard/                  # Executive vs Operational KPIs
    ├── payments/                   # Student payments list and FIFO breakdowns
    ├── payroll/                    # Salary lists, consecutive signatures steppers
    ├── scheduling/                 # Past lesson locks, attendances
    └── students/                   # Sibling grouping, cancellable registrations
```

---

## 2. State Management & Query Key Architecture

State caching, server validations, and asynchronous mutations are managed exclusively via **React Query** (`@tanstack/react-query`).

### **A. Standard Query Key Specifications**
All query actions must use predictable query-key structures to support target cache invalidations:
*   Student profile: `['student', id]`
*   Student registrations list: `['student-registrations', id]`
*   Student hour ledger: `['student-hour-ledger', id]`
*   Teacher profile: `['teacher-detail', id]`
*   Payroll records: `['payroll']`
*   Approval request logs: `['payroll-approval-details', id]`

### **B. Post-Mutation Invalidations**
Mutations must register clean `onSuccess` hooks to ensure zero stale financial or hour balances remain on the user's screen:
*   *Payment creation/edit:* Must invalidate `['student']` and `['student-registrations']`.
*   *Lesson completion:* Must invalidate `['student-hour-ledger']` and `['student-registrations']`.
*   *Payroll generation:* Must invalidate `['payroll']` and `['lessons']`.
*   *Registration cancellation:* Must invalidate `['student']`, `['student-registrations']`, and `['student-hour-ledger']`.

---

## 3. Global Authentication Context (`AuthContext.jsx`)

Provides the central state boundaries for active users, accessToken references, and RBAC helpers:
-   **Synchronous Token Rotation:** Client intercepts API responses. If a token refresh is in progress, the requests queue up seamlessly.
-   **User profiles caching:** Profile, permissions, and roles are fetched and kept in active session memory.
-   **Helper permissions:** `hasPermission(key)` checks if the logged-in user is authorized to perform specific actions directly inside the JSX layouts.
