# 13 — Roadmap

Sequenced by dependency (from `07_MIGRATION_PLAN.md`).

```
Phase A — Foundation (COMPLETED ✅)
  M1 Project Foundation ............ ✅
  M2 Authentication ................ ✅
  M3 Shared UI System ............... ✅
       ↓
Phase B — Core Domain (COMPLETED ✅)
  M5 Students Module ................ ✅
  M6 Teachers Module ................ ✅
       ↓
Phase C — Operational Core (COMPLETED ✅)
  M7 Scheduling (Lessons) ........... ✅
       ↓ (parallel from here)
  M8 Payments ........................ ✅
  M9 Payroll .......................... ✅
  M10 Salaries ........................ ✅
       ↓
Phase D — Insight & Admin Layer (COMPLETED ✅)
  M4 Admin Dashboard .................. ✅
  M11 Reports .......................... ✅
  M13 Settings .......................... ✅
       ↓
Phase E — Extended Capability (COMPLETED ✅)
  M12 Notifications ..................... ✅
       ↓
Phase F — Go-Live (COMPLETED ✅)
  M14 Deployment ......................... ✅ (Vercel + Hostinger VPS + Local MongoDB)
  M15 Testing ............................ ✅
```

## Status Update (2026-07-06)

- **Foundation & Core Domain**: Successfully implemented and branded as "Rakan Academy".
- **Operational Core**: Scheduling, Payments, and Payroll systems are functional with real-time conflict detection and automated commission calculations.
- **Financial Accuracy**: Migrated all monetary values to integer minor units (fils) for production-grade precision.
- **Attendance Module**: Implemented a dedicated Attendance collection for better tracking and history.
- **Admin Layer**: Full dashboard with KPIs, role-specific views (Admin vs Teacher), and deep-reporting aggregation pipelines.
- **Extended Capability**: Production-ready notification architecture with Email and WhatsApp (Twilio) support.
- **Authentication**: Hardened security with exponential backoff for lockouts and active session management.
- **Testing**: Backfilled unit tests and prepared Playwright E2E suite.
- **Deployment**: The system is ready for final production cutover.
