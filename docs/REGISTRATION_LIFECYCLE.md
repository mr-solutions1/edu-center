# Student Registration Lifecycle Specification
**Package Purchases, Sibling Grouping & Auditable Cancellations**

This document specifies the database schemas, billing rules, sibling discount matrices, and soft-delete/cancellation protocols governing student registration packages in the **Edu Center ERP** platform.

---

## 1. Registration States & Flow

Registrations capture the contract between the student, subject, teacher, and pricing snapshots:

```mermaid
stateDiagram-m2
    [*] --> ACTIVE : Package purchased
    ACTIVE --> COMPLETED : All hours consumed (Remaining = 0)
    ACTIVE --> CANCELLED : Cancelled by administrator (Reversed)
```

---

## 2. Enrollment & Pricing Calculations

When a student registers (`student.controller.js`'s `createRegistration()`):
1.  **Resolve Sibling Discounts:** Sourced from `PricingService.getSiblingDiscountPercentage()`. The system queries all active student records in the database with matching `parentPhone` or `siblingGroup`.
    -   *Strategy pattern:* If siblings exist, are sorted chronologically. Subsequent siblings get flat discounts (e.g. 10% or 15%) configured in dynamic settings.
2.  **Snapshot Rates:** Snapshots the tenant's current default teacher commission percentage inside `teacherPercentageSnapshot` to lock the rate against future settings changes.
3.  **Create Transaction Records:**
    -   Inserts a `StudentRegistration` record.
    -   Records a `PACKAGE_PURCHASE` financial ledger entry (`DEBIT Accounts Receivable / CREDIT Tuition Revenue`).
    -   Records a `PURCHASE` hour transaction in the hour ledger, incrementing `purchasedHours` and establishing the student's initial hourly balance.

---

## 3. Auditable Cancellation (No Hard-Deletes)

To preserve immutable auditing histories and prevent database desynchronizations, registrations cannot be hard-deleted from the database once created. Instead:

1.  **Validation Check:** Blocks deletion if any hours have been consumed (`consumedHours > 0`) or completed lessons exist.
2.  **Status Shift (Soft-Delete):** Changes the registration status to `CANCELLED`, sets `deletedAt` to current date, and flags `isDeleted: true` to hide it from operational views.
3.  **Generate Reversals:**
    -   Dispatches a reversing financial ledger entry of type `REFUND` with `direction: 'OUT'` to reverse the outstanding package receivables.
    -   Dispatches a reversing hour transaction of type `REFUND` with a negative amount (`-registration.purchasedHours`) to completely cancel out the purchased hours, ensuring student aggregates are restored to their pre-registration balances cleanly.
