# Financial Domain Audit Report (Alpha Institute / Edu Center ERP)

Prepared by: Jules, Software Engineer
Date: October 2023

---

## Executive Summary

As requested, a complete financial domain audit has been performed across the entire project repository (both the `edu-core-api` backend and `edu-core-web` frontend). The goal of this audit is to make the financial system mathematically correct, internally consistent, and production-ready for the Kuwaiti Dinar (KWD) standard of 3 decimal places (fils).

Several critical inconsistencies, logic divergences, and mocked/unimplemented workflows have been identified. This report documents each issue, explains why it is mathematically or business-wise incorrect, details the proposed fix, and outlines any migration or compatibility impacts.

---

## Detailed Findings & Proposed Fixes

### 1. Inconsistent Numeric Input Steps (Frontend Forms)

*   **Location:**
    *   `edu-core-web/src/features/payments/components/PaymentFormDialog.jsx`
    *   `edu-core-web/src/features/payments/components/TransactionFormDialog.jsx`
    *   `edu-core-web/src/features/students/components/RegistrationFormDialog.jsx`
    *   `edu-core-web/src/features/students/components/StudentFormDialog.jsx`
    *   `edu-core-web/src/features/scheduling/components/LessonFormDialog.jsx`
    *   `edu-core-web/src/features/teachers/components/TeacherFormDialog.jsx`
    *   `edu-core-web/src/features/salaries/components/SalaryFormDialog.jsx` (specifically `hourlyRate`, `transportationAllowance`, `bonuses`, `deductions`)
    *   `edu-core-web/src/features/settings/pages/SettingsPage.jsx` (specifically `carDeduction` and the hourly rates table for different grades)
*   **Inconsistency:** These monetary fields are configured with hardcoded `step` attributes like `step="0.5"`, `step="0.1"`, or completely miss the `step` attribute (which defaults to integer values `step="1"`).
*   **Why it is incorrect:** Kuwaiti Dinar (KWD) is a 3-decimal place currency (1 KWD = 1000 fils). The minimum unit is 1 fils (`0.001` KWD). A step value like `0.5` restricts inputs to multiples of 500 fils (e.g. `10.5`, `11.0`), preventing users from entering common amounts like `12.250` KD, `3.150` KD, etc. Missing `step` attributes prevent decimals entirely. Submitting fractional values triggers browser-native HTML validation failures, blocking form submission.
*   **Proposed Fix:** Standardize all financial/monetary input fields representing KWD across all components to use `step="0.001"`. Keep hours worked as `step="0.1"` or `step="0.5"`.
*   **Migration/Compatibility Impact:** None. All backend values are parsed using `toFils` which scales decimal numbers to integer minor units safely. This merely lifts artificial restrictions in the UI.

---

### 2. Hardcoded Transportation Deduction Rate in Payroll Recalculation

*   **Location:** `edu-core-api/src/modules/payroll/payroll.service.js` (line 62)
*   **Inconsistency:** The transportation deduction rate applied to teachers using the institute car is hardcoded:
    ```javascript
    const TRANSPORT_RATE = toFils(0.5); // Example constant
    ```
*   **Why it is incorrect:** The transportation deduction rate is a dynamic configuration value managed via `SettingsPage.jsx` and stored as `financialRules.transportationDeductionRate` in `TenantSettings`. Both `TeacherCalculationService.js` and `FinancialCalculationService.js` correctly fetch this rate dynamically using `SettingsService.getTransportationDeductionRate(tenantId)`.
    If an admin updates the deduction rate in settings (e.g. to `1.000` KWD), the automated monthly payroll service will continue to subtract `0.500` KWD, creating a discrepancy between real-time balances, teacher metrics, and monthly payroll records.
*   **Proposed Fix:** Update `payroll.service.js` to retrieve the dynamic rate from the settings:
    ```javascript
    const TRANSPORT_RATE = await SettingsService.getTransportationDeductionRate(teacher.tenantId);
    ```
*   **Migration/Compatibility Impact:** None. It ensures that any recalculation of payroll records aligns perfectly with the active settings for that tenant.

---

### 3. Mocked/Fake Payouts in Teacher Settlement Workflow

*   **Location:** `edu-core-web/src/features/teachers/pages/TeacherSettlementPage.jsx`
*   **Inconsistency:** The "Confirm Salary Payment & Settlement" button is mocked on the frontend:
    ```javascript
    const payMutation = useMutation({
      mutationFn: async (amount) => {
        return { success: true };
      },
      ...
    ```
*   **Why it is incorrect:** This is an operability gap. Clicking the button pops an alert and assumes the payout is completed, but NO backend request is sent. The teacher's ledger remains unpaid, and their remaining balance remains unchanged in the database.
*   **Proposed Fix:** Integrate the mutation with the existing `transactionApi.createTransaction` endpoint to record a real `TEACHER_PAYMENT` transaction in the ledger.
    ```javascript
    mutationFn: async (amount) => {
      return transactionApi.createTransaction({
        type: 'TEACHER_PAYMENT',
        teacherId: selectedTeacherId,
        name: `${teacher.userId?.firstName} ${teacher.userId?.lastName}`,
        amount: amount, // Standard KWD decimal amount
        paymentMethod: 'CASH',
        notes: `تسوية مستحقات المعلم عبر صفحة التسويات`,
        date: new Date().toISOString().substring(0, 10)
      });
    }
    ```
    On success, this will automatically register a ledger entry, decrease the teacher's pending balance to 0, write to the audit trail, and recalculate the institute's running balance chronologically!
*   **Migration/Compatibility Impact:** High positive impact. Fully closes the loop of teacher settlement payouts in the financial system.

---

### 4. Floating-Point Calculation and NaN Vulnerability in Manual Salary Forms

*   **Location:** `edu-core-web/src/features/salaries/components/SalaryFormDialog.jsx`
*   **Inconsistency:** The dynamic calculations for the manual salary slip are sensitive to empty string inputs:
    ```javascript
    const calc = parseFloat(hours) * parseFloat(rate) + parseFloat(bonuses) + parseFloat(transport) - parseFloat(deductions);
    ```
*   **Why it is incorrect:** If any of these fields are cleared or left empty during typing, `parseFloat()` returns `NaN`. This propagates, turning the `totalSalary` into `NaN`. When the form is submitted, a `NaN` value is processed or rejected by the backend.
*   **Proposed Fix:** Implement a defensive parsing helper in the React `useEffect` to safely convert invalid numbers/empty strings to `0`:
    ```javascript
    const parseAmount = (val) => {
      const p = parseFloat(val);
      return isNaN(p) ? 0 : p;
    };
    const calc = parseAmount(hours) * parseAmount(rate) + parseAmount(bonuses) + parseAmount(transport) - parseAmount(deductions);
    ```
*   **Migration/Compatibility Impact:** None. Prevents form crashes and guarantees clean numeric submissions.

---

### 5. Hidden Overpayment Credits (Outstanding Balance Truncation)

*   **Location:** `edu-core-api/src/modules/students/StudentCalculationService.js` (line 172)
*   **Inconsistency:** The student's outstanding balance is truncated to zero:
    ```javascript
    const outstandingBalance = Math.max(0, totalRegistrationsAmount - totalPaidPayments);
    ```
*   **Why it is incorrect:** If a parent/student overpays (e.g. pays in advance), their net outstanding balance should reflect as negative (e.g. `-20.000` KWD), indicating a financial credit. Truncating to `0` hides this credit, making advance payment tracking impossible.
*   **Proposed Fix:** Remove `Math.max(0, ...)` to allow actual credit/negative balances, or introduce a clear, mathematically sound balance calculation:
    ```javascript
    const outstandingBalance = totalRegistrationsAmount - totalPaidPayments;
    ```
    This naturally aligns with standard accounting principles and displays correctly on the student dashboard.
*   **Migration/Compatibility Impact:** Low. The client side already supports formatting and displaying negative numbers gracefully, so negative balances will display correctly as negative outstanding balances.

---

### 6. Dynamic Shared Calculation Unification

*   **Audit Check:** Are calculations duplicated?
*   **Finding:**
    *   The `toFils` and `toKWD` helpers are cleanly shared and exported in both `shared/utils/money.js` (frontend) and `shared/utils/money.js` (backend).
    *   The backend's `recalculateRunningBalances` was duplicated in two different files: `edu-core-api/src/modules/ledger/FinancialCalculationService.js` and `edu-core-api/src/modules/ledger/ledger.service.js`.
*   **Why it is incorrect:** Duplicated code increases maintenance overhead and leads to divergence when logic changes.
*   **Proposed Fix:** Import `recalculateRunningBalances` in `ledger.service.js` directly from `FinancialCalculationService.js` (or vice-versa) to eliminate the duplicate definition.

---

## Action Plan for Implementation

1.  **Backend Fixes:**
    *   Remove duplicate `recalculateRunningBalances` from `ledger.service.js` and reference the version from `FinancialCalculationService.js`.
    *   Update `payroll.service.js` to fetch `TRANSPORT_RATE` from `SettingsService.getTransportationDeductionRate`.
    *   Update `StudentCalculationService.js` to calculate outstanding balance without artificial truncation, supporting credit/negative balances cleanly.
2.  **Frontend Fixes:**
    *   Update all financial inputs to `step="0.001"` in `PaymentFormDialog.jsx`, `TransactionFormDialog.jsx`, `RegistrationFormDialog.jsx`, `StudentFormDialog.jsx`, `LessonFormDialog.jsx`, `TeacherFormDialog.jsx`, `SalaryFormDialog.jsx`, and `SettingsPage.jsx`.
    *   Add defensive NaN parsing to `SalaryFormDialog.jsx`.
    *   Implement real `transactionApi` integration in `TeacherSettlementPage.jsx` so payouts are persisted in the ledger database.
3.  **Verification:**
    *   Verify code changes manually or using automated tests to ensure no regressions occur.
