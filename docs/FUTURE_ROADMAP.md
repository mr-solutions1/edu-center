# System Releases, Future Roadmap & Release Notes
**Product Iterations, Multi-Child Logins & Analytics Trends**

This document specifies the release notes, completed backend improvements, and future developmental roadmaps for the **Edu Center ERP** platform.

---

## 1. Release Notes (Current Version)

This release resolves critical financial, governance, and audit defects identified in the verified audit, establishing standard double-entry general ledger, FIFO payment allocation, and past lesson locking capabilities:

### **A. Core Improvements Completed**
*   **Accrual Accounting:** Correctly records package purchases (`PACKAGE_PURCHASE`) as accrual revenue, eliminating duplicate counting with student payment cash receipts (`STUDENT_PAYMENT`).
*   **Rate Drift Protection:** Automatically calculates completed lesson earnings from the student's locked registration snapshots (`pricePerHour` and `teacherPercentageSnapshot`).
*   **Sequential Signature Governance:** Accountant -> Admin signatures are verified step-by-step on the backend, gating approval actions dynamically via the computed `isAuthorizedToSign` parameter.
*   **Distributed PM2 Locks:** Simple, database-backed lock-claims based on YYYY-MM-DD execution dates guarantee background jobs are run exactly once per day across clustered PM2 workers.
*   **Lesson Locking:** Automatically makes completed lessons immutable when included in finalized payroll runs (`PENDING_APPROVAL`, `APPROVED`, or `PAID`).

---

## 2. Strategic Future Roadmap

The roadmap is structured into consecutive sprints designed to minimize regressions and maximize professional visual presentation:

### **Phase 1: Foundation Design System & Guards (Sprint 1-2)**
*   **Standardized Design Tokens:** Standardize typography scales, margins, elevations, semantic color palettes, and responsive side drawers.
*   **Atomic components:** Implement reusable shared elements (`shared/ui/Badge`, `Progress`, `EmptyState`, etc.).
*   **Lesson Lock Calendar UI:** Disable editing past completed lessons on the calendar if the payroll lock is present.

### **Phase 2: Business & Financial Transparency (Sprint 3-4)**
*   **FIFO Allocation Card Trees:** Expose payment allocation logs under payment lists to show how each cash receipt paid down oldest subject packages.
*   **Explainability Panels:** Integrate floating explainability cards on teacher settlements and registrations to decompose computed totals.
*   **Split Dashboards:** Divide the landing dashboard into an **Executive Dashboard** (accruals, collections, receivables, payables) and an **Operational Dashboard** (attendance, scheduled classes, low hours).

### **Phase 3: Multi-Child Portals & Analytics Trends (Sprint 5-6)**
*   **Guardian Entity Separator:** Refactor student profiles to extract a separate `Guardian` entity, enabling parents to log in once and toggle views between their multiple registered children.
*   **Interactive Trend Charts:** Install charting libraries to render historical income/expense lines and student growth curves.
*   **Activity Timelines:** Expose complete append-only student transaction histories in a centralized vertical timeline on details pages.
