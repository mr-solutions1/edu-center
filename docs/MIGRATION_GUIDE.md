# System Migration, Schema Update & Rollback Guidelines
**Production Readiness, Schema Updates & Rollback Protocols**

This document specifies the database migrations, historical data transitions, pre-deployment checks, and rollback plans required to safely deploy the new financial and lock engine of the **Edu Center ERP** platform.

---

## 1. Database Schema Migration Plan

Deploying the revised financial engine requires adding several default fields to historical schemas without causing validation or index crashes:

### **A. StudentRegistration Paid Amount**
*   **Target Field:** `paidAmount` (defaults to 0, represented in fils).
*   **Data Conversion Strategy:** Historical student registration records must have their `paidAmount` set to 0 initially.
*   **Migration Script:**
    ```javascript
    await db.collection('studentregistrations').updateMany(
      { paidAmount: { $exists: false } },
      { $set: { paidAmount: 0 } }
    );
    ```

### **B. Lesson Registration & Subject Links**
*   **Target Fields:** `registrationId` (references `StudentRegistration`, default `null`) and `subject` (default `null`).
*   **Data Conversion Strategy:** Historical scheduled and completed lessons can be linked retrospectively to matching active registrations based on `studentId` and `subject` (if defined), otherwise set to `null` to represent legacy entries safely.

---

## 2. Pre-Deployment Integrity Checks

Prior to pushing the backend update to the production environment, the technical administrator must confirm the following checklist:

1.  **ACID Transaction Support:** Verify that the target MongoDB replica set or cluster is configured correctly and supports transactional sessions (`withTransaction`).
2.  **Seeded Chart of Accounts:** Ensure standard dynamic accounts `1010`, `1210`, `2010`, `4010`, `4020`, `4030`, and `5010` are present or can be seeded automatically on startup.
3.  **Bcrypt Timing Attacks:** Verify that server bcrypt operations run with standard workload loops (e.g. `saltRounds = 12`) to preserve timing defenses.
4.  **Database Dump:** Execute a complete database backup of the production dataset prior to executing migrations:
    `mongodump --uri="mongodb://localhost:27017/prod_db" --out=/backups/pre_financial_engine_update`

---

## 3. Rollback Plan

If unexpected crashes, performance lags, or data validation failures are encountered in the production environment:

1.  **Revert Backend Commit:** Revert the backend Express API server commit back to the audited baseline (`884ddfa`).
2.  **Revert Frontend Commit:** Revert the React frontend build back to the audited baseline commit.
3.  **Restore DB Backup:** If data corruption occurred, restore the pre-financial update backup:
    `mongorestore --uri="mongodb://localhost:27017/prod_db" --drop /backups/pre_financial_engine_update`
4.  **Audit Logs Check:** Consult PM2 error logs and JSON Winston logs (`logs/error.log`) to diagnose the root cause before retrying.
