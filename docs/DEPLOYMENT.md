# VE Loop Rewards — Production Deployment & Operations Guide

This document describes the production deployment procedures, hosting configurations, health probe setups, and disaster recovery runbooks for the **VE Loop Rewards — Task 14 Full-Stack User Profile & Admin Management System**.

---

## 1. Supported Deployment Targets

The application is container-ready and compatible with standard cloud hosting environments:
- **Frontend Hosting:** Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront
- **Backend Hosting:** Render, Railway, AWS ECS / EC2, or DigitalOcean App Platform
- **Database Hosting:** MongoDB Atlas (M0 Free Tier or M10+ Production Replica Set)

---

## 2. Production Build & Startup Commands

### Backend Deployment (Node.js 18+)
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install production dependencies only
npm install --omit=dev

# 3. Configure production environment
cp .env.example .env
# Edit .env with production credentials:
# - MONGODB_URI (e.g. mongodb+srv://user:pass@cluster.mongodb.net/user-profile)
# - JWT_SECRET (must be >= 32 characters in production)
# - CLIENT_URL (e.g. https://app.veloop-rewards.com)
# - NODE_ENV=production
# - TRUST_PROXY=true (if behind Cloudflare / AWS ALB)

# 4. Seed baseline levels, achievements, and evaluation accounts
npm run seed

# 5. Start production service
npm start
# Output: [INFO] Server running on port 3000 in 'production' mode
```

### Frontend Deployment (Static Build)
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Build optimized static assets
npm run build
# Output: Artifacts emitted to frontend/dist/

# 4. Preview locally if needed
npm run preview
```

---

## 3. Reverse Proxy & Nginx Configuration

When deploying frontend and backend under a single domain (e.g., `https://veloop-rewards.com`), use the following Nginx reverse proxy configuration:

```nginx
server {
    listen 80;
    server_name veloop-rewards.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name veloop-rewards.com;

    ssl_certificate /etc/ssl/certs/veloop.crt;
    ssl_certificate_key /etc/ssl/private/veloop.key;

    # Static Frontend SPA
    root /var/www/user-profile/frontend/dist;
    index index.html;

    # Single Page Application Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API & Health Probes Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Direct Health Probes for Load Balancer
    location ~ ^/(health|ready)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 4. Kubernetes / Cloud Health Probes

Configure container orchestrators (Kubernetes, AWS ECS, Render) using the dedicated endpoints:

### Liveness Probe
- **Path:** `GET /health`
- **Initial Delay:** 10 seconds
- **Period:** 15 seconds
- **Behavior:** Returns `HTTP 200` with uptime. Does not crash the container during temporary database reconnects.

### Readiness Probe
- **Path:** `GET /ready`
- **Initial Delay:** 5 seconds
- **Period:** 10 seconds
- **Behavior:** Checks `mongoose.connection.readyState === 1`. Returns `HTTP 200` when ready to serve traffic; returns `HTTP 503` while the database connection pool is establishing or reconnecting.

---

## 5. Graceful Termination & Shutdown

The backend process implements active signal handlers for `SIGTERM` and `SIGINT`:
```javascript
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
```
When a termination signal is received:
1. The HTTP server stops accepting new connections.
2. Inflight requests are allowed up to 10 seconds to finish.
3. The MongoDB connection pool is cleanly closed via `mongoose.connection.close(false)`.
4. The process exits cleanly with status code `0`.

---

## 6. Rollback & Disaster Recovery Runbook

### Application Rollback
To roll back to the previous stable release:
```bash
git checkout <previous_commit_hash>
cd backend && npm install --omit=dev
cd ../frontend && npm install && npm run build
# Restart application services
```

### Database Reconciliation & Recovery
If an unexpected server failure occurs mid-transaction on a standalone MongoDB instance:
1. Re-run database health checks:
   ```bash
   curl http://localhost:3000/ready
   ```
2. Run the programmatic wallet reconciliation tool to identify any ledger discrepancies:
   ```javascript
   import { reconcileWallet } from "./src/services/wallet.service.js";
   const report = await reconcileWallet(targetUserId);
   console.log("Is Reconciled:", report.isReconciled);
   console.log("Discrepancies:", report.discrepancies);
   ```
3. To backfill any newly registered users who may be missing wallet records:
   ```javascript
   import { backfillWallets } from "./src/services/wallet.service.js";
   const result = await backfillWallets();
   console.log("Backfill complete:", result);
   ```

