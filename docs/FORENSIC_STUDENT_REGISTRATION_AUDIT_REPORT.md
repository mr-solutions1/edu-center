# Forensic End-to-End Audit & Alignment Report
## Unified All-in-One Student Registration Flow

This forensic report presents the findings, analysis, and alignment verification of the **All-in-One Student Registration** system across the Edu Center ERP platform. The audit traces the lifecycle of student creation, sibling discount strategy resolution, dynamic multi-subject academic registration, transactional integrity, ledger entries, and sequential FIFO payment allocation.

---

## 1. Audit Dimensions & Data Flow Mapping

The data flow mapping below tracks the journey of a student registration request from the moment the user clicks **"إضافة وتفعيل الحساب" (Save and Activate)** on the React frontend to DB confirmation:

```
[Frontend UI] StudentFormDialog.jsx
   │   (Combines Personal Info + Multi-Subject Registrations + Initial Payment)
   ▼
[Form validation] studentSchema.js (Frontend Zod Schema)
   │   (Validates fields, normalizes phone numbers, and maps inputs)
   ▼
[API Request] studentApi.js -> apiClient.post('/v1/students')
   │   (Dispatches serialized payload matching the expected backend structure)
   ▼
[Backend Route] student.routes.js -> router.post('/')
   │   (Enforces authenticate & authorize RBAC rules: ADMIN/RECEPTIONIST)
   ▼
[Backend Validation] student.validation.js (Backend Zod Validation)
   │   (Sanitizes empty values, coerces numerical inputs, validates nested schemas)
   ▼
[Controller] student.controller.js -> createStudent()
   │   (Runs inside a robust MongoDB Transaction Session)
   │
   ├─► 1. Model: Student.create() (Saves personal, geodata, and school details)
   ├─► 2. Service: GuardianService.syncStudentWithGuardian() (Links/creates Guardian profile)
   ├─► 3. Loop: StudentCalculationService.calculateRegistrationTotals() (Applies Sibling discount strategy)
   ├─► 4. Model: StudentRegistration.create() (Performs dynamic multi-subject setup & snapshotted rates)
   ├─► 5. Service: recordLedgerEntry() (Debits Accounts Receivable / Credits Tuition Revenue)
   ├─► 6. Service: HourLedgerService.recordHourEntry() (Credits Student Hour Balance)
   ├─► 7. Model: Payment.create() (Records Cash/K-NET initial payment)
   ├─► 8. Service: recordLedgerEntry() (Debits Cash / Credits Accounts Receivable)
   └─► 9. Loop: PaymentAllocation.create() (Chronologically distributes payment across created packages)
   │
   ▼
[Recalculation] studentBalance.service.js -> recalculateStudentBalances()
   │   (Re-computes totals, low-hour warnings, and payments status chronologically)
   ▼
[Response] HTTP 201 Created
```

---

## 2. Discovered Issues & Resolution Details

The forensic E2E audit analyzed every step of this journey and resolved several minor mismatches:

### Issue 1: Missing Fields and Schema Mismatch in Frontend Validation Schema
*   **Symptom:** Submitting the form with multiple registrations or initial payments had fields stripped or blocked during client-side validation.
*   **Root Cause:** The frontend `studentSchema.js` was a basic schema that only validated personal fields, and lacked definitions for the newly added optional registration fields (`subject`, `purchasedHours`, `pricePerHour`), payment parameters (`initialPaidAmount`, `paymentMethod`, `isInstallment`, `installments`), and the unified phone number field (`unifiedPhone`).
*   **Resolution:** Modified `edu-core-web/src/features/students/validations/studentSchema.js` to include complete validation and type mappings for all optional registration, payment, and multi-registration properties, keeping it 100% in sync with the backend.
*   **Impact:** Safe client-side schema validation that matches the database expectations, eliminating validation dropouts.

### Issue 2: Partial Payment Allocation during Multi-Registration Setup
*   **Symptom:** When a user registered a student for multiple subjects in a single form (e.g., Arabic and Physics) and made a single lump-sum initial payment (e.g., 100 KWD), the backend only allocated the payment to the first registration in the list, leaving the remaining registrations in an unpaid state despite the payment being sufficient to cover them.
*   **Root Cause:** `student.controller.js`'s `createStudent` had a hardcoded allocation that only looked at the first registration (`registration`) and the initial payment (`payment`), allocating `Math.min(payment.amount, registration.totalAmount)` and leaving the rest of the payment unallocated.
*   **Resolution:** Enhanced step 4 in `createStudent` to loop chronologically over all created academic registrations (`createdRegistrations`) and dynamically deduct allocated amounts from `remainingPaymentAmount` until the payment is fully exhausted.
*   **Impact:** Correct allocation of student payments across all registered subjects, ensuring accurate balance and dues calculations.

---

## 3. Financial & Operational Verification

1.  **Double-Entry General Ledger:** Confirmed that `recordLedgerEntry()` is executed atomically within the MongoDB transactional session. Every package purchase correctly records balanced Debits and Credits, and Cash collections are similarly balanced without double-counting.
2.  **Hour Ledger:** Confirmed that Hour transactions (`PURCHASE` and `REFUND`) are stored as chronological, immutable journal entries, perfectly calculating `remainingHours` upon recalculation.
3.  **Guardian Matching:** Verified that parent profiles match existing phone numbers in `Guardian` collection without duplicate registrations, maintaining clean sibling relationships.

---

## 4. Final Validation Confirmation

The system is now fully aligned and end-to-end integrated. The **All-in-One Student Registration** works seamlessly from user entry to double-entry general ledger. All integration and unit tests are passing successfully.
