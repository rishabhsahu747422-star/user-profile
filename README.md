# VE Loop Rewards — Full Stack Rewards Management Platform

A full-stack rewards management platform built using the MERN stack. VE Loop Rewards provides users with a centralized dashboard to manage their profiles, track multiple reward assets, earn XP, unlock achievements, manage referrals, and request withdrawals.

The platform also includes an administrative dashboard for managing users and monitoring platform activities.

**Live Application:** https://user-profile-azure.vercel.app

**Backend API:** https://user-profile-03kp.onrender.com

**API Health Check:** https://user-profile-03kp.onrender.com/health

---

## Overview

VE Loop Rewards is designed to provide a structured rewards ecosystem with user account management, multiple digital reward assets, gamification, referrals, and withdrawal management.

The application focuses on:

- Secure authentication and role-based access.
- User profile and account management.
- Multiple reward wallets with transaction history.
- XP-based levels and achievement tracking.
- Referral management.
- Withdrawal request management.
- Administrative controls and audit logging.
- Responsive and user-friendly interfaces.

## Features

### 1. Authentication & User Management
- User registration and login.
- Secure password hashing.
- JWT-based authentication.
- Role-based access control.
- User account status management.
- Profile information management.

### 2. Multi-Asset Wallet System

The platform supports four reward asset types:

| Asset | Description |
|---|---|
| VE | Primary reward currency |
| SVE | Staked reward units |
| GEM | Achievement and quest-related reward asset |
| TOKEN | Platform reward tokens |

Wallet functionality includes:
- Available balance tracking.
- Reserved balance tracking where supported.
- Lifetime earnings.
- Immutable transaction ledger.
- Credit and debit records.
- Transaction integrity and duplicate-operation protection.

### 3. XP & Level Progression
- XP accumulation.
- Level progression.
- Progress tracking toward the next level.
- Level-based membership representation.
- Gamification experience.

### 4. Achievement System
- Achievement catalog.
- Locked and unlocked achievements.
- Reward tracking.
- Achievement claiming functionality.
- Achievement progress monitoring.

### 5. Referral System
- Unique referral codes.
- Referral tracking.
- Referral statistics.
- Successful and pending referral tracking.
- Referral-based reward management.

### 6. Withdrawal Management
- Withdrawal request creation.
- Available balance validation.
- Withdrawal status tracking.
- Pending, completed, and rejected withdrawal records.
- Financial transaction integrity checks.

### 7. Admin Dashboard
- Administrative authentication and authorization.
- Role-based permissions.
- User management.
- Account status management.
- Administrative audit logging.
- Protected administrative operations.

### 8. Security & Production Readiness
- Password hashing using bcrypt.
- JWT authentication.
- Protected routes and RBAC.
- Request validation and security controls.
- Security headers.
- Request ID tracking.
- Health and readiness endpoints.
- Graceful server shutdown.
- Financial ledger integrity protections.

### 9. UI/UX
- Premium dark-themed rewards dashboard.
- Responsive user profile interface.
- Dedicated wallet cards.
- XP and achievement visualization.
- Referral and withdrawal sections.
- Redesigned landing page and authentication experience.
- Responsive desktop and mobile layouts.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Styling | Bootstrap, CSS Modules, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt |
| API Communication | Fetch API |
| Deployment | Vercel, Render |
| Testing | Node.js test scripts, frontend lint and build checks |

---

## Project Architecture

The application follows a frontend/backend architecture.

```text
user-profile/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── UserProfile/
│   │   │   ├── Login/
│   │   │   └── Admin/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── assets/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── server.js
│
└── README.md
```

*The structure above is a high-level overview; refer to the repository for the complete implementation.*

---

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js (LTS recommended).
- npm.
- MongoDB local installation or MongoDB Atlas account.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/rishabhsahu747422-star/user-profile.git
cd user-profile
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Backend Environment

Create a `.env` file inside the `backend` directory.

Example configuration:

```env
PORT=3000
NODE_ENV=development

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret

CLIENT_URL=http://localhost:5173
TRUST_PROXY=false
```

Use the exact environment variable names expected by your current backend configuration. Keep real credentials and secrets out of GitHub.

### 4. Start the Backend

```bash
npm start
```

The backend should run locally on the configured port.

### 5. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### 6. Configure Frontend Environment

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 7. Start the Frontend

```bash
npm run dev
```

Vite will display the local development URL in the terminal, typically:

```text
http://localhost:5173
```

---

## Important API Routes

The backend exposes REST API endpoints for authentication, profile management, wallets, XP, achievements, referrals, withdrawals, and administrative operations.

Known profile endpoints include:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health check |
| GET | `/ready` | Backend readiness check |
| GET | `/api/users/me/profile` | Retrieve authenticated user profile |
| GET | `/api/users/me/overview` | Retrieve user overview and rewards information |

Refer to the backend implementation for the complete API route list.

---

## Testing & Quality Checks

The backend test suite is organized under `backend/tests/` by test category:

- `backend/tests/regression/` — Core module regression suites (`wallet`, `progression`, `referral`, `withdrawal`, `overview`, `withdrawal-api-fix`)
- `backend/tests/integration/` — Frontend contract parity, admin RBAC/audit integration, and full end-to-end acceptance QA (`acceptance.e2e.test.js`)
- `backend/tests/security/` — Security hardening, OWASP headers, JWT validation, IDOR, and injection checks (`security.test.js`)
- `backend/tests/production/` — Production readiness, environment guards, `/health`, `/ready`, and concurrency/reconciliation checks (`production-readiness.test.js`)
- `backend/tests/utilities/` — Environment-specific verification utilities (`replica-set-transactions.utility.js`, requires local Windows `mongod.exe`)

### Run Backend Tests

```bash
# Run all reusable backend suites (regression, integration, security, production)
npm --prefix backend test

# Run specific categories
npm --prefix backend run test:regression
npm --prefix backend run test:integration
npm --prefix backend run test:security
npm --prefix backend run test:production
npm --prefix backend run test:acceptance
```

### Run Frontend Checks

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

See [docs/TESTING.md](docs/TESTING.md) for the detailed test breakdown.

---

## Deployment

The application is deployed using:

**Frontend — Vercel**

https://user-profile-azure.vercel.app

**Backend — Render**

https://user-profile-03kp.onrender.com

For production deployment, configure the appropriate environment variables in Vercel and Render.

Never commit production secrets, database credentials, or private JWT keys.

---

## Security Notes

- Store passwords as secure hashes, never as plain text.
- Keep JWT secrets and database credentials in environment variables.
- Restrict administrative access through role-based authorization.
- Validate financial operations on the backend.
- Protect sensitive routes and operations.
- Use HTTPS in production.
- Do not expose demo credentials or private user information in public repositories.

---

## Future Improvements

Potential areas for future enhancement include:

- Advanced rewards analytics.
- More detailed transaction reporting.
- Additional achievement and gamification experiences.
- Enhanced administrative insights.
- Further performance and scalability improvements.

---

## Project Status

**Development:** Core functionality and UI implementation reported complete.

**Current Phase:** Final acceptance testing and submission readiness.

---

## Author

**Rishabh Sahu**

Full Stack Developer

- GitHub: [rishabhsahu747422-star](https://github.com/rishabhsahu747422-star)
- LinkedIn: [Rishabh Sahu](https://www.linkedin.com/in/rishabh-sahu-b93053386/)

---

## Acknowledgement

Developed as part of the VE Loop internship project.

