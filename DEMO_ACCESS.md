# VE Loop Rewards — Evaluation & Demo Access Guide

**Project:** VELoop Rewards — Task 14: User Profile & Admin Management System  
**Repository Branch:** `main`  
**Mandatory Specification Reference:** Task 14, Section 30 & Section 57

---

## 1. Quick Access Credentials

This application includes pre-configured, fully seeded demo credentials for immediate evaluation. These accounts can also be quickly auto-filled on the login page using the interactive **Demo Evaluation Access** panel.

### Administrator Account (Full Management & Auditing)
- **Login URL:** `http://localhost:5173/login` (or `/admin` when authenticated)
- **Email:** `demo-admin@example.com`
- **Password:** `AdminPassword123!`
- **Role:** `admin`
- **Capabilities:**
  - View live platform circulation metrics & system overview
  - Search, filter, and inspect user profiles (passwords omitted)
  - Activate, suspend, or deactivate user accounts (mandatory audit reason required)
  - Review pending withdrawals (approve or reject with recorded reason)
  - Settle approved withdrawals (releases reserved funds into totalWithdrawn)
  - Inspect tamper-proof administrative audit logs (`AdminAuditLog`)

---

### Regular User Account (Profile, Gamification & Rewards)
- **Login URL:** `http://localhost:5173/login` (or `/profile` / `/user-profile`)
- **Email:** `demo-user@example.com`
- **Password:** `UserPassword123!`
- **Role:** `user`
- **Capabilities:**
  - Rewards command center with multi-asset balances (VE, SVE, Gems, Tokens)
  - Level 2 Bronze Explorer progression progress bar and XP remaining calculations
  - View and claim unlocked achievements (Welcome badge, Bronze Hunter badge)
  - Unique referral code (`DEMO2026`) and referral tracking with masked privacy
  - View real withdrawal history and submit new withdrawal requests with balance reservation
  - Recent activity feed populated from the immutable transaction ledger

---

## 2. Interactive Login Screen Quick-Fill

When navigating to `/login` in a development or demo environment, the login card presents a dedicated **Demo Evaluation Access** box beneath the primary form. 
- Clicking **Quick Fill** next to **Demo Administrator** immediately populates `demo-admin@example.com` and `AdminPassword123!`.
- Clicking **Quick Fill** next to **Demo Regular User** immediately populates `demo-user@example.com` and `UserPassword123!`.

---

## 3. How to Seed or Reset Demo Data

To seed fresh demo accounts or reset existing demo data back to default baseline states, run the automated database seeder:

```bash
# Navigate to the backend directory
cd backend

# Execute database seeding
npm run seed
```

### What the Seeder Sets Up:
1. **Level Configurations:** Seeds tiers 1 through 7 (Novice to Diamond Master).
2. **Default Achievements:** Seeds platform achievements (`ACH_WELCOME`, `ACH_BRONZE_HUNTER`, etc.).
3. **Demo Administrator:** Seeds `demo-admin@example.com` with role `admin`.
4. **Demo User:** Seeds `demo-user@example.com` with:
   - 2,300 Available VEs + 200 Reserved VEs (held for pending withdrawal)
   - 150 SVEs, 50 Gems, 10 Tokens
   - 1,500 XP (Level 2 Bronze Explorer)
   - 1 Settled Withdrawal (500 VE, Bank Transfer)
   - 1 Pending Withdrawal (200 VE, Crypto)
   - Unlocked & claimed Welcome achievement
   - Unlocked and claimable Bronze Hunter achievement
   - 1 Active referred user relationship (`DEMO2026`)
5. **Reconciliation Verification:** Executes `reconcileWallet(demoUser._id)` to prove 100% agreement between ledger records and wallet balances.

---

## 4. Local Service URLs

- **Frontend Application:** `http://localhost:5173`
- **Backend API Server:** `http://localhost:3000`
- **Liveness Health Check:** `http://localhost:3000/health`
- **Readiness Health Check:** `http://localhost:3000/ready`
- **Swagger / API Endpoints:** `http://localhost:3000/api/*`

---

## 5. Security & Production Notice

In accordance with OWASP principles and Task 14 Section 30:
- The seeded demo credentials use strong, bcrypt-salted password hashes (`$2a$10$...`).
- Password hashes are strictly excluded from JSON representations (`select: false` and `toSafeObject()` transforms).
- The quick-fill demo panel can be disabled in strict production deployments by setting `NODE_ENV=production`.

