import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

// Specialized Sub-Components
import TopRewardCards from '../../components/rewards/TopRewardCards'
import DailyBonusCard from '../../components/rewards/DailyBonusCard'
import EarnCards from '../../components/rewards/EarnCards'
import MiningBanner from '../../components/rewards/MiningBanner'
import StakingCard from '../../components/rewards/StakingCard'
import MegaRewardVault from '../../components/rewards/MegaRewardVault'
import SpinWheelModal from '../../components/rewards/SpinWheelModal'
import TapEarnModal from '../../components/rewards/TapEarnModal'
import StakeModal from '../../components/rewards/StakeModal'
import SwapModal from '../../components/rewards/SwapModal'

import styles from './UserProfile.module.css'

export function UserProfile() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [claimingId, setClaimingId] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // for activity filter

  // Interactive Modal States
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false)
  const [isTapModalOpen, setIsTapModalOpen] = useState(false)
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)

  // Withdrawal Request Form State
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDestination, setWithdrawDestination] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawalHistory, setWithdrawalHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Interactive Quick Actions feedback state
  const [actionFeedback, setActionFeedback] = useState(null)

  // Ref to scroll to missions section
  const missionsSectionRef = useRef(null)

  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // Toast auto-dismiss helper
  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }, [])

  // Load dashboard overview
  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    try {
      const data = await api.user.getOverview()
      setOverview(data)
      setError(null)
      if (isRefresh) {
        showToast('Dashboard synchronized with latest ledger state', 'success')
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        logout()
        navigate('/login', { replace: true })
        return
      }
      setError(err.message || 'Failed to load user profile dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [logout, navigate, showToast])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    let isMounted = true
    const fetchData = async () => {
      try {
        const data = await api.user.getOverview()
        if (isMounted) {
          setOverview(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          if (err.status === 401 || err.status === 403) {
            logout()
            navigate('/login', { replace: true })
            return
          }
          setError(err.message || 'Failed to load user profile dashboard.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, logout, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text, label, keyName = null) => {
    if (!text) return
    let copied = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        copied = true
      }
    } catch {
      copied = false
    }

    if (!copied) {
      try {
        const input = document.createElement('textarea')
        input.value = text
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        copied = document.execCommand('copy')
        document.body.removeChild(input)
      } catch {
        copied = false
      }
    }

    if (copied) {
      if (keyName) {
        setCopiedKey(keyName)
        setTimeout(() => setCopiedKey(null), 2000)
      }
      showToast(`${label} copied to clipboard!`, 'success')
    } else {
      showToast(`Failed to copy ${label}`, 'error')
    }
  }

  // Claim achievement handler
  const handleClaimAchievement = async (achievementId, title) => {
    if (claimingId) return
    setClaimingId(achievementId)
    try {
      await api.user.claimAchievement(achievementId)
      showToast(`Achievement "${title}" claimed successfully!`, 'success')
      await loadOverview(false)
    } catch (err) {
      showToast(err.message || 'Failed to claim achievement.', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  // Fetch paginated withdrawal history
  const fetchWithdrawalHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await api.user.getWithdrawals({ limit: 10 })
      setWithdrawalHistory(res?.withdrawals || [])
    } catch (err) {
      console.error('Failed to load withdrawal history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const openWithdrawModal = () => {
    setIsWithdrawModalOpen(true)
    fetchWithdrawalHistory()
  }

  // Quick Action triggers
  const handleQuickAction = (actionKey) => {
    if (actionKey === 'payout') {
      openWithdrawModal()
      return
    }

    if (actionKey === 'ads') {
      setActionFeedback({
        title: 'Watch Ads & Earn',
        message: 'Rewarded video offerwall ready! Completing an ad stream credits +25 VE and +50 XP to your account.',
        actionLabel: 'Launch Video Stream'
      })
      return
    }

    if (actionKey === 'streak') {
      setActionFeedback({
        title: 'Daily Check-in Streak',
        message: 'Day 4 Streak Active! Check in daily to maintain your 1.5x multiplier and unlock your milestone gem bonus.',
        actionLabel: 'Check-In Completed'
      })
      return
    }

    if (actionKey === 'exchange') {
      setIsSwapModalOpen(true)
      return
    }
  }

  // Handle Daily Bonus Claim
  const handleClaimDailyBonus = async () => {
    showToast('Daily Bonus Claimed! +50 VE and +100 XP credited to your ledger.', 'success')
    await loadOverview(false)
  }

  // Handle Lucky Spin Reward
  const handleSpinRewardWon = (won) => {
    showToast(`Lucky Spin Awarded: ${won.label}! Added to your profile.`, 'success')
    loadOverview(false)
  }

  // Handle Tap & Earn session
  const handleTapRewardEarned = (amount) => {
    showToast(`+${amount} VE mined from engagement matrix!`, 'info')
  }

  // Handle Staking confirmation
  const handleStakeSuccess = (amount) => {
    showToast(`Staked ${amount} VE into SVE platform vault. Ledger updated.`, 'success')
    loadOverview(false)
  }

  // Handle Swap confirmation
  const handleSwapSuccess = (gemAmt, veAmt) => {
    showToast(`Swapped ${gemAmt} GEM for ${veAmt} VE successfully!`, 'success')
    loadOverview(false)
  }

  // Request withdrawal submit
  const handleCreateWithdrawal = async (e) => {
    e.preventDefault()
    const amountNum = Number(withdrawAmount)
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid withdrawal amount.', 'error')
      return
    }

    if (!Number.isInteger(amountNum)) {
      showToast('Withdrawal amount must be a whole integer.', 'error')
      return
    }

    const availableVE = overview?.wallet?.balances?.VE?.available ?? 0
    if (amountNum > availableVE) {
      showToast(`Requested amount (${amountNum.toLocaleString()} VE) exceeds available balance (${availableVE.toLocaleString()} VE).`, 'error')
      return
    }

    if (!withdrawDestination.trim()) {
      showToast('Please provide a payout destination address.', 'error')
      return
    }

    setWithdrawing(true)
    try {
      const idempotencyKey = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      await api.user.createWithdrawal({
        amount: amountNum,
        assetType: 'VE',
        destination: withdrawDestination.trim(),
        payoutMethod: 'MANUAL',
        payoutDetails: {
          accountIdentifier: withdrawDestination.trim()
        },
        idempotencyKey
      })
      showToast('Withdrawal request submitted successfully! Funds reserved.', 'success')
      setWithdrawAmount('')
      setWithdrawDestination('')
      await Promise.all([loadOverview(false), fetchWithdrawalHistory()])
    } catch (err) {
      showToast(err.message || 'Failed to submit withdrawal request.', 'error')
    } finally {
      setWithdrawing(false)
    }
  }

  // Scroll to Missions
  const scrollToMissions = () => {
    if (missionsSectionRef.current) {
      missionsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Date formatting helpers
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getInitials = (name) => {
    if (!name) return 'VE'
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardWrapper}>
          <div className={styles.skeletonHero} />
          <div className={styles.skeletonGrid}>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </div>
          <div className={styles.skeletonCard} style={{ height: '220px' }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardWrapper}>
          <div className={styles.errorBox}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3 className={styles.errorHeading}>Unable to Load User Profile</h3>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.errorActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => loadOverview(true)}
              >
                Retry Connection
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleLogout}
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!overview || !overview.profile) {
    return null
  }

  const { profile, wallet, levelProgress, achievements, referrals, withdrawals, recentActivity } = overview
  const balances = wallet?.balances || {
    VE: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
    SVE: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
    GEM: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
    TOKEN: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 }
  }

  const formattedLevel = String(levelProgress?.currentLevel || 1).padStart(2, '0')

  // Filtered recent activity
  const filteredActivity = (recentActivity || []).filter((act) => {
    if (activeTab === 'all') return true
    if (activeTab === 'credits') return act.type === 'CREDIT' || act.type === 'RELEASE'
    if (activeTab === 'withdrawals') return act.type === 'HOLD' || act.type === 'SETTLE' || act.type === 'DEBIT'
    return true
  })

  return (
    <div className={styles.dashboardContainer}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`${styles.toast} ${
            toastMessage.type === 'error'
              ? styles.toastError
              : toastMessage.type === 'success'
              ? styles.toastSuccess
              : styles.toastInfo
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={styles.toastIcon}>
            {toastMessage.type === 'error' ? '✕' : toastMessage.type === 'success' ? '✓' : 'ℹ'}
          </span>
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToastMessage(null)}
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Lucky Spin Wheel Modal */}
      <SpinWheelModal
        isOpen={isSpinModalOpen}
        onClose={() => setIsSpinModalOpen(false)}
        onRewardWon={handleSpinRewardWon}
      />

      {/* Tap & Earn Modal */}
      <TapEarnModal
        isOpen={isTapModalOpen}
        onClose={() => setIsTapModalOpen(false)}
        onRewardEarned={handleTapRewardEarned}
      />

      {/* Staking Modal */}
      <StakeModal
        isOpen={isStakeModalOpen}
        onClose={() => setIsStakeModalOpen(false)}
        availableVE={balances.VE.available}
        currentSVE={balances.SVE.available}
        onStakeSuccess={handleStakeSuccess}
      />

      {/* Swap Center Modal */}
      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        availableGems={balances.GEM.available}
        availableVE={balances.VE.available}
        onSwapSuccess={handleSwapSuccess}
      />

      {/* Quick Action Modal Dialog */}
      {actionFeedback && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{actionFeedback.title}</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setActionFeedback(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ color: '#A5A5BC', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
                {actionFeedback.message}
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setActionFeedback(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  showToast(`${actionFeedback.title} active! Ready to earn.`, 'success')
                  setActionFeedback(null)
                }}
              >
                {actionFeedback.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Request Modal */}
      {isWithdrawModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalEyebrow}>Redemption Protocol</span>
                <h3 id="withdraw-title" className={styles.modalTitle}>Request VE Withdrawal</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsWithdrawModalOpen(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateWithdrawal}>
              <div className={styles.modalBody}>
                {/* Available Balance Box */}
                <div className={styles.modalBalanceBox}>
                  <div className={styles.modalBalanceMeta}>
                    <span className={styles.modalBalanceLabel}>Available Balance</span>
                    <strong className={styles.modalBalanceValue}>
                      {balances.VE.available.toLocaleString()} <span className={styles.currencyYellow}>VE</span>
                    </strong>
                  </div>
                  <div className={styles.modalNotice}>
                    Minimum redemption threshold is <strong>200 VE</strong>. Upon confirmation, requested funds are reserved immediately in the immutable financial ledger.
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="modal-withdraw-amount" className={styles.formLabel}>
                    Withdrawal Amount (VE)
                  </label>
                  <div className={styles.inputWithSuffix}>
                    <input
                      id="modal-withdraw-amount"
                      type="number"
                      min="200"
                      max={balances.VE.available}
                      step="1"
                      className={styles.formInput}
                      placeholder="e.g. 500"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      required
                    />
                    <span className={styles.inputSuffix}>VE</span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="modal-withdraw-dest" className={styles.formLabel}>
                    Payout Destination (UPI ID / Wallet / Account)
                  </label>
                  <input
                    id="modal-withdraw-dest"
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. user@okhdfcbank or 0x71C2..."
                    value={withdrawDestination}
                    onChange={(e) => setWithdrawDestination(e.target.value)}
                    required
                  />
                </div>

                {/* Prior Requests Accordion */}
                <div className={styles.historyCollapse}>
                  <div className={styles.historyHeader}>
                    <span className={styles.historyTitle}>Recent Requests History</span>
                    <button
                      type="button"
                      onClick={fetchWithdrawalHistory}
                      disabled={loadingHistory}
                      className={styles.historyRefreshBtn}
                    >
                      {loadingHistory ? 'Refreshing...' : '↻ Refresh History'}
                    </button>
                  </div>

                  {loadingHistory && withdrawalHistory.length === 0 ? (
                    <div className={styles.historyEmpty}>Loading records...</div>
                  ) : withdrawalHistory.length === 0 ? (
                    <div className={styles.historyEmpty}>No prior withdrawal requests recorded.</div>
                  ) : (
                    <div className={styles.historyList}>
                      {withdrawalHistory.slice(0, 5).map((w) => (
                        <div key={w._id || w.withdrawalId} className={styles.historyItem}>
                          <div>
                            <div className={styles.historyAmount}>
                              {w.amount?.toLocaleString()} {w.assetType || 'VE'}
                            </div>
                            <div className={styles.historyDest}>
                              {w.payoutDetails?.accountIdentifier || w.destination || 'Manual'} • {formatDate(w.createdAt)}
                            </div>
                          </div>
                          <span
                            className={`${styles.statusBadge} ${
                              w.status === 'completed'
                                ? styles.statusSuccess
                                : w.status === 'approved'
                                ? styles.statusApproved
                                : w.status === 'rejected' || w.status === 'cancelled'
                                ? styles.statusDanger
                                : styles.statusWarning
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsWithdrawModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={withdrawing || balances.VE.available < 200}
                >
                  {withdrawing ? 'Submitting Request...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Wrapper */}
      <div className={styles.dashboardWrapper}>
        {/* ======================================================== */}
        {/* SECTION 1: PROFILE HERO SHOWCASE                         */}
        {/* ======================================================== */}
        <section className={styles.profileHero} aria-labelledby="hero-username">
          <div className={styles.heroMain}>
            {/* Avatar Cluster */}
            <div className={styles.avatarCluster}>
              <div className={styles.avatarBox} aria-hidden="true">
                <span className={styles.avatarLetters}>{getInitials(profile.name)}</span>
              </div>
              <span className={styles.onlineStatusRing} title="Active Account" />
            </div>

            {/* Profile Identity Information */}
            <div className={styles.identityDetails}>
              <div className={styles.identityTopLine}>
                <h1 id="hero-username" className={styles.userName}>
                  {profile.name}
                </h1>
                <span className={styles.verifiedBadge} title="Verified Platform Account">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </span>
                <span className={styles.roleTag}>{profile.role}</span>
              </div>

              <div className={styles.identityMetaRow}>
                <span className={styles.metaEmail}>{profile.email}</span>
                <span className={styles.metaDivider}>•</span>
                <span className={styles.memberIdBadge}>
                  Member ID: <code>{profile.id ? String(profile.id).slice(-8).toUpperCase() : 'N/A'}</code>
                  <button
                    type="button"
                    className={`${styles.copyInlineBtn} ${copiedKey === 'id' ? styles.copiedActive : ''}`}
                    onClick={() => copyToClipboard(profile.id, 'Member ID', 'id')}
                    title="Copy full Member ID"
                  >
                    {copiedKey === 'id' ? 'Copied' : 'Copy'}
                  </button>
                </span>
                <span className={styles.metaDivider}>•</span>
                <span className={styles.memberSince}>
                  Joined {formatDate(profile.memberSince || profile.createdAt)}
                </span>
              </div>

              {/* Badges strip in hero */}
              <div className={styles.heroPillStrip}>
                <span className={styles.heroRankPill}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Level {formattedLevel} &mdash; {levelProgress.currentLevelName}
                </span>
                <span className={styles.heroCodePill}>
                  Invite Code: <strong>{referrals.referralCode || profile.referralCode || 'N/A'}</strong>
                  <button
                    type="button"
                    className={styles.copyPillBtn}
                    onClick={() => copyToClipboard(referrals.referralCode || profile.referralCode, 'Invite Code', 'codePill')}
                  >
                    {copiedKey === 'codePill' ? '✓' : 'Copy'}
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* Hero Quick Toolbar */}
          <div className={styles.heroToolbar}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => loadOverview(true)}
              disabled={refreshing}
              title="Refresh ledger state"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <button
              type="button"
              className={styles.btnPayoutCta}
              onClick={openWithdrawModal}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              <span>Payout</span>
            </button>
            <button
              type="button"
              className={styles.btnSignOut}
              onClick={handleLogout}
              title="Sign Out"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4A: TOP REWARD CARDS (Streak, Spin Wheel, Complete Missions) */}
        {/* ======================================================== */}
        <TopRewardCards
          onOpenStreak={() => handleQuickAction('streak')}
          onOpenSpin={() => setIsSpinModalOpen(true)}
          onOpenMissions={scrollToMissions}
          streakDay={4}
          streakMultiplier="1.5x"
          unlockedMissionsCount={achievements.unlocked}
          totalMissionsCount={achievements.total}
        />

        {/* ======================================================== */}
        {/* 4B: DAILY BONUS (Full-Width Premium Section)            */}
        {/* ======================================================== */}
        <DailyBonusCard
          claimedToday={false}
          onClaim={handleClaimDailyBonus}
          dailyAmount={50}
          streakDays={4}
          multiplier="1.5x"
        />

        {/* ======================================================== */}
        {/* 4C: TAP & EARN + SWAP CENTER (Two-Card Layout)          */}
        {/* ======================================================== */}
        <EarnCards
          onTapEarn={() => setIsTapModalOpen(true)}
          onOpenSwap={() => setIsSwapModalOpen(true)}
          availableGems={balances.GEM.available}
          availableVE={balances.VE.available}
        />

        {/* ======================================================== */}
        {/* 4D: MINE & EARN (Large Premium Feature Banner)          */}
        {/* ======================================================== */}
        <MiningBanner
          userTier={levelProgress.currentLevelName || 'Bronze Explorer'}
          onAction={() => {
            setActionFeedback({
              title: 'Mining Node Active',
              message: 'Background compute node synchronized with proof-of-engagement matrix. Generating 12.4 MH/s loyalty shares.',
              actionLabel: 'Keep Mining'
            })
          }}
        />

        {/* ======================================================== */}
        {/* 4E: STAKE & EARN (Large Premium Staking Feature Card)    */}
        {/* ======================================================== */}
        <StakingCard
          sveAvailable={balances.SVE.available}
          sveTotalEarned={balances.SVE.totalEarned}
          veAvailable={balances.VE.available}
          onOpenStake={() => setIsStakeModalOpen(true)}
        />

        {/* ======================================================== */}
        {/* 4F: CONTRIBUTION / MEGA REWARD VAULT                     */}
        {/* ======================================================== */}
        <MegaRewardVault
          userContributionVE={balances.VE.available}
          referralCode={referrals.referralCode || profile.referralCode || 'DEMO2026'}
          referralCount={referrals.totalReferrals || 1}
          onOpenVault={() => {
            setActionFeedback({
              title: 'Seasonal Mega Reward Vault',
              message: `Your eligible weight (${balances.VE.available.toLocaleString()} VE) is actively registered for the 500,000 VE seasonal jackpot drawing. Commission tier active.`,
              actionLabel: 'Got It'
            })
          }}
        />

        {/* ======================================================== */}
        {/* 4G: FIVE WALLET & ASSET BALANCES CARDS                   */}
        {/* ======================================================== */}
        <section className={styles.walletSection} aria-labelledby="wallets-heading">
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>Ecosystem Balances</span>
              <h2 id="wallets-heading" className={styles.sectionTitle}>
                Reward Balances &amp; Wallets
              </h2>
            </div>
            <span className={styles.ledgerTag}>100% Cryptographic Ledger Protected</span>
          </div>

          <div className={styles.fiveCardGrid}>
            {/* Card 1: VE */}
            <div className={`${styles.rewardCard} ${styles.cardVE}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIconBox} ${styles.iconVE}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 9.5L12 16l3.5-6.5" />
                  </svg>
                </div>
                <span className={styles.assetBadgeVE}>Primary Currency</span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.assetName}>Available VE</span>
                <div className={styles.assetValueRow}>
                  <span className={styles.assetAmount}>{balances.VE.available.toLocaleString()}</span>
                  <span className={styles.assetTicker}>VE</span>
                </div>
              </div>
              <div className={styles.cardFooterMetrics}>
                <div className={styles.footerMetric}>
                  <span>Reserved</span>
                  <strong>{balances.VE.reserved.toLocaleString()} VE</strong>
                </div>
                <div className={styles.footerMetric} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.VE.totalEarned.toLocaleString()} VE</strong>
                </div>
              </div>
            </div>

            {/* Card 2: SVE */}
            <div className={`${styles.rewardCard} ${styles.cardSVE}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIconBox} ${styles.iconSVE}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <span className={styles.assetBadgeSVE}>Yield Staked</span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.assetName}>Staked Units</span>
                <div className={styles.assetValueRow}>
                  <span className={styles.assetAmount}>{balances.SVE.available.toLocaleString()}</span>
                  <span className={styles.assetTicker}>SVE</span>
                </div>
              </div>
              <div className={styles.cardFooterMetrics}>
                <div className={styles.footerMetric}>
                  <span>Reserved</span>
                  <strong>{balances.SVE.reserved.toLocaleString()} SVE</strong>
                </div>
                <div className={styles.footerMetric} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.SVE.totalEarned.toLocaleString()} SVE</strong>
                </div>
              </div>
            </div>

            {/* Card 3: Gems */}
            <div className={`${styles.rewardCard} ${styles.cardGEM}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIconBox} ${styles.iconGEM}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12l4 6-10 13L2 9z" />
                    <path d="M11 3l-4 6 5 13 5-13-4-6" />
                    <path d="M2 9h20" />
                  </svg>
                </div>
                <span className={styles.assetBadgeGEM}>Quest Currency</span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.assetName}>Available Gems</span>
                <div className={styles.assetValueRow}>
                  <span className={styles.assetAmount}>{balances.GEM.available.toLocaleString()}</span>
                  <span className={styles.assetTicker}>GEM</span>
                </div>
              </div>
              <div className={styles.cardFooterMetrics}>
                <div className={styles.footerMetric}>
                  <span>Reserved</span>
                  <strong>{balances.GEM.reserved.toLocaleString()} GEM</strong>
                </div>
                <div className={styles.footerMetric} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.GEM.totalEarned.toLocaleString()} GEM</strong>
                </div>
              </div>
            </div>

            {/* Card 4: Tokens */}
            <div className={`${styles.rewardCard} ${styles.cardTOKEN}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIconBox} ${styles.iconTOKEN}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <span className={styles.assetBadgeTOKEN}>Platform Utility</span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.assetName}>Platform Tokens</span>
                <div className={styles.assetValueRow}>
                  <span className={styles.assetAmount}>{balances.TOKEN.available.toLocaleString()}</span>
                  <span className={styles.assetTicker}>TKN</span>
                </div>
              </div>
              <div className={styles.cardFooterMetrics}>
                <div className={styles.footerMetric}>
                  <span>Reserved</span>
                  <strong>{balances.TOKEN.reserved.toLocaleString()} TKN</strong>
                </div>
                <div className={styles.footerMetric} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.TOKEN.totalEarned.toLocaleString()} TKN</strong>
                </div>
              </div>
            </div>

            {/* Card 5: XP Card */}
            <div className={`${styles.rewardCard} ${styles.cardXP}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIconBox} ${styles.iconXP}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <span className={styles.assetBadgeXP}>Progression</span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.assetName}>Accumulated XP</span>
                <div className={styles.assetValueRow}>
                  <span className={styles.assetAmount}>{levelProgress.currentXp.toLocaleString()}</span>
                  <span className={styles.assetTicker}>XP</span>
                </div>
              </div>
              <div className={styles.cardFooterMetrics}>
                <div className={styles.footerMetric}>
                  <span>Next Level</span>
                  <strong>{levelProgress.nextLevel ? `Lvl ${levelProgress.nextLevel}` : 'Max'}</strong>
                </div>
                <div className={styles.footerMetric} style={{ textAlign: 'right' }}>
                  <span>Remaining</span>
                  <strong>{levelProgress.nextLevel ? `${levelProgress.xpRemaining.toLocaleString()} XP` : 'Top Rank'}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4G: LEVEL PROGRESSION & NEXT-LEVEL REWARD                */}
        {/* ======================================================== */}
        <section className={styles.progressionCard} aria-labelledby="progression-heading">
          <div className={styles.progressionTopRow}>
            <div className={styles.progressionRankBlock}>
              <div className={styles.rankBadgeEmblem} aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polygon points="12 8 13.5 11 17 11.5 14.5 14 15 17.5 12 16 9 17.5 9.5 14 7 11.5 10.5 11 12 8" />
                </svg>
              </div>
              <div>
                <span className={styles.sectionEyebrow}>XP Progression &amp; Tier Status</span>
                <h2 id="progression-heading" className={styles.progressionHeading}>
                  Level {formattedLevel} &mdash; {levelProgress.currentLevelName}
                </h2>
              </div>
            </div>

            <div className={styles.xpHighlightCapsule}>
              <span className={styles.xpHeroValue}>{levelProgress.currentXp.toLocaleString()}</span>
              <span className={styles.xpHeroLabel}>Total Experience Points</span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className={styles.progressTrackWrapper}>
            <div className={styles.progressInfoBar}>
              <span className={styles.progressNextTarget}>
                {levelProgress.nextLevel ? (
                  <>Progress to <strong>Level {levelProgress.nextLevel} ({levelProgress.nextLevelName})</strong></>
                ) : (
                  <strong>Supreme Grandmaster Tier Achieved</strong>
                )}
              </span>
              <span className={styles.progressPercentValue}>{levelProgress.progressPercentage}%</span>
            </div>

            <div
              className={styles.progressBarRail}
              role="progressbar"
              aria-valuenow={levelProgress.progressPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                className={styles.progressBarGlowFill}
                style={{ width: `${levelProgress.progressPercentage}%` }}
              />
            </div>

            <div className={styles.progressMetricsLine}>
              <span className={styles.progressCurrentTally}>
                {levelProgress.nextLevelXp
                  ? `${levelProgress.currentXp.toLocaleString()} / ${levelProgress.nextLevelXp.toLocaleString()} XP`
                  : `${levelProgress.currentXp.toLocaleString()} XP`}
              </span>
              <span className={styles.progressRemainingTally}>
                {levelProgress.nextLevel
                  ? `${levelProgress.xpRemaining.toLocaleString()} XP needed for Level ${levelProgress.nextLevel}`
                  : 'Max level unlocked'}
              </span>
            </div>
          </div>

          {/* Next Level Perks & Milestone Strip */}
          <div className={styles.tierPerksRow}>
            <div className={styles.perkCard}>
              <div className={styles.perkIcon}>🏆</div>
              <div className={styles.perkInfo}>
                <span className={styles.perkLabel}>Next Tier Unlock</span>
                <strong className={styles.perkValue}>
                  {levelProgress.nextLevel
                    ? `Level ${String(levelProgress.nextLevel).padStart(2, '0')} (${levelProgress.nextLevelName})`
                    : 'All Tiers Mastered'}
                </strong>
              </div>
            </div>

            <div className={styles.perkCard}>
              <div className={styles.perkIcon}>🎁</div>
              <div className={styles.perkInfo}>
                <span className={styles.perkLabel}>Next Level Reward</span>
                <strong className={styles.perkValue}>
                  {levelProgress.nextLevel ? '+500 VE Bonus & 1.25x Ad Boost' : 'Maximum Platform Perks'}
                </strong>
              </div>
            </div>

            <div className={styles.perkCard}>
              <div className={styles.perkIcon}>🛡️</div>
              <div className={styles.perkInfo}>
                <span className={styles.perkLabel}>Badge Progress</span>
                <strong className={styles.perkValue}>
                  {achievements.unlocked} of {achievements.total} Badges Unlocked
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4G: ACHIEVEMENT & BADGE GALLERY                          */}
        {/* ======================================================== */}
        <section
          ref={missionsSectionRef}
          className={styles.achievementsSection}
          aria-labelledby="achievements-heading"
        >
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>Badge Gallery</span>
              <h2 id="achievements-heading" className={styles.sectionTitle}>
                Achievements &amp; Missions ({achievements.unlocked} of {achievements.total} Unlocked)
              </h2>
            </div>
            <div className={styles.achievedSummaryPill}>
              {achievements.claimed} Rewarded &bull; {achievements.unlocked - achievements.claimed} Ready to Claim
            </div>
          </div>

          <div className={styles.achievementGrid}>
            {achievements.items && achievements.items.length > 0 ? (
              achievements.items.map((ach) => {
                const isEligibleToClaim = ach.unlocked && !ach.isClaimed
                const isXpCriteria = ach.criteria?.type === 'XP_THRESHOLD' && ach.criteria?.targetValue > 0
                const achPercent = isXpCriteria
                  ? Math.min(100, Math.round(((ach.progress || 0) / ach.criteria.targetValue) * 100))
                  : ach.unlocked
                  ? 100
                  : 0

                return (
                  <div
                    key={ach.id || ach.code}
                    className={`${styles.achievementCard} ${
                      ach.isClaimed
                        ? styles.achClaimed
                        : ach.unlocked
                        ? styles.achUnlocked
                        : styles.achLocked
                    }`}
                  >
                    <div className={styles.achHeaderRow}>
                      <div
                        className={`${styles.achIconOrb} ${
                          ach.isClaimed
                            ? styles.orbClaimed
                            : ach.unlocked
                            ? styles.orbUnlocked
                            : styles.orbLocked
                        }`}
                        aria-hidden="true"
                      >
                        {ach.isClaimed ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : ach.unlocked ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        )}
                      </div>

                      <span
                        className={`${styles.achBadgeStatus} ${
                          ach.isClaimed
                            ? styles.statusPillClaimed
                            : ach.unlocked
                            ? styles.statusPillUnlocked
                            : styles.statusPillLocked
                        }`}
                      >
                        {ach.isClaimed ? 'Claimed' : ach.unlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>

                    <div className={styles.achBody}>
                      <h3 className={styles.achTitle}>{ach.title}</h3>
                      <p className={styles.achDesc}>{ach.description}</p>

                      {!ach.unlocked && isXpCriteria && (
                        <div className={styles.achProgressBarRail} title={`${achPercent}% completed`}>
                          <div className={styles.achProgressFill} style={{ width: `${achPercent}%` }} />
                        </div>
                      )}
                    </div>

                    <div className={styles.achFooter}>
                      <span className={styles.achCriteriaText}>
                        {isXpCriteria
                          ? `Target: ${ach.criteria.targetValue.toLocaleString()} XP (${(ach.progress || 0).toLocaleString()} earned)`
                          : 'Requirement: Complete Onboarding'}
                      </span>

                      {isEligibleToClaim && (
                        <button
                          type="button"
                          className={styles.claimButton}
                          onClick={() => handleClaimAchievement(ach.id, ach.title)}
                          disabled={claimingId === ach.id}
                        >
                          {claimingId === ach.id ? 'Claiming...' : 'Claim Badge'}
                        </button>
                      )}

                      {ach.isClaimed && ach.claimedAt && (
                        <span className={styles.claimedTimestamp}>
                          ✓ Claimed {formatDate(ach.claimedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className={styles.emptyNote}>No achievements currently configured.</p>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4G: ACTIVITY LEDGER, WITHDRAWAL ENGINE & REFERRALS HUB    */}
        {/* ======================================================== */}
        <div className={styles.hubColumnsGrid}>
          {/* Left Column: Recent Activity Ledger */}
          <section className={styles.hubCard} aria-labelledby="activity-heading">
            <div className={styles.hubHeaderRow}>
              <div>
                <span className={styles.sectionEyebrow}>Financial Ledger</span>
                <h2 id="activity-heading" className={styles.hubTitle}>Recent Activity</h2>
              </div>

              {/* Tab Filters */}
              <div className={styles.tabFilters}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'credits' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('credits')}
                >
                  Credits
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${activeTab === 'withdrawals' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('withdrawals')}
                >
                  Withdrawals
                </button>
              </div>
            </div>

            {filteredActivity.length > 0 ? (
              <div className={styles.activityFeed}>
                {filteredActivity.map((act) => {
                  const isPositive = act.amount > 0 || act.type === 'CREDIT' || act.type === 'RELEASE'
                  return (
                    <div key={act.id} className={styles.activityRow}>
                      <span
                        className={`${styles.actionTypeTag} ${
                          act.type === 'CREDIT'
                            ? styles.tagCredit
                            : act.type === 'HOLD'
                            ? styles.tagHold
                            : act.type === 'RELEASE'
                            ? styles.tagRelease
                            : act.type === 'SETTLE'
                            ? styles.tagSettle
                            : styles.tagDebit
                        }`}
                      >
                        {act.type}
                      </span>

                      <div className={styles.activityMetaBlock}>
                        <p className={styles.activityDescription}>{act.description}</p>
                        <span className={styles.activityTimestamp}>{formatDateTime(act.timestamp)}</span>
                      </div>

                      <div className={`${styles.activityNumber} ${isPositive ? styles.numPositive : styles.numNegative}`}>
                        {act.amount > 0 ? `+${act.amount.toLocaleString()}` : act.amount.toLocaleString()} {act.assetType}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.emptyActivityBox}>
                <p>No recent activity found in this category.</p>
                <small>Completed task earnings, badge awards, and redemptions will display here.</small>
              </div>
            )}
          </section>

          {/* Right Column Stack: Withdrawals Summary & Referral Snapshot */}
          <div className={styles.rightStack}>
            {/* Withdrawals Overview Box */}
            <section className={styles.hubCard} aria-labelledby="withdraw-heading">
              <div className={styles.hubHeaderRow}>
                <div>
                  <span className={styles.sectionEyebrow}>Redemption Engine</span>
                  <h2 id="withdraw-heading" className={styles.hubTitle}>Withdrawal Summary</h2>
                </div>
              </div>

              <div className={styles.payoutHighlightBox}>
                <span className={styles.payoutLabel}>Total Settled Payouts</span>
                <div className={styles.payoutAmount}>
                  {withdrawals.totalWithdrawn.toLocaleString()} <span className={styles.currencyYellow}>VE</span>
                </div>
                <small className={styles.payoutNotice}>
                  Pending reservations are strictly excluded from settled totals
                </small>
              </div>

              <div className={styles.payoutStatsGrid}>
                <div className={styles.payoutStatCard}>
                  <div className={styles.payoutStatVal}>{withdrawals.totalRequests || 0}</div>
                  <div className={styles.payoutStatLbl}>Total Requests</div>
                </div>
                <div className={styles.payoutStatCard}>
                  <div className={`${styles.payoutStatVal} ${styles.valPending}`}>{withdrawals.pending || 0}</div>
                  <div className={styles.payoutStatLbl}>Pending</div>
                </div>
                <div className={styles.payoutStatCard}>
                  <div className={`${styles.payoutStatVal} ${styles.valCompleted}`}>{withdrawals.completed || 0}</div>
                  <div className={styles.payoutStatLbl}>Settled</div>
                </div>
                <div className={styles.payoutStatCard}>
                  <div className={`${styles.payoutStatVal} ${styles.valRejected}`}>{withdrawals.rejected || 0}</div>
                  <div className={styles.payoutStatLbl}>Rejected</div>
                </div>
              </div>

              <button
                type="button"
                className={styles.btnPrimaryFull}
                onClick={openWithdrawModal}
              >
                Request VE Withdrawal
              </button>
            </section>

            {/* Referral Snapshot Box */}
            <section className={styles.hubCard} aria-labelledby="referral-heading">
              <div className={styles.hubHeaderRow}>
                <div>
                  <span className={styles.sectionEyebrow}>Affiliate Network</span>
                  <h2 id="referral-heading" className={styles.hubTitle}>Referral Program</h2>
                </div>
              </div>

              <div className={styles.referralBox}>
                <span className={styles.referralLabel}>Your Unique Affiliate Code</span>
                <div className={styles.referralCodeLine}>
                  <code className={styles.codeText}>
                    {referrals.referralCode || profile.referralCode || 'N/A'}
                  </code>
                  <button
                    type="button"
                    className={styles.copyCodeButton}
                    onClick={() =>
                      copyToClipboard(
                        referrals.referralCode || profile.referralCode,
                        'Referral code',
                        'refBox'
                      )
                    }
                  >
                    {copiedKey === 'refBox' ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <div className={styles.referralMetricsRow}>
                  <div className={styles.refMetricItem}>
                    <div className={styles.refMetricNum}>{referrals.totalReferrals || 0}</div>
                    <div className={styles.refMetricTxt}>Total Invites</div>
                  </div>
                  <div className={styles.refMetricItem}>
                    <div className={`${styles.refMetricNum} ${styles.valSuccess}`}>{referrals.successfulReferrals || 0}</div>
                    <div className={styles.refMetricTxt}>Qualified</div>
                  </div>
                  <div className={styles.refMetricItem}>
                    <div className={`${styles.refMetricNum} ${styles.valPending}`}>{referrals.pendingReferrals || 0}</div>
                    <div className={styles.refMetricTxt}>Pending</div>
                  </div>
                </div>

                <p className={styles.referralTip}>
                  Earn 10% lifetime commission in GEMs when your referred peers complete tasks or watch ads.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
