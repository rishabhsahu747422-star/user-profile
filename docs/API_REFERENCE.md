# VE Loop Rewards — Comprehensive API Reference

This document provides exhaustive documentation for all HTTP endpoints provided by the VE Loop Rewards backend API.

---

## 1. Global API Conventions

### Base URL
- Local Development: `http://localhost:3000/api`
- Reverse Proxy / Vite Dev: `http://localhost:5173/api`

### Authentication & Authorization
- Protected endpoints require an `Authorization` header formatted as:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- Identity is derived strictly from the verified JWT payload on the server (`req.user._id`). Client-submitted user IDs in query parameters or request bodies are ignored.
- Admin endpoints require the authenticated user's role to be `admin`. Normal users receive `HTTP 403 Forbidden`.
- Accounts with `status: "suspended"` or `status: "inactive"` receive `HTTP 403 Forbidden` across protected routes.

### Common Security & Tracing Headers
- `X-Request-Id`: Injected on every response for end-to-end distributed log correlation.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Powered-By`: Strictly disabled to prevent server fingerprinting.

---

## 2. Health & Operational Probes

### `GET /health` (or `GET /api/health`)
**Description:** Liveness probe indicating process uptime and operational status.
- **Auth:** None
- **Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "service": "VE Loop Rewards API",
  "uptime": 1420,
  "database": {
    "connected": true,
    "status": "connected"
  },
  "timestamp": "2026-10-30T10:45:00.000Z"
}
```

### `GET /ready` (or `GET /api/ready`)
**Description:** Readiness probe indicating whether critical database connections are established. Returns `HTTP 503` if disconnected.
- **Auth:** None
- **Response (HTTP 200 OK):**
```json
{
  "ready": true,
  "status": "ready",
  "service": "VE Loop Rewards API",
  "dependencies": {
    "database": {
      "status": "connected",
      "ready": true
    }
  },
  "timestamp": "2026-10-30T10:45:00.000Z"
}
```

---

## 3. Authentication Endpoints

### `POST /api/auth/register`
**Description:** Registers a new user account, auto-provisions a multi-asset wallet, assigns a unique referral code, and links optional referral codes.
- **Auth:** None
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "Password123!",
  "referralCode": "DEMO2026"
}
```
- **Response (HTTP 201 Created):**
```json
{
  "message": "User registered successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6ae469e4629fd79d7e099fae",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "user",
    "status": "active",
    "referralCode": "VL78A1BF9C"
  }
}
```

### `POST /api/auth/login`
**Description:** Authenticates a user by email and password, returning a signed JWT token.
- **Auth:** None
- **Request Body:**
```json
{
  "email": "jane.doe@example.com",
  "password": "Password123!"
}
```
- **Response (HTTP 200 OK):**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6ae469e4629fd79d7e099fae",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "user",
    "status": "active",
    "referralCode": "VL78A1BF9C"
  }
}
```

---

## 4. User Profile & Overview Endpoints

### `GET /api/users/me/profile`
**Description:** Retrieves the authenticated user's profile details.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "profile": {
    "id": "6ae469e4629fd79d7e099fae",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "user",
    "status": "active",
    "referralCode": "VL78A1BF9C",
    "memberSince": "2026-10-28T14:30:00.000Z",
    "createdAt": "2026-10-28T14:30:00.000Z",
    "updatedAt": "2026-10-28T14:30:00.000Z"
  }
}
```

### `GET /api/users/me/overview`
**Description:** Unified, single-call endpoint consolidating profile, wallet balances, gamification level, achievements, referrals, withdrawal stats, and recent activity feed.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "success": true,
  "profile": {
    "id": "6ae469e4629fd79d7e099fae",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "user",
    "status": "active",
    "referralCode": "VL78A1BF9C",
    "memberSince": "2026-10-28T14:30:00.000Z"
  },
  "wallet": {
    "balances": {
      "VE": { "available": 2300, "reserved": 200, "totalEarned": 3000, "totalWithdrawn": 500 },
      "SVE": { "available": 150, "reserved": 0, "totalEarned": 150, "totalWithdrawn": 0 },
      "GEM": { "available": 50, "reserved": 0, "totalEarned": 50, "totalWithdrawn": 0 },
      "TOKEN": { "available": 10, "reserved": 0, "totalEarned": 10, "totalWithdrawn": 0 }
    }
  },
  "levelProgress": {
    "currentXp": 1500,
    "totalXpEarned": 1500,
    "currentLevel": 2,
    "currentLevelName": "Bronze Explorer",
    "nextLevel": 3,
    "nextLevelName": "Silver Adventurer",
    "nextLevelXp": 3000,
    "xpRemaining": 1500,
    "progressPercentage": 25,
    "badge": "badge_level_2"
  },
  "achievements": {
    "total": 6,
    "unlocked": 2,
    "claimed": 1,
    "inProgress": 4,
    "items": [...]
  },
  "referrals": {
    "referralCode": "VL78A1BF9C",
    "totalReferrals": 2,
    "successfulReferrals": 1,
    "pendingReferrals": 1
  },
  "withdrawals": {
    "totalRequests": 2,
    "pendingRequests": 1,
    "completedRequests": 1,
    "totalWithdrawn": 500,
    "pendingReserved": 200
  },
  "recentActivity": [
    {
      "id": "6ae469e4629fd79d7e099ff1",
      "type": "HOLD",
      "assetType": "VE",
      "amount": -200,
      "balanceBefore": 2500,
      "balanceAfter": 2300,
      "description": "Withdrawal reservation for request WD-173028",
      "timestamp": "2026-10-30T09:15:00.000Z"
    }
  ]
}
```

---

## 5. Wallet & Financial Endpoints

### `GET /api/users/me/wallet`
**Description:** Retrieves the authenticated user's wallet balances.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "wallet": {
    "balances": {
      "VE": { "available": 2300, "reserved": 200, "totalEarned": 3000, "totalWithdrawn": 500 },
      "SVE": { "available": 150, "reserved": 0, "totalEarned": 150, "totalWithdrawn": 0 },
      "GEM": { "available": 50, "reserved": 0, "totalEarned": 50, "totalWithdrawn": 0 },
      "TOKEN": { "available": 10, "reserved": 0, "totalEarned": 10, "totalWithdrawn": 0 }
    }
  }
}
```

---

## 6. Gamification & Progression Endpoints

### `GET /api/users/me/progress`
**Description:** Retrieves level, XP thresholds, progress bar percentage, and next-tier requirements.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "levelProgress": {
    "currentXp": 1500,
    "totalXpEarned": 1500,
    "currentLevel": 2,
    "currentLevelName": "Bronze Explorer",
    "nextLevel": 3,
    "nextLevelName": "Silver Adventurer",
    "nextLevelXp": 3000,
    "xpRemaining": 1500,
    "progressPercentage": 25,
    "badge": "badge_level_2"
  }
}
```

### `GET /api/users/me/achievements`
**Description:** Lists all available platform achievements and their current unlock/claim states for the authenticated user.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "achievements": [
    {
      "id": "6ae300799c1a3b51f84866c0",
      "code": "ACH_WELCOME",
      "title": "Welcome to VE Loop",
      "description": "Successfully activate your account and join VE Loop Rewards",
      "artwork": "badge_welcome",
      "category": "PROFILE",
      "criteria": { "type": "CUSTOM", "targetValue": 1 },
      "rewards": [],
      "progress": 1,
      "unlocked": true,
      "unlockedAt": "2026-10-28T14:30:00.000Z",
      "isClaimed": true,
      "claimedAt": "2026-10-28T14:35:00.000Z"
    }
  ]
}
```

### `POST /api/users/me/achievements/:id/claim`
**Description:** Claims the reward for an unlocked achievement. Atomic state transition prevents duplicate rewards.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "message": "Achievement claimed successfully.",
  "success": true,
  "achievementId": "6ae300799c1a3b51f84866c0",
  "claimedAt": "2026-10-30T10:46:12.000Z"
}
```
- **Error (HTTP 400 Bad Request):** If already claimed or not unlocked.

---

## 7. Referral Endpoints

### `GET /api/referrals/validate/:code`
**Description:** Validates a referral code prior to registration submission.
- **Auth:** None (Public)
- **Response (HTTP 200 OK):**
```json
{
  "valid": true,
  "referrerName": "Alex Mercer",
  "referralCode": "DEMO2026"
}
```

### `GET /api/users/me/referrals`
**Description:** Returns the user's active referral code and aggregated stats.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "referrals": {
    "referralCode": "VL78A1BF9C",
    "totalReferrals": 3,
    "successfulReferrals": 2,
    "pendingReferrals": 1
  }
}
```

### `GET /api/users/me/referrals/history`
**Description:** Lists paginated referrals with privacy-masked email addresses (`j***e@example.com`).
- **Auth:** Bearer Token
- **Query Params:** `page` (default 1), `limit` (default 10), `status` (optional)
- **Response (HTTP 200 OK):**
```json
{
  "referrals": [
    {
      "id": "6ae469e4629fd79d7e099fac",
      "referredUserEmail": "s***r@example.com",
      "status": "qualified",
      "registeredAt": "2026-10-29T11:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

---

## 8. Withdrawal Endpoints

### `POST /api/users/me/withdrawals`
**Description:** Creates a new withdrawal request. Moves funds from available to reserved balance.
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "amount": 250,
  "assetType": "VE",
  "payoutMethod": "BANK_TRANSFER",
  "payoutDetails": { "accountIdentifier": "CHASUS33-4821" },
  "idempotencyKey": "req_wd_uuid_12345"
}
```
- **Response (HTTP 201 Created):**
```json
{
  "message": "Withdrawal request submitted successfully.",
  "withdrawal": {
    "_id": "6ae469e4629fd79d7e099fb5",
    "withdrawalId": "WD-173028-A4F",
    "amount": 250,
    "assetType": "VE",
    "payoutMethod": "BANK_TRANSFER",
    "status": "pending",
    "createdAt": "2026-10-30T10:48:00.000Z"
  }
}
```

### `POST /api/users/me/withdrawals/:id/cancel`
**Description:** Cancels a pending withdrawal and immediately releases reserved funds back to available balance.
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "reason": "Changed my mind"
}
```
- **Response (HTTP 200 OK):**
```json
{
  "message": "Withdrawal request cancelled successfully and funds released.",
  "withdrawal": {
    "_id": "6ae469e4629fd79d7e099fb5",
    "status": "cancelled"
  }
}
```

### `GET /api/users/me/withdrawals/summary`
**Description:** Returns withdrawal metrics. Non-negotiable rule: Pending requests are strictly excluded from `totalWithdrawn`.
- **Auth:** Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "withdrawalSummary": {
    "totalRequests": 3,
    "pendingRequests": 1,
    "completedRequests": 1,
    "rejectedRequests": 0,
    "cancelledRequests": 1,
    "totalWithdrawn": 500,
    "pendingReserved": 250
  }
}
```

---

## 9. Administrative Endpoints (RBAC: Admin Only)

### `GET /api/admin/overview`
**Description:** Comprehensive platform dashboard with user counts, withdrawal aggregates, and system-wide circulation metrics.
- **Auth:** Admin Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "users": { "total": 150, "active": 145, "suspended": 3, "inactive": 2, "admins": 2 },
  "withdrawals": {
    "totalRequests": 45,
    "pending": 8,
    "approved": 2,
    "completed": 30,
    "rejected": 3,
    "cancelled": 2,
    "totalSettledAmount": 14500,
    "totalPendingReserved": 2400
  },
  "circulation": {
    "VE": { "available": 182400, "reserved": 2400, "totalEarned": 220000 },
    "SVE": { "available": 14200 },
    "GEM": { "available": 3800 },
    "TOKEN": { "available": 920 }
  }
}
```

### `GET /api/admin/users`
**Description:** Search, filter, and paginate through platform users.
- **Auth:** Admin Bearer Token
- **Query Params:** `search`, `status`, `role`, `page`, `limit`
- **Response (HTTP 200 OK):**
```json
{
  "users": [
    {
      "_id": "6ae469e4629fd79d7e099fae",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "user",
      "status": "active",
      "referralCode": "VL78A1BF9C",
      "createdAt": "2026-10-28T14:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 15, "total": 1, "totalPages": 1 }
}
```

### `GET /api/admin/users/:id`
**Description:** Inspects individual user details, wallet balances, and progression. Password hashes and credentials are strictly omitted.
- **Auth:** Admin Bearer Token
- **Response (HTTP 200 OK):**
```json
{
  "user": { ... },
  "wallet": { ... },
  "progress": { ... },
  "withdrawals": { ... },
  "referrals": { ... }
}
```

### `PATCH /api/admin/users/:id/status`
**Description:** Updates a user's status (`active`, `suspended`, `inactive`). Requires a mandatory reason and records an append-only audit trail. Prevents self-suspension.
- **Auth:** Admin Bearer Token
- **Request Body:**
```json
{
  "status": "suspended",
  "reason": "Suspicious referral activity flagged for investigation."
}
```
- **Response (HTTP 200 OK):**
```json
{
  "message": "User status updated to 'suspended'.",
  "user": { "id": "...", "status": "suspended" }
}
```

### `GET /api/admin/withdrawals`
**Description:** Lists platform withdrawals with search and status filters.
- **Auth:** Admin Bearer Token
- **Query Params:** `status`, `userId`, `page`, `limit`
- **Response (HTTP 200 OK):**
```json
{
  "withdrawals": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

### `POST /api/admin/withdrawals/:id/review`
**Description:** Reviews a pending withdrawal (`decision: "approve"` or `"reject"`). Rejection immediately refunds reserved funds to the user's available balance.
- **Auth:** Admin Bearer Token
- **Request Body:**
```json
{
  "decision": "approve",
  "reason": "KYC verified and valid bank routing provided."
}
```
- **Response (HTTP 200 OK):**
```json
{
  "message": "Withdrawal successfully approved.",
  "withdrawal": { "status": "approved" }
}
```

### `POST /api/admin/withdrawals/:id/settle`
**Description:** Settles an `approved` withdrawal request. Deducts reserved balance, increments `totalWithdrawn`, and marks the record `completed`. Duplicate settlements are blocked.
- **Auth:** Admin Bearer Token
- **Request Body:**
```json
{
  "reason": "Disbursed via bank transfer wire TXN-884920"
}
```
- **Response (HTTP 200 OK):**
```json
{
  "message": "Withdrawal successfully settled and marked completed.",
  "withdrawal": { "status": "completed" }
}
```

### `GET /api/admin/audit-logs`
**Description:** Retrieves platform administrative audit logs. Read-only and protected against update or delete mutations via Mongoose immutability hooks.
- **Auth:** Admin Bearer Token
- **Query Params:** `action`, `targetType`, `page`, `limit`
- **Response (HTTP 200 OK):**
```json
{
  "logs": [
    {
      "_id": "6ae469e4629fd79d7e099fd8",
      "action": "WITHDRAWAL_SETTLE",
      "actor": {
        "adminId": "...",
        "email": "demo-admin@example.com",
        "role": "admin"
      },
      "target": {
        "targetType": "WITHDRAWAL",
        "targetId": "..."
      },
      "reason": "Disbursed via bank transfer wire TXN-884920",
      "createdAt": "2026-10-30T10:49:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```
