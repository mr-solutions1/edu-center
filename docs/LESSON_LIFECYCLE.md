# Lesson Lifecycle & Attendance Specification
**Scheduling, Conflict Detection Engine & Hour Ledgers**

This document specifies the database schemas, scheduling mechanics, conflict detection algorithms, and reactive hour consumption triggers governing lesson and student attendance lifecycles in the **Edu Center ERP** platform.

---

## 1. Lesson Lifecycle States

Lessons transition through clear operational states, which trigger reactive updates on hour ledgers:

```mermaid
stateDiagram-m2
    [*] --> SCHEDULED : Created by staff
    SCHEDULED --> COMPLETED : Attendance marked "Present"
    SCHEDULED --> CANCELLED : Lesson cancelled
    SCHEDULED --> NO_SHOW : Student absent (No-show)
    COMPLETED --> SCHEDULED : Status reverted (Clears hours)
```

---

## 2. Real-Time Conflict Detection Engine

To prevent double-booking of teachers and students across multiple branches and virtual sessions, the system checks for scheduling overlaps before saving lessons (`lesson.service.js`'s `checkConflict()`):

```javascript
const query = {
  lessonDate: new Date(lessonDate),
  _id: { $ne: excludeLessonId },
  status: { $ne: 'CANCELLED' },
  $or: [
    // Starts during another lesson
    { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
    // Ends during another lesson
    { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
    // Wraps around another lesson
    { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
  ],
};
```
If any overlapping document matches the query for the target `teacherId` or `studentId`, the scheduling action is aborted with a `ConflictError`.

---

## 3. Hour Consumption Triggers & Hour Ledger Sync

When a lesson is marked **`COMPLETED`**:
1.  The system identifies the student's earliest active `StudentRegistration` package.
2.  If an active package is found, the system records an append-only `HourTransaction` entry of type **`CONSUMED`** containing negative hours matching the lesson's duration (`-lesson.durationHours`).
3.  Calculates and updates the registration status: if remaining hours fall to zero, the registration status is promoted to `COMPLETED`.

When a lesson is transitioned **away from `COMPLETED`** (e.g. reverted to `SCHEDULED` or `CANCELLED`):
1.  The system queries and deletes the corresponding `CONSUMED` transaction from `HourTransaction`.
2.  Reactive recalculations are triggered: the registration's `consumedHours` is decremented and status is demoted back to `ACTIVE` if remaining hours are restored.

This append-only architecture ensures student hour balances are completely derivable, verifiable, and audit-safe.
