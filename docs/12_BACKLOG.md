# 12 — Backlog

Grouped by milestone (see `07_MIGRATION_PLAN.md` for milestone definitions). Within each milestone, ordered by dependency, not necessarily priority.

## Milestone 1 — Project Foundation
- [x] Scaffold `edu-core-api` (Express, folder structure per `10_FOLDER_STRUCTURE.md`)
- [x] Scaffold `edu-core-web` (Vite + React 19 + React Router)
- [x] ESLint + Prettier config (both repos), pre-commit hook
- [x] Zod-validated env loader (backend)
- [x] Mongo connection module with replica-set readiness check
- [x] Base Express app: Helmet, CORS, compression, request logger, error handler middleware wired

## Milestone 2 — Authentication
- [x] `User` and `RefreshToken` models
- [x] `tokenService` (sign/verify access+refresh, rotation, family tracking)
- [x] Login/refresh/logout/logout-all endpoints
- [x] `authenticate`/`authorize` middlewares
- [x] Frontend: `AuthProvider`, login page, protected route wrapper, axios interceptor for silent refresh

## Milestone 3 — Shared UI System
- [x] Install/theme shadcn/ui primitives, RTL + dark-mode CSS variables
- [x] `DataTable`, `SearchFilterBar`, `StatusBadge`, `FormDialog`, `ConfirmDialog`, `StatCard`, `EmptyState`, `ErrorState`, `PageHeader`, `MoneyDisplay`
- [x] `AppShell` (Sidebar + Navbar), role-based nav items

## Milestone 4 — Admin Dashboard
- [x] `reports` overview aggregation endpoint
- [x] Dashboard page: KPI `StatCard`s, recent-activity feed

## Milestone 5 — Students Module
- [x] `Student` model + atomic ID counter
- [x] Repository/service/controller/routes, decision implemented: optional `userId`
- [x] Zod validation schema (ported field rules + Arabic messages)
- [x] Frontend: list page, create/edit `FormDialog`, search/filter

## Milestone 6 — Teachers Module
- [x] `Teacher` model with structured `availability` sub-document
- [x] File upload handling for CV/certificates
- [x] Frontend: list/detail/create/edit

## Milestone 7 — Scheduling (Lessons)
- [x] `Lesson` model + indexes
- [x] `commissionCalculator` shared pure function
- [x] Conflict-detection service (overlap-based)
- [x] Transactional create (lesson + payroll transaction)
- [x] Frontend: `WeekScheduleGrid`, booking dialog, attendance status update flow

## Milestone 8 — Payments
- [x] `Payment` model (with `PARTIALLY_PAID` in enum)
- [x] CRUD endpoints, linkage to lessons
- [x] Frontend: list/create/edit, status filter

## Milestone 9 — Payroll
- [x] `PayrollRecord`/`PayrollTransaction` models
- [x] `payroll.service.recalculateForTeacher` (transactional)
- [x] Frontend: payroll list, generate/recalculate action, mark-paid

## Milestone 10 — Salaries
- [x] `TeacherSalary` model
- [x] Product decision resolved: `compensationType` field on `Teacher`
- [x] Frontend: salary entry/calculation UI

## Milestone 11 — Reports
- [x] Aggregation pipelines: by_teacher, by_subject, by_level
- [x] Frontend: report views, date-range picker, (stretch) CSV export

## Milestone 12 — Notifications (new capability)
- [ ] Hook point for payment-due and lesson-reminder notifications

## Milestone 13 — Settings
- [x] Profile management, password change (bumps `tokenVersion`)
- [x] Role/permission management UI (ADMIN only)

## Milestone 14 — Deployment
- [x] Hostinger Cloud Hosting provisioning per updated `DEPLOYMENT_GUIDE.md`
- [x] Vercel project setup (app.rakaninstitutekw.com)
- [x] MongoDB Atlas setup & backup configuration

## Milestone 15 — Testing
- [x] Unit tests for all `shared/services` (especially `commissionCalculator`, conflict detection)
- [ ] Integration tests per module
- [ ] E2E happy-path per feature (Playwright)
