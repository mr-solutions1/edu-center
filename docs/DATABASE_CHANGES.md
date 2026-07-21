# Database Schema Changes & Indexes
**Mongoose Model Updates, Indexes & Multi-Tenant Fields**

This document specifies the database schema modifications, unique compound index configurations, and structural fields added to support lesson locking, FIFO payment allocations, and PM2 distributed locks.

---

## 1. Schema Modifications Ledger

### **A. Lesson Model (`lesson.model.js`)**
Added fields to support snapshot rate routing, lesson-locking, and chronological tracking:
*   `registrationId`: `mongoose.Schema.Types.ObjectId` (references `StudentRegistration`, default `null`). Links the lesson to its parenting contract.
*   `subject`: `String` (default `null`). Caches the lesson's subject.
*   `payrollRecordId`: `mongoose.Schema.Types.ObjectId` (references `PayrollRecord`, default `null`). Locks the lesson when included in a finalized payroll.

### **B. StudentRegistration Model (`registration.model.js`)**
*   `paidAmount`: `Number` (in fils, default `0`). Incremented dynamically by the FIFO Payment Allocation Engine.

---

## 2. New Database Models

### **A. PaymentAllocation Model (`paymentAllocation.model.js`)**
Tracks chronological cash receipts allocations down to individual student packages:
```javascript
const paymentAllocationSchema = new mongoose.Schema({
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentRegistration', required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  amount: { type: Number, required: true, min: 0 }, // in fils
  allocatedAt: { type: Date, default: Date.now },
});
```

### **B. BackgroundJobLog Model (`backgroundJobLog.model.js`)**
Manages PM2 cluster workers distributed lock-claims per calendar date:
```javascript
const backgroundJobLogSchema = new mongoose.Schema({
  jobName: { type: String, required: true },
  executionDate: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, enum: ['RUNNING', 'SUCCESS', 'FAILED'], required: true, default: 'RUNNING' },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  workerId: { type: String, default: null },
});
```

---

## 3. Unique Compound Indexes Configurations

These high-performance indexes ensure transactional reliability, optimize multi-tenant query speeds, and enforce locking behaviors:

1.  **Distributed Lock Claim Index (`backgroundJobLog.model.js`):**
    ```javascript
    backgroundJobLogSchema.index({ jobName: 1, executionDate: 1 }, { unique: true });
    ```
    *Enforces exactly-once execution per day across clustered PM2 workers.*
2.  **Payment Allocation Tracing Index (`paymentAllocation.model.js`):**
    ```javascript
    paymentAllocationSchema.index({ paymentId: 1, registrationId: 1 });
    paymentAllocationSchema.index({ studentId: 1, allocatedAt: 1 });
    ```
3.  **Financial Ledger Compound Scoping Index (`ledger.model.js`):**
    ```javascript
    financialLedgerSchema.index({ tenantId: 1, transactionDate: -1, direction: 1 });
    financialLedgerSchema.index({ tenantId: 1, type: 1, direction: 1 });
    ```
