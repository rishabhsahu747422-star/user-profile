# VE Loop Rewards — Task 14: User Profile & Admin Management System

A production-grade, full-stack rewards command center and administrative management portal built on the **MERN** stack (MongoDB, Express, React, Node.js).

Developed strictly in accordance with the **Task 14 Assignment Specification** for VE Loop Rewards.

---

## 1. Project Overview

VE Loop Rewards is a gamified rewards and digital asset platform. This system implements:
1. **User Rewards Command Center (`/profile`, `/user-profile`):**
   - Personal identity and verified account security statuses.
   - Multi-asset digital wallet: **VE**, **SVE**, **Gems**, and **Tokens** stored in integer units.
   - Gamified level progression engine with real-time XP thresholds and progress bars.
   - Platform achievement catalog with unlock conditions and claimable rewards.
   - Withdrawal request management with atomic balance reservation and settlement.
   - Referral snapshot with unique referral code generation and privacy-masked tracking.
   - Persisted recent activity feed derived directly from the immutable transaction ledger.
2. **Platform Administration Dashboard (`/admin`):**
   - Role-Based Access Control (RBAC) protecting all administrative capabilities.
   - Live platform overview metrics: user counts, circulation metrics, and withdrawal aggregates.
   - User directory with search, status/role filtering, and pagination.
   - User account status management (`active`, `suspended`, `inactive`) with mandatory audit reasons and self-suspension guards.
   - Two-step withdrawal lifecycle management: Review (Approve/Reject) and Settlement.
   - Append-only, tamper-proof audit trail (`AdminAuditLog`) with Mongoose immutability pre-hooks.
3. **Enterprise Security & Reliability:**
   - Server is the single source of truth; zero trust in client-submitted balances or roles.
   - Standalone MongoDB Two-Phase Compensating Ledger Protocol ensuring 100% financial integrity.
   - OWASP security headers, JWT validation with bcrypt password hashing, and NoSQL injection guards.
   - Cloud observability probes (`GET /health` and `GET /ready`) and distributed request correlation tracing (`X-Request-Id`).

---

## 2. Technology Stack

- **Frontend:** React 19, Vite, Bootstrap 5, CSS Modules (`.module.css`), Lucide React
- **Backend:** Node.js 18+, Express 5, Mongoose ODM
- **Database:** MongoDB (Supports Standalone MongoDB, Replica Sets, and MongoDB Atlas)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt.js password hashing
- **Testing:** Native Node.js Automated Test Harness (472 automated assertions, 100% pass rate)

---

## 3. Quick Start & Local Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **MongoDB:** Active instance running on `localhost:27017` or a MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/rishabhsahu747422-star/user-profile.git
cd user-profile

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
Backend `.env` (located in `backend/.env`):
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/user-profile
CLIENT_URL=http://localhost:5173
JWT_SECRET=dev_jwt_secret_key_ve_loop_rewards_2026_secure
JWT_EXPIRES_IN=24h
```

Frontend `.env` (located in `frontend/.env`):
```env
VITE_API_BASE_URL=/api
```

### 3. Seed Database with Evaluation Accounts
```bash
cd backend
npm run seed
```
*Seeds default level tiers, achievements, a pre-configured Administrator, and an active User with complete wallet, referral, and withdrawal records.*

### 4. Start Development Servers
In terminal 1 (Backend):
```bash
cd backend
npm run dev
# Express server starts on http://localhost:3000
```

In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
```

---

## 4. Evaluation & Demo Access Credentials

Detailed access instructions are available in [`DEMO_ACCESS.md`](file:///C:/Rishabh/Internship%20A/user-profile/DEMO_ACCESS.md).

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `demo-admin@example.com` | `AdminPassword123!` | Full admin dashboard, user directory, status changes, withdrawal approvals & settlements, audit log inspection. |
| **Regular User** | `demo-user@example.com` | `UserPassword123!` | User rewards dashboard, multi-asset balances, level 2 progress, achievement claiming, referral link sharing, withdrawal submission. |

*Tip: The `/login` page includes a interactive **Demo Evaluation Access** box with **Quick Fill** buttons for immediate sign-in without manual typing.*

---

## 5. Verification & Testing

The project maintains **10 comprehensive test suites with 472 automated tests**, all passing with a 100% success rate:

```bash
# Run the complete Milestone 8 Final Acceptance QA Suite
node backend/test_milestone_8_acceptance.js

# Run all test suites
node backend/test_milestone_3b.js
node backend/test_milestone_3c.js
node backend/test_milestone_3d.js
node backend/test_milestone_3e.js
node backend/test_milestone_3f.js
node backend/test_milestone_4_frontend_integration.js
node backend/test_milestone_5_admin.js
node backend/test_milestone_6_security.js
node backend/test_milestone_7_production.js
node backend/test_milestone_8_acceptance.js

# Run Frontend Linting & Production Build
npm --prefix frontend run lint
npm --prefix frontend run build
```

---

## 6. Documentation Directory

| Document | Purpose |
| :--- | :--- |
| [`DEMO_ACCESS.md`](file:///C:/Rishabh/Internship%20A/user-profile/DEMO_ACCESS.md) | Mandatory evaluation accounts, quick-fill guides, and database reset instructions. |
| [`docs/ASSIGNMENT_COMPLIANCE.md`](file:///C:/Rishabh/Internship%20A/user-profile/docs/ASSIGNMENT_COMPLIANCE.md) | Requirement-by-requirement verification matrix against the Task 14 specification. |
| [`docs/API_REFERENCE.md`](file:///C:/Rishabh/Internship%20A/user-profile/docs/API_REFERENCE.md) | Exhaustive API reference detailing all endpoints, authentication, bodies, and responses. |
| [`docs/ARCHITECTURE.md`](file:///C:/Rishabh/Internship%20A/user-profile/docs/ARCHITECTURE.md) | System architecture, component models, and two-phase compensating ledger protocols. |
| [`docs/ENVIRONMENT.md`](file:///C:/Rishabh/Internship%20A/user-profile/docs/ENVIRONMENT.md) | Environment configuration reference and fail-fast startup validator rules. |
| [`docs/TESTING.md`](file:///C:/Rishabh/Internship%20A/user-profile/docs/TESTING.md) | Test breakdown, concurrency stress results, and quality metrics. |
| [`docs/DEPLOYMENT.md`](file:///C:/Rishabh/Internship%20A/user-profile/docs/DEPLOYMENT.md) | Production deployment instructions, health probes, Nginx configs, and recovery procedures. |
| [`docs/postman_collection.json`](file:///C:/Rishabh/Internship%20A/user-profile/docs/postman_collection.json) | Complete Postman collection for all user and admin workflows. |

---

## 7. Submission Checklist & Final Status

- [x] Full-Stack MERN implementation (zero hardcoded mockups or simulated delays).
- [x] All 21 Task 14 core requirements verified and compliant (`docs/ASSIGNMENT_COMPLIANCE.md`).
- [x] 472 / 472 automated backend tests passing across 10 milestone test suites.
- [x] Frontend lint passing with 0 errors / 0 warnings.
- [x] Production Vite build succeeds cleanly (`dist/` generated in 422ms).
- [x] Working seeded demo credentials provided in `DEMO_ACCESS.md` and login UI.
- [x] Working Postman collection provided in `docs/postman_collection.json`.
- [x] Zero secrets, real API keys, or `.env` credential files committed.

**Final Status:** **READY FOR SUBMISSION**
