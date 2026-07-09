# Dashboard Feature

## Purpose
The Dashboard serves as the primary entry point for all users, providing a high-level overview of the system's state through Key Performance Indicators (KPIs) and recent activity.

## Architecture
- **Data Source:** `GET /api/v1/reports/overview`
- **Role Scoping:**
  - `ADMIN`: Full access to students, teachers, lessons, and revenue metrics.
  - `ACCOUNTANT`: Access to financial metrics and student/teacher counts.
  - `RECEPTIONIST`: Access to student and lesson counts only.
  - `TEACHER`: Professional dashboard with personal schedule and performance stats.

## Milestone 4 Status (Placeholder)
This implementation is intentionally minimal as it depends on data from future milestones.

### Pending Integrations:
1. **Lessons Data (Milestone 7):** The "Upcoming Schedule" widget needs to be wired to the lessons collection once the scheduling logic exists.
2. **Payroll Data:** Revenue metrics use real-time aggregation from completed lessons.
3. **Activity Logs (Milestone 13):** The "Recent Activity" feed needs to be wired to the `activitylogs` collection.

## Improvements for Milestone 11
- Implement native MongoDB aggregation pipelines for the overview stats.
- Add date-range filtering (current month vs previous month).
- Add subject-based and educational-level breakdowns.
