# API Contract Changes & Specifications
**Backend Response Shapes & Sequential Gating Fields**

This document specifies the revised backend API endpoints, payload validation structures, and modified response fields introduced to support sequential sign-offs, backend-driven authorization, and registration cancellations.

---

## 1. Modified Endpoints Summary

### **A. GET `/api/v1/payroll/:id/approval-details`**
Retrieves active signature progression logs and evaluates signature authorization dynamically.
*   **Request Headers:** Includes `Authorization: Bearer <JWT_ACCESS_TOKEN>`
*   **Response Payload (`success: true`):**
    ```json
    {
      "success": true,
      "data": {
        "request": {
          "_id": "6a5f219413b0eebbd252d4e0",
          "workflowType": "PAYROLL_APPROVAL",
          "referenceId": "6a5f219413b0eebbd252d4cc",
          "currentLevel": 1,
          "status": "PENDING",
          "signatures": [
            {
              "userId": "6a5f21874adfb56d0e472f36",
              "role": "ACCOUNTANT",
              "signedAt": "2026-07-21T07:36:52.836Z"
            }
          ]
        },
        "levels": ["ACCOUNTANT", "ADMIN"],
        "isAuthorizedToSign": true
      }
    }
    ```
    -   *isAuthorizedToSign:* Boolean calculated dynamically by evaluating the active signature level required against the caller's JWT role.

---

### **B. PATCH `/api/v1/payroll/:id/approve`**
Signs off the current approval level of a payroll record.
*   **Payload Required:** None (Role is parsed from authenticated user session securely).
*   **Gating Rules:** If Accountant, signs level 0. If Admin, invokes fast-track signature block, promoting status directly to `APPROVED` and unlocking payouts.

---

### **C. DELETE `/api/v1/students/:id/registrations/:regId`**
Cancels student registrations and processes auditable reversing ledger postings.
*   **Validation Rules:**
    -   If `consumedHours > 0` or completed lessons exist, returns `success: false` with validation code `REGISTRATION_CANCELLATION_BLOCKED` and clear Arabic user alerts.
*   **Response Payload (`success: true`):** Returns status `204 No Content` upon successful reversal and soft-deletion.

---

## 2. API Error Codes and Standard Formats

All Express error payloads conform strictly to the standardized enterprise layout:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "لا يمكن حذف أو إلغاء التسجيل بعد بدء استهلاك الحصص وحضور الطالب",
  "details": {
    "field": "consumedHours",
    "value": 1.5
  },
  "correlationId": "5886725d-ab2e-42d1-9099-f0c041420025",
  "timestamp": "2026-07-21T08:41:15.421Z",
  "retryable": false
}
```
This enables our frontend localized error parser hook (`useFormErrorHandler`) to display elegant alerts automatically.
