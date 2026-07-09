# Edu-Core API

## Setup

1. `npm install`
2. `cp .env.example .env` and fill values.
3. `npm run create-admin` to create your first admin user.
4. `npm run seed` to populate with Arabic demo data.
5. `npm run dev` to start server.

## Features
- RBAC (Admin, Accountant, Receptionist, Teacher)
- PDF Report Generation (Arabic Support)
- Automated Notifications (Email/WhatsApp logic)
- File Uploads (Multer)
- MongoDB Transactions support

## Directory Structure
- `src/modules`: Domain-driven modules (Auth, Students, Teachers, etc.)
- `src/shared`: Common middlewares, services, and utils.
- `src/config`: Environment and DB configuration.
