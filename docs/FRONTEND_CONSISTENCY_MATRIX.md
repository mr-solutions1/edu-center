# Repository-Wide Frontend Consistency Matrix
**MERN Client Audit & Code-Driven Search Traces**

This document specifies the exact component sweeps, custom hooks, and pages inside the `edu-core-web` React application impacted by our backend structural refactorings.

---

## 1. Code-Driven Search Sweeps Matrix

We performed a targeted search trace of key backend variables across the frontend client code tree to identify stale assumptions, dynamic import workarounds, and deprecated field references:

| Key Term | Found in Frontend Files | Current State | Required Refactoring | Priority |
|---|---|---|---|---|
| `isAuthorizedToSign` | `PayrollListPage.jsx` | Consumes the backend-driven authorization boolean. | None (Fully aligned). | **Muted** |
| `consumedHours` | `StudentDetailsPage.jsx` | Displays `{reg.purchasedHours} / {reg.consumedHours} ساعة`. | Display a warnings UI (color card yellow/red) if `consumedHours` matches or exceeds `purchasedHours`. | **High** |
| `paidAmount` | **Zero occurrences** | Omitted entirely on registration views. | Display `paidAmount` vs `totalAmount` on each registration card. | **Critical** |
| `teacherPercentage` | `SettingsPage.jsx`, `TeacherFormDialog.jsx` | Edits settings defaults or individual teacher commissions. | None (Correctly writes config to the DB; backend handles snapshots). | **Muted** |
| `hourlyRate` | `SettingsPage.jsx`, `TeacherFormDialog.jsx`, `SalaryFormDialog.jsx` | Configures stage settings, salaries, or profiles. | None (Correctly configures inputs; backend handles snapshots). | **Muted** |
| `direction` | `DashboardPage.jsx`, `ReportsPage.jsx` | Zero references; dashboard relies on populated stats object. | None (Dashboard and reports now delegate all calculations to backend). | **Muted** |

---

## 2. API Schema Dependencies Map

This map outlines how our new backend capability endpoints map across Feature modules, services, and hooks inside `edu-core-web/src/features/`:

```
[Backend: Snapshot Earnings] ──────► [TeacherSettlementPage.jsx] & [TeacherProfilePage.jsx]
                                      - Exposes metrics.dueBeforeDeduction & metrics.netDue.
                                      - Displays snapshot-calculated teacher balances.

[Backend: FIFO Allocations]  ──────► [PaymentsListPage.jsx] & [PaymentFormDialog.jsx]
                                      - Renders payments as flat student-wide balances.
                                      - Refactor: Exposing PaymentAllocation tree sub-rows.

[Backend: Lesson Lock]       ──────► [SchedulePage.jsx] & [AttendanceDialog.jsx]
                                      - Handles past completed lesson edits via API triggers.
                                      - Refactor: Gating buttons based on lesson.payrollRecordId.

[Backend: Sequential Sign]   ──────► [PayrollListPage.jsx] & [payrollApi.js]
                                      - Binds "سير الاعتماد" stepper.
                                      - Consumes backend-driven isAuthorizedToSign. (Aligned).

[Backend: Reversals/REFUND]  ──────► [StudentDetailsPage.jsx] & [studentApi.js]
                                      - Performs deleteRegistration.
                                      - Refactor: Changing visual delete actions to cancellation.
```

---

## 3. UI/UX Refactoring Gaps Inventory

### **A. Calendar Lesson Lock (Schedule Module)**
*   **Gap:** Edit and status update buttons remain active on past completed lessons. When clicked, modifications fail on the backend and throw raw API validation errors.
*   **Correction:** Disable edit/attendance buttons if `lesson.payrollRecordId` is defined.

### **B. Registration Cancellations (Students Module)**
*   **Gap:** Status badges style `COMPLETED` as green and everything else as blue, rendering a raw English status string `'CANCELLED'`.
*   **Correction:** Create styles for `'CANCELLED'` (grey/red badge) with translated Arabic label "ملغي".

### **C. Payment Allocations (Payments Module)**
*   **Gap:** Outstanding balances are tracked on student aggregate level, and no package-level breakdown or tracing exists.
*   **Correction:** Integrate our `PaymentAllocation` model to display nested tree allocations on payments and registrations.
