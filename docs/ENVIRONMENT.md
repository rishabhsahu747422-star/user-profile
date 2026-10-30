# VE Loop Rewards — Environment Configuration Guide

This document describes all environment variables used by the VE Loop Rewards backend and frontend services, their default fallbacks, validation constraints, and production configuration guidelines.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable Name | Required? | Default / Example Value | Validation Constraints & Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3000` | Integer between `1` and `65535`. Port on which the Express HTTP server listens. |
| `NODE_ENV` | Optional | `development` | Runtime mode (`development`, `production`, `test`). Enforces production guards when set to `production`. |
| `MONGODB_URI` | **Required** | `mongodb://127.0.0.1:27017/user-profile` | URI starting with `mongodb://` or `mongodb+srv://`. In production, required to connect to MongoDB Atlas or a replica set. |
| `JWT_SECRET` | **Required** | `replace_with_a_secure_random_32_character_secret_key_12345` | High-entropy signing secret. In production, `validateEnv()` enforces a **minimum length of 32 characters**. |
| `JWT_EXPIRES_IN` | Optional | `24h` | Token expiration string compatible with `jsonwebtoken` (e.g., `1h`, `24h`, `7d`). |
| `CLIENT_URL` | **Required in Prod** | `http://localhost:5173` | Allowed CORS origin(s). Supports a single origin or a comma-separated list of origins (e.g. `https://app.veloop.com,https://admin.veloop.com`). |
| `TRUST_PROXY` | Optional | `false` | Set to `true` or `1` if deployed behind a reverse proxy or load balancer (Nginx, AWS ALB, Cloudflare) to ensure accurate client IP logging. |

### Backend `.env.example` Template
```bash
# Server Network Configuration
PORT=3000
NODE_ENV=production

# Database Configuration (Standalone MongoDB, Replica Set, or MongoDB Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/user-profile

# Client / Frontend Origin for CORS (comma-separated for multiple origins)
CLIENT_URL=http://localhost:5173

# Authentication & JWT Configuration (Minimum 32 characters in production)
JWT_SECRET=replace_with_a_secure_random_32_character_secret_key_12345
JWT_EXPIRES_IN=24h

# Reverse Proxy / Load Balancer Configuration
TRUST_PROXY=false
```

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable Name | Required? | Default / Example Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Optional | `/api` | Base path or URL for backend API requests. Defaults to `/api` which is proxied by Vite dev server and Nginx in production. |

### Frontend `.env.example` Template
```bash
# API Base URL (defaults to /api which is proxied by Vite in dev and Nginx in prod)
VITE_API_BASE_URL=/api
```

---

## 3. Startup Fail-Fast Validation (`validateEnv`)

The application incorporates a synchronous fail-fast startup validator located in [`backend/src/config/env.js`](file:///C:/Rishabh/Internship%20A/user-profile/backend/src/config/env.js).
If any required variable is missing or malformed when running in `production` mode, the process aborts immediately with exit code 1 and prints secret-free diagnostic error messages.

**Security Guarantee:** Error messages describe misconfigurations without leaking the actual contents of secrets or credentials to logs or stdout.

