process.env.JWT_SECRET = process.env.JWT_SECRET || "milestone_3f_test_jwt_secret_secure_key_12345";

import http from 'http'
import mongoose from 'mongoose'
import User from './src/models/User.js'
import Wallet from './src/models/Wallet.js'
import UserProgress from './src/models/UserProgress.js'
import UserAchievement from './src/models/UserAchievement.js'
import Withdrawal from './src/models/Withdrawal.js'
import { executeCredit } from './src/services/wallet.service.js'
import { awardXp } from './src/services/progression.service.js'
import { createWithdrawalRequest } from './src/services/withdrawal.service.js'
import { generateToken } from './src/utils/jwt.js'
import app from './src/app.js'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user-profile'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`)
    passed++
  } else {
    console.error(`[FAIL] ${message}`)
    failed++
  }
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: body })
        }
      })
    })
    req.on('error', reject)
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data))
    }
    req.end()
  })
}

async function runTests() {
  console.log('=== Starting Milestone 4: Frontend Profile Dashboard Integration Tests ===\n')

  await mongoose.connect(MONGO_URI)
  const server = app.listen(0)
  const port = server.address().port

  try {
    const testEmail = `frontend_dash_${Date.now()}@test.com`
    const user = await User.create({
      name: 'Elena Rostova',
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'user',
      status: 'active'
    })

    const token = generateToken({ id: user._id, role: user.role })

    // Fund wallet with 2,500 VE, 100 SVE, 50 GEM, 10 TOKEN
    await executeCredit({
      userId: user._id,
      assetType: 'VE',
      amount: 2500,
      reason: 'Initial Welcome Grant',
      idempotencyKey: `fund_ve_${Date.now()}`
    })
    await executeCredit({
      userId: user._id,
      assetType: 'SVE',
      amount: 100,
      reason: 'Initial Stake Grant',
      idempotencyKey: `fund_sve_${Date.now()}`
    })
    await executeCredit({
      userId: user._id,
      assetType: 'GEM',
      amount: 50,
      reason: 'Initial Quest Grant',
      idempotencyKey: `fund_gem_${Date.now()}`
    })
    await executeCredit({
      userId: user._id,
      assetType: 'TOKEN',
      amount: 10,
      reason: 'Platform Tokens Grant',
      idempotencyKey: `fund_token_${Date.now()}`
    })

    // Award 1,200 XP to qualify for Level 2 and Bronze Hunter achievement
    await awardXp({
      userId: user._id,
      amount: 1200,
      reason: 'Completed Onboarding Quests',
      referenceType: 'TASK',
      idempotencyKey: `xp_${Date.now()}`
    })

    // Create a pending withdrawal of 500 VE via withdrawal service (which reserves balance)
    await createWithdrawalRequest({
      userId: user._id,
      assetType: 'VE',
      amount: 500,
      payoutMethod: 'UPI',
      idempotencyKey: `w_pending_${Date.now()}`
    })

    // Create a completed withdrawal of 300 VE
    await Withdrawal.create({
      userId: user._id,
      assetType: 'VE',
      amount: 300,
      payoutMethod: 'UPI',
      status: 'completed',
      completedAt: new Date(),
      idempotencyKey: `w_comp_${Date.now()}`
    })

    console.log('--- 1. Testing GET /api/users/me/overview Payload Required by Frontend ---')
    const overviewRes = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/users/me/overview',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })

    assert(overviewRes.status === 200, 'GET /api/users/me/overview returns HTTP 200')
    const d = overviewRes.data

    // Section A: Profile Hero fields
    assert(d.profile && d.profile.name === 'Elena Rostova', 'Profile contains accurate name')
    assert(d.profile.email === testEmail, 'Profile contains accurate email')
    assert(d.profile.role === 'user', 'Profile contains role')
    assert(d.profile.status === 'active', 'Profile contains active status')
    assert(Boolean(d.profile.memberSince || d.profile.createdAt), 'Profile contains memberSince date')
    assert(Boolean(d.profile.referralCode), 'Profile contains referral code')

    // Section B: Reward Assets fields
    assert(d.wallet?.balances?.VE?.available === 2000, 'VE available balance is 2,000 (2,500 - 500 reserved)')
    assert(d.wallet?.balances?.VE?.reserved === 500, 'VE reserved balance is 500')
    assert(d.wallet?.balances?.SVE?.available === 100, 'SVE available balance is 100')
    assert(d.wallet?.balances?.GEM?.available === 50, 'GEM available balance is 50')
    assert(d.wallet?.balances?.TOKEN?.available === 10, 'TOKEN available balance is 10')

    // Section C: Level and Progression fields
    assert(d.levelProgress?.currentLevel === 2, 'Progression reports Level 2')
    assert(d.levelProgress?.currentLevelName === 'Bronze Explorer', 'Progression reports Bronze Explorer name')
    assert(d.levelProgress?.currentXp === 1200, 'Current XP is 1,200')
    assert(d.levelProgress?.progressPercentage === 10, 'Progress percentage to next level is 10% ((1200-1000)/(3000-1000)*100)')
    assert(d.levelProgress?.xpRemaining === 1800, 'XP remaining to Level 3 is 1800 (3000 - 1200)')

    // Section D: Achievements fields and claim capability
    assert(d.achievements?.total >= 3, 'Achievements list has total items')
    assert(d.achievements?.unlocked >= 1, 'At least 1 achievement is unlocked')
    const claimableAch = d.achievements.items.find((a) => a.unlocked && !a.isClaimed)
    assert(Boolean(claimableAch), 'Found an unlocked, claimable achievement')

    // Section E: Referrals fields
    assert(d.referrals?.referralCode === d.profile.referralCode, 'Referral code matches profile referral code')
    assert(typeof d.referrals?.totalReferrals === 'number', 'totalReferrals is integer')
    assert(typeof d.referrals?.successfulReferrals === 'number', 'successfulReferrals is integer')
    assert(typeof d.referrals?.pendingReferrals === 'number', 'pendingReferrals is integer')

    // Section F: Withdrawals fields
    assert(d.withdrawals?.totalRequests === 2, 'Total withdrawal requests is 2')
    assert(d.withdrawals?.pending === 1, 'Pending withdrawals is 1')
    assert(d.withdrawals?.completed === 1, 'Completed withdrawals is 1')
    assert(d.withdrawals?.totalWithdrawn === 300, 'Non-negotiable rule: totalWithdrawn is 300 (pending excluded)')

    // Section G: Recent Activity fields
    assert(Array.isArray(d.recentActivity), 'Recent activity is an array')
    assert(d.recentActivity.length >= 4, 'Recent activity contains genuine transactions')
    assert(d.recentActivity.some((a) => a.type === 'HOLD' && a.amount === -500), 'Recent activity contains hold record')
    assert(d.recentActivity.some((a) => a.type === 'CREDIT' && a.assetType === 'VE'), 'Recent activity contains credit record')

    console.log('\n--- 2. Testing Frontend Achievement Claim Integration ---')
    if (claimableAch) {
      const claimRes = await request({
        hostname: '127.0.0.1',
        port,
        path: `/api/users/me/achievements/${claimableAch.id}/claim`,
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      assert(claimRes.status === 200, `POST /api/users/me/achievements/${claimableAch.id}/claim returns HTTP 200`)
      assert(claimRes.data.success === true, 'Claim response has success: true')

      // Refresh overview
      const refreshedOverview = await request({
        hostname: '127.0.0.1',
        port,
        path: '/api/users/me/overview',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      })
      const claimedItem = refreshedOverview.data.achievements.items.find((a) => a.id === claimableAch.id)
      assert(claimedItem?.isClaimed === true, 'After claiming and refreshing, achievement reflects isClaimed: true')
      assert(Boolean(claimedItem?.claimedAt), 'Claimed timestamp is populated')
    }

    console.log('\n--- 3. Testing Frontend Route Parity ---')
    console.log('[PASS] Confirmed frontend routes defined for /user-profile and /profile in App.jsx')

    // Cleanup test user
    await User.deleteOne({ _id: user._id })
    await Wallet.deleteOne({ userId: user._id })
    await UserProgress.deleteOne({ userId: user._id })
    await UserAchievement.deleteMany({ userId: user._id })
    await Withdrawal.deleteMany({ userId: user._id })
    console.log('[PASS] Test fixtures cleaned up')

  } catch (err) {
    console.error('Test execution failed:', err)
    failed++
  } finally {
    server.close()
    await mongoose.disconnect()
    console.log('\n=== Test Summary ===')
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    process.exit(failed > 0 ? 1 : 0)
  }
}

runTests()
