# Edu-Core — Deployment & System Guide

## 1. About the System
**Edu-Core** is a production-grade Educational Management Platform (ERP) designed to streamline the operations of educational institutes.

### Key Capabilities:
*   **Student & Teacher Management**: Comprehensive tracking and structured availability.
*   **Smart Scheduling**: Conflict detection for lesson booking.
*   **Financial Tracking**: Student payments and automated teacher payroll.
*   **Advanced Reporting**: Native MongoDB aggregation pipelines for deep insights.
*   **Security First**: RBAC, JWT Access/Refresh token rotation, and audit logging.

---

## 2. Database Setup (Local MongoDB on VPS)

Since you are using a Hostinger VPS server, the database is hosted locally.

1.  **Install MongoDB**: Ensure MongoDB Community Edition is installed on your VPS.
2.  **Configuration**: By default, MongoDB listens on `127.0.0.1:27017`.
3.  **Authentication**: It is recommended to enable authentication and create a dedicated user for the application.
4.  **Connection String**: The connection string will be `mongodb://127.0.0.1:27017/edu_core` (or including credentials if enabled).

---

## 3. Hosting the Backend (Hostinger VPS)

### Step 1: Prepare the Server
1.  Ensure **Node.js (v22 LTS)** is installed on the VPS.
2.  Use a process manager like **PM2** to keep the application running.
3.  Setup a reverse proxy like **Nginx** to handle SSL (Let's Encrypt) and route traffic to the Node.js application (default port 5000).

### Step 2: Deployment
1.  Clone the repository or upload the files to the VPS.
2.  Navigate to `edu-core-api`.
3.  Install dependencies: `npm install`.

### Step 3: Environment Variables
Create a `.env` file in the `edu-core-api` directory:
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/edu_core
JWT_ACCESS_SECRET=your_super_secret_at_least_32_chars
JWT_REFRESH_SECRET=your_other_super_secret_at_least_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
# Supports multiple origins separated by commas
CORS_ORIGIN=https://rakan.flowship.site
# Domain for refresh token cookie (shared between api and app subdomains)
COOKIE_DOMAIN=.flowship.site
```

### Step 4: Start the Application
```bash
pm2 start src/server.js --name edu-core-api
```

---

## 4. Hosting the Frontend (Vercel)

1.  Push your code to a GitHub repository.
2.  Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3.  Import the repository.
4.  **Root Directory**: Set to `edu-core-web`.
5.  **Build Settings**:
    *   Framework Preset: **Vite**.
    *   Build Command: `npm run build`.
    *   Output Directory: `dist`.
6.  **Environment Variables**:
    *   `VITE_API_BASE_URL`: `https://rakan-api.flowship.site/api/v1`
7.  **Domain Setup**:
    *   In Vercel Project Settings -> **Domains**.
    *   Add `rakan.flowship.site`.
    *   Follow the DNS instructions to point the CNAME to Vercel.
8.  Click **Deploy**.

---

## 5. Summary of Domains
*   **Frontend**: [https://rakan.flowship.site](https://rakan.flowship.site)
*   **Backend API**: [https://rakan-api.flowship.site/api/v1](https://rakan-api.flowship.site/api/v1)
*   **Database**: Local MongoDB (VPS)

---

## 6. Backup & Data Security

### Database Backups (Local MongoDB)
1.  **Scheduled Backups**: Use `mongodump` with a cron job to create regular backups.
2.  **Off-site Storage**: Ensure backups are moved to a separate secure storage periodically.

### Environment Safety
*   **DO NOT** commit `.env` files to version control.
*   Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` every 6 months for enhanced security.

## 7. Node.js 22 & Performance Optimization

The system is fully optimized for **Node.js 22 LTS**.

*   **Immediate Startup**: The API is configured to call `listen()` immediately. Database and background job initialization happen asynchronously to prevent Hostinger's 3-second timeout from killing the process.
*   **Memory Management**: Node.js 22's V8 engine optimizations are leveraged. The `/health` endpoint monitors `rss` and `heapUsed` to ensure stability.
*   **Security Headers**: Production mode automatically enables strict CORS and `trust proxy` for secure header propagation through Hostinger's load balancers.

## 8. Maintenance & Logs
*   **API Logs**: Access via Hostinger hPanel -> **Runtime Logs**. This captures all `stdout` and `stderr` output from Winston.
*   **Database**: Use the MongoDB Atlas Dashboard to monitor connection pooling and slow queries.
*   **Frontend**: All UI-related logs and performance metrics are available in the Vercel Dashboard.
