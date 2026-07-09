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

## 2. Database Setup (MongoDB Atlas)

Since you are using Hostinger Cloud Hosting, **MongoDB Atlas** is the recommended solution.

1.  **Create an Account**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  **Create a Cluster**: Use the "Shared" (Free) tier or a dedicated tier.
3.  **Network Access**:
    *   Go to "Network Access" in Atlas.
    *   Add the IP address of your Hostinger server (found in hPanel -> Server IP).
    *   *Optional for development:* Add `0.0.0.0/0` (allow all), but remove it for production.
4.  **Database User**: Create a user with `readWriteAnyDatabase` or specific permissions for your database.
5.  **Get Connection String**:
    *   Click "Connect" -> "Drivers" -> "Node.js".
    *   Copy the URI (e.g., `mongodb+srv://<username>:<password>@cluster.mongodb.net/edu_core?retryWrites=true&w=majority`).

---

## 3. Hosting the Backend (Hostinger Cloud Hosting)

### Step 1: Prepare the API
1.  Navigate to the `edu-core-api` directory.
2.  Ensure `package.json` has `"type": "module"`.
3.  Zip the contents of the `edu-core-api` folder (excluding `node_modules`).

### Step 2: Hostinger hPanel Configuration
1.  Log in to **Hostinger hPanel**.
2.  Go to **Websites** -> **Manage** for `rakaninstitutekw.com`.
3.  Locate the **Node.js** section (under Advanced).
4.  **Create Application**:
    *   **App Name**: `edu-core-api`.
    *   **App URL**: `rakaninstitutekw.com/api` (If allowed by your plan) or use a subdomain like `api.rakaninstitutekw.com`.
    *   **App Root**: `/public_html/api` (or preferred path).
    *   **Startup File**: `src/server.js`.
5.  **Upload Files**: Use the **File Manager** to upload and extract your zip file into the **App Root**.

### Step 3: Environment Variables
In the Hostinger Node.js configuration or via a `.env` file in the App Root:
```env
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_ACCESS_SECRET=your_super_secret_at_least_32_chars
JWT_REFRESH_SECRET=your_other_super_secret_at_least_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
# Supports multiple origins separated by commas
CORS_ORIGIN=https://rakaninstitutekw.com,https://app.rakaninstitutekw.com
# Domain for refresh token cookie (shared between api and app subdomains)
COOKIE_DOMAIN=rakaninstitutekw.com
```

### Step 4: Install Dependencies & Start
1.  In the Node.js hPanel section, click **"Run npm install"**.
2.  Click **"Restart"** or **"Start"** the application.

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
    *   `VITE_API_BASE_URL`: `https://rakaninstitutekw.com/api`
7.  **Domain Setup**:
    *   In Vercel Project Settings -> **Domains**.
    *   Add `app.rakaninstitutekw.com`.
    *   Follow the DNS instructions to point the CNAME to Vercel.
8.  Click **Deploy**.

---

## 5. Summary of Domains
*   **Frontend**: [https://app.rakaninstitutekw.com](https://app.rakaninstitutekw.com)
*   **Backend API**: [https://rakaninstitutekw.com/api](https://rakaninstitutekw.com/api)
*   **Database**: MongoDB Atlas (Cloud)

---

## 6. Backup & Data Security

### Database Backups (MongoDB Atlas)
1.  **Automatic Backups**: Atlas provides built-in snapshots. Go to **Deployment -> Backup** in the Atlas portal to configure retention policies.
2.  **Manual Export**: Use `mongoexport` or the **Database Tools** to download a JSON/CSV copy of your data.

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
