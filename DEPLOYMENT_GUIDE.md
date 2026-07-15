# FlowShip ERP — Enterprise Production Deployment & Hostinger VPS Setup Guide

This comprehensive guide describes how to deploy and configure the **FlowShip** system in the staging/alpha environment using **Vercel** for the React frontend, and a **Hostinger Ubuntu VPS** for the Node.js backend and local MongoDB database.

---

## 1. System Architecture & Staging Domain Summary

*   **Frontend (React/Vite)**: Hosted on **Vercel**
    *   **Domain**: [https://alpha.flowship.site](https://alpha.flowship.site)
*   **Backend (Node.js/Express)**: Hosted on **Hostinger VPS (Ubuntu LTS)**
    *   **Domain**: [https://alpha-api.flowship.site](https://alpha-api.flowship.site)
    *   **Port**: `5000` (reverse proxied via Nginx)
*   **Database (MongoDB)**: Local on Hostinger VPS
    *   **Configuration**: Single-Node Replica Set `rs0` (required for transactions)
    *   **Cookie Domain**: `.flowship.site` (supports secure, cross-subdomain session cookies)

---

## 2. Hostinger VPS Setup (Ubuntu LTS)

Follow these steps to configure your Hostinger Ubuntu VPS from scratch.

### Step 2.1: System Update & Firewall Configuration
1. SSH into your VPS:
   ```bash
   ssh root@<YOUR_VPS_IP>
   ```
2. Update the system package cache:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
3. Set up the firewall (UFW) to block unauthorized access, keeping only SSH, HTTP, and HTTPS open:
   ```bash
   sudo apt install ufw -y
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

### Step 2.2: Install Node.js v22 LTS & PM2
1. Install NodeSource repository for Node.js v22:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
2. Verify Node.js and NPM installations:
   ```bash
   node -v  # Should be v22.x.x
   npm -v   # Should be v10.x.x or higher
   ```
3. Install **PM2** globally to manage process lifecycles:
   ```bash
   sudo npm install -g pm2
   ```

### Step 2.3: Install & Configure MongoDB as a Single-Node Replica Set
The FlowShip application uses database transactions, which strictly require MongoDB Replica Sets enabled.

1. Import the public GPG key for MongoDB:
   ```bash
   curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
   ```
2. Add the MongoDB repository for Ubuntu LTS (adjust distribution name if using newer/older LTS):
   ```bash
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
   ```
3. Update packages and install MongoDB:
   ```bash
   sudo apt update
   sudo apt-get install -y mongodb-org
   ```
4. Configure MongoDB to enable the Replica Set. Edit `/etc/mongod.conf`:
   ```bash
   sudo nano /etc/mongod.conf
   ```
   Modify or add the `replication` block at the end:
   ```yaml
   replication:
     replSetName: "rs0"
   ```
   Ensure `net.bindIp` is set to `127.0.0.1` (never expose MongoDB publicly!):
   ```yaml
   net:
     port: 27017
     bindIp: 127.0.0.1
   ```
5. Enable and start the MongoDB service:
   ```bash
   sudo systemctl enable mongod
   sudo systemctl start mongod
   ```
6. Initialize the Replica Set using `mongosh`:
   ```bash
   mongosh --eval "rs.initiate({_id:'rs0', members:[{_id:0, host:'localhost:27017'}]})"
   ```
7. Verify that replica set is healthy:
   ```bash
   mongosh --eval "rs.status()"
   ```

### Step 2.4: Set Up Automatic Nightly Backups
We have prepared a production backup and rotation script located in `edu-core-api/scripts/backup-db.sh`.
1. Move the backup script to a system folder or execute it in-place.
2. Grant execution permissions:
   ```bash
   chmod +x /path/to/edu-core-api/scripts/backup-db.sh
   ```
3. Open the crontab editor for root to run backups automatically every night at 2:00 AM:
   ```bash
   sudo crontab -e
   ```
4. Add the following line at the end:
   ```text
   0 2 * * * /bin/bash /path/to/edu-core-api/scripts/backup-db.sh >> /var/log/mongodb-backup.log 2>&1
   ```
5. The backups will automatically accumulate in `/var/backups/mongodb/` with 14-day automatic rotation retention. You can modularly uncomment the S3/R2 upload section in the script to sync backups off-site.

---

## 3. Backend API Deployment

1. Clone your repository into `/var/www/flowship`:
   ```bash
   sudo mkdir -p /var/www/flowship
   sudo chown -R $USER:$USER /var/www/flowship
   git clone <YOUR_REPO_URL> /var/www/flowship
   ```
2. Navigate to the API folder:
   ```bash
   cd /var/www/flowship/edu-core-api
   ```
3. Install dependencies:
   ```bash
   npm install --omit=dev
   ```
4. Create the production `.env` file using the prepared template:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Make sure you fill out secure values:
   - `JWT_ACCESS_SECRET`: Use a strong 32+ character random secret.
   - `JWT_REFRESH_SECRET`: Use a separate strong 32+ character random secret.
   - `MONGO_URI`: Set to `mongodb://127.0.0.1:27017/edu_core?replicaSet=rs0`
   - `COOKIE_DOMAIN`: `.flowship.site`
   - `CORS_ORIGIN`: `https://alpha.flowship.site,https://flowship.site,https://app.flowship.site`

5. Start the backend in Cluster Mode using PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```
6. Setup PM2 to restart automatically on VPS reboot:
   ```bash
   pm2 startup
   ```
   *(Run the exact output command printed by the terminal to finalize the boot-hook)*
7. Save the current process list:
   ```bash
   pm2 save
   ```

---

## 4. Nginx Reverse Proxy & SSL Setup

Nginx is used as a reverse proxy, file upload buffer limit, and compression layer in front of our API.

1. Install Nginx:
   ```bash
   sudo apt install nginx -y
   ```
2. Create an Nginx server block for the API:
   ```bash
   sudo nano /etc/nginx/sites-available/alpha-api.flowship.site
   ```
3. Paste the following configuration (optimized with compression, SSL redirects, and body size overrides):
   ```nginx
   server {
       listen 80;
       server_name alpha-api.flowship.site;

       # Max upload body size matching the application (5MB)
       client_max_body_size 5M;

       # Compression configuration
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
       gzip_proxied any;
       gzip_min_length 1000;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
4. Enable the server block and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/alpha-api.flowship.site /etc/nginx/sites-enabled/
   sudo nginx -t  # Validate syntax
   sudo systemctl restart nginx
   ```

### Step 4.2: Install Certbot & Enable SSL (Let's Encrypt)
1. Install Certbot and the Nginx plugin:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. Request and install SSL certificates for your domain:
   ```bash
   sudo certbot --nginx -d alpha-api.flowship.site
   ```
   *(Follow the prompts to configure automatic HTTP to HTTPS redirection)*
3. Certbot automatically sets up a systemd cron job for automatic 90-day renewals. You can verify it works via:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## 5. Frontend Deployment (Vercel)

The React.js single-page application is prepared to run natively on **Vercel** with fully handled SPA redirects.

### Step 5.1: Create Vercel Project
1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Connect and import your GitHub repository.
3. Configure the following project parameters:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `edu-core-web`
   * **Build Settings**:
     * Build Command: `npm run build`
     * Output Directory: `dist`
4. **Environment Variables**:
   * Add `VITE_API_BASE_URL` with the value `https://alpha-api.flowship.site/api/v1`
5. Click **"Deploy"**.

### Step 5.2: Configure Custom Domain on Vercel
1. Go to your Vercel Project settings -> **Domains**.
2. Add `alpha.flowship.site`.
3. Follow the DNS instructions to add a CNAME record pointing to Vercel's edge network (`cname.vercel-dns.com`).

---

## 6. PM2 Management Cheat Sheet

Manage your backend cluster processes with these commands:

*   **View active processes**: `pm2 list`
*   **View real-time performance**: `pm2 monit`
*   **View application logs**: `pm2 logs`
*   **Restart application with zero downtime**: `pm2 reload edu-core-api`
*   **Stop processes**: `pm2 stop edu-core-api`
*   **Scale cluster manually**: `pm2 scale edu-core-api +2`
