import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import styles from './UserProfile.module.css'

export function UserProfile() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [claimingId, setClaimingId] = useState(null)

  // Withdrawal Request Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDestination, setWithdrawDestination] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

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
        showToast('Dashboard data refreshed successfully', 'success')
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        logout()
        navigate('/login', { replace: true })
        return
      }
      setError(err.message || 'Failed to load profile dashboard.')
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
          setError(err.message || 'Failed to load profile dashboard.')
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
  const copyToClipboard = async (text, label) => {
    if (!text) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        showToast(`${label} copied to clipboard!`, 'success')
      } else {
        const input = document.createElement('textarea')
        input.value = text
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        showToast(`${label} copied to clipboard!`, 'success')
      }
    } catch {
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

  // Request withdrawal submit
  const handleCreateWithdrawal = async (e) => {
    e.preventDefault()
    const amountNum = Number(withdrawAmount)
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid withdrawal amount.', 'error')
      return
    }
    if (!withdrawDestination.trim()) {
      showToast('Please provide a payout destination address.', 'error')
      return
    }

    setWithdrawing(true)
    try {
      await api.user.createWithdrawal({
        amount: amountNum,
        destination: withdrawDestination.trim()
      })
      showToast('Withdrawal request submitted successfully!', 'success')
      setIsWithdrawModalOpen(false)
      setWithdrawAmount('')
      setWithdrawDestination('')
      await loadOverview(false)
    } catch (err) {
      showToast(err.message || 'Failed to submit withdrawal request.', 'error')
    } finally {
      setWithdrawing(false)
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
    if (!name) return 'U'
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className={styles.dashboardContainer} data-theme="dark-gaming">
        <div className={styles.dashboardWrapper}>
          <div className={`${styles.skeletonCard} mb-4`}>
            <div className="d-flex align-items-center gap-3">
              <div className={styles.skeletonAvatar} />
              <div style={{ flex: 1 }}>
                <div className={styles.skeletonLine} style={{ width: '35%', height: '1.5rem' }} />
                <div className={styles.skeletonLine} style={{ width: '55%', height: '1rem', marginTop: '0.5rem' }} />
              </div>
            </div>
          </div>
          <div className="row g-4 mb-4">
            <div className="col-12 col-xl-8">
              <div className={styles.skeletonCard} style={{ height: '240px' }} />
            </div>
            <div className="col-12 col-xl-4">
              <div className={styles.skeletonCard} style={{ height: '240px' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboardContainer} data-theme="dark-gaming">
        <div className={styles.dashboardWrapper}>
          <div className="alert alert-danger p-4 text-center shadow-sm" role="alert">
            <h4 className="alert-heading fw-bold mb-2">Unable to Load Dashboard</h4>
            <p className="mb-3">{error}</p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-danger btn-sm px-4"
                onClick={() => loadOverview(true)}
              >
                Retry
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-4"
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

  return (
    <div className={styles.dashboardContainer} data-theme="dark-gaming">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`${styles.toastNotification} ${
            toastMessage.type === 'error'
              ? styles.toastError
              : toastMessage.type === 'success'
              ? styles.toastSuccess
              : styles.toastInfo
          }`}
          role="status"
          aria-live="polite"
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            className={styles.toastCloseBtn}
            onClick={() => setToastMessage(null)}
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Withdrawal Request Modal */}
      {isWithdrawModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="withdraw-modal-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 id="withdraw-modal-title" className={styles.modalTitle}>
                Request VE Withdrawal
              </h3>
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
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className={styles.formLabel}>Available Balance:</span>
                    <strong style={{ color: '#34D399', fontWeight: 800 }}>{balances.VE.available.toLocaleString()} VEs</strong>
                  </div>
                  <small className="text-muted d-block mb-3">
                    Minimum withdrawal is 200 VE. Requested funds will be reserved immediately upon submission.
                  </small>
                </div>
                <div className="mb-3">
                  <label htmlFor="withdraw-amount-input" className={styles.formLabel}>
                    Withdrawal Amount (VE):
                  </label>
                  <input
                    id="withdraw-amount-input"
                    type="number"
                    min="200"
                    max={balances.VE.available}
                    step="1"
                    className={styles.formControl}
                    placeholder="e.g. 500"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-2">
                  <label htmlFor="withdraw-dest-input" className={styles.formLabel}>
                    Destination Address / Account:
                  </label>
                  <input
                    id="withdraw-dest-input"
                    type="text"
                    className={styles.formControl}
                    placeholder="e.g. 0x71C... or user account"
                    value={withdrawDestination}
                    onChange={(e) => setWithdrawDestination(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondaryAction}
                  onClick={() => setIsWithdrawModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimaryAction}
                  disabled={withdrawing || balances.VE.available < 200}
                >
                  {withdrawing ? 'Submitting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.dashboardWrapper}>
        {/* ======================================================== */}
        {/* SECTION A: WELCOME HERO & HORIZONTAL QUICK ACTIONS       */}
        {/* ======================================================== */}
        <section className={styles.welcomeSection} aria-labelledby="welcome-heading">
          <div className={styles.welcomeUserArea}>
            <div className={styles.userAvatar} aria-hidden="true">
              {getInitials(profile.name)}
              <span className={styles.onlineIndicator} title="Active Account" />
            </div>
            <div className={styles.welcomeTextMeta}>
              <div className={styles.greetingRow}>
                <h1 id="welcome-heading" className={styles.welcomeGreeting}>
                  Welcome back, {profile.name} 👋
                </h1>
                <span className={styles.statusPill}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                  {profile.status}
                </span>
                <span className={styles.rolePill}>{profile.role}</span>
                <span className={styles.xpBadgeHighlight} style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem' }}>
                  ★ {levelProgress.currentLevelName}
                </span>
              </div>
              <div className={styles.subMetaLine}>
                <span>{profile.email}</span>
                <span className={styles.metaDot}>•</span>
                <span>Member since {formatDate(profile.memberSince || profile.createdAt)}</span>
                <span className={styles.metaDot}>•</span>
                <span className={styles.idBadge}>
                  ID: <code>{profile.id ? String(profile.id).slice(-8) : 'N/A'}</code>
                  <button
                    type="button"
                    className={styles.copyMiniBtn}
                    onClick={() => copyToClipboard(profile.id, 'User ID')}
                    title="Copy full user ID"
                    aria-label="Copy User ID"
                  >
                    Copy
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* Horizontal Quick Actions */}
          <div className={styles.quickActionsRow}>
            <button
              type="button"
              className={styles.btnSecondaryAction}
              onClick={() => loadOverview(true)}
              disabled={refreshing}
              title="Refresh dashboard from server"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className={styles.btnPrimaryAction}
              onClick={() => setIsWithdrawModalOpen(true)}
              title="Request funds withdrawal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              <span>Request Withdrawal</span>
            </button>

            <button
              type="button"
              className={styles.btnSecondaryAction}
              onClick={() => copyToClipboard(referrals.referralCode || profile.referralCode, 'Invite Code')}
              title="Copy your referral invite code"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              <span>Invite Friends</span>
            </button>

            <button
              type="button"
              className={styles.btnDangerAction}
              onClick={handleLogout}
              title="Sign out of platform"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* ASYMMETRIC 2-COLUMN DASHBOARD GRID (70% / 30%)           */}
        {/* ======================================================== */}
        <div className="row g-4">
          {/* ======================================================== */}
          {/* LEFT / CENTER MAIN COLUMN (~68% width)                   */}
          {/* ======================================================== */}
          <div className="col-12 col-xl-8">
            {/* Section B: Layered Financial Card & Asset Hub */}
            <section className={styles.walletHubCard} aria-labelledby="wallet-hub-heading">
              <div className={styles.hubHeader}>
                <h2 id="wallet-hub-heading" className={styles.hubTitle}>
                  Multi-Asset Financial Hub
                </h2>
                <span className={styles.hubSubtext}>Immutable Ledger Backed</span>
              </div>

              <div className={styles.walletComposition}>
                {/* Primary Executive Metal Card (VE) */}
                <div className={styles.executiveCard}>
                  <div className={styles.cardDecorativeCircle} aria-hidden="true" />
                  <div className={styles.cardTopRow}>
                    <div className={styles.cardChipGraphic} aria-hidden="true" />
                    <span className={styles.cardNetworkLabel}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m4.93 4.93 4.24 4.24" />
                        <path d="m14.83 9.17 4.24-4.24" />
                        <path d="m14.83 14.83 4.24 4.24" />
                        <path d="m9.17 14.83-4.24 4.24" />
                      </svg>
                      VE Rewards
                    </span>
                  </div>

                  <div className={styles.cardBalanceBlock}>
                    <span className={styles.cardBalanceLabel}>Available Balance</span>
                    <div className={styles.cardBalanceNumber}>
                      {balances.VE.available.toLocaleString()}
                      <span>VEs</span>
                    </div>
                  </div>

                  <div className={styles.cardBottomRow}>
                    <div>
                      <div className={styles.cardHolderName}>{profile.name.toUpperCase()}</div>
                      <small style={{ fontSize: '0.72rem', color: '#C7D2FE' }}>Tier: {levelProgress.currentLevelName}</small>
                    </div>
                    <div className={styles.cardBreakdown}>
                      <div>
                        <span>Reserved: </span>
                        <strong>{balances.VE.reserved.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span>Lifetime: </span>
                        <strong>{balances.VE.totalEarned.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Asset Stack (SVE, GEM, TOKEN) */}
                <div className={styles.secondaryAssetsCol}>
                  {/* SVE Asset */}
                  <div className={`${styles.subAssetTile} ${styles.subAssetSve}`}>
                    <div className={styles.subAssetIdentity}>
                      <div className={styles.subAssetIcon}>SVE</div>
                      <div className={styles.subAssetNameBlock}>
                        <h4 className={styles.subAssetName}>Staked Units</h4>
                        <span className={styles.subAssetSubtext}>
                          Reserved: {balances.SVE.reserved.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.subAssetNumbers}>
                      <div className={styles.subAssetAvailable}>
                        {balances.SVE.available.toLocaleString()}
                      </div>
                      <span className={styles.subAssetLifetime}>
                        Lifetime: {balances.SVE.totalEarned.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* GEM Asset */}
                  <div className={`${styles.subAssetTile} ${styles.subAssetGem}`}>
                    <div className={styles.subAssetIdentity}>
                      <div className={styles.subAssetIcon}>GEM</div>
                      <div className={styles.subAssetNameBlock}>
                        <h4 className={styles.subAssetName}>Quest Gems</h4>
                        <span className={styles.subAssetSubtext}>
                          Reserved: {balances.GEM.reserved.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.subAssetNumbers}>
                      <div className={styles.subAssetAvailable}>
                        {balances.GEM.available.toLocaleString()}
                      </div>
                      <span className={styles.subAssetLifetime}>
                        Lifetime: {balances.GEM.totalEarned.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* TOKEN Asset */}
                  <div className={`${styles.subAssetTile} ${styles.subAssetToken}`}>
                    <div className={styles.subAssetIdentity}>
                      <div className={styles.subAssetIcon}>TKN</div>
                      <div className={styles.subAssetNameBlock}>
                        <h4 className={styles.subAssetName}>Platform Tokens</h4>
                        <span className={styles.subAssetSubtext}>
                          Reserved: {balances.TOKEN.reserved.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.subAssetNumbers}>
                      <div className={styles.subAssetAvailable}>
                        {balances.TOKEN.available.toLocaleString()}
                      </div>
                      <span className={styles.subAssetLifetime}>
                        Lifetime: {balances.TOKEN.totalEarned.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section C: Progression & Level Tier */}
            <section className={styles.dashboardCard} aria-labelledby="progression-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Gamified Progression</span>
                  <h2 id="progression-heading" className={styles.cardMainTitle}>
                    Level {String(levelProgress.currentLevel).padStart(2, '0')} — {levelProgress.currentLevelName}
                  </h2>
                </div>
                <div className={styles.xpBadgeHighlight}>
                  {levelProgress.currentXp.toLocaleString()} Total XP
                </div>
              </div>

              <div className={styles.progressContainer}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                    {levelProgress.nextLevel ? (
                      <>
                        Progress toward <strong>Level {levelProgress.nextLevel} ({levelProgress.nextLevelName})</strong>
                      </>
                    ) : (
                      <strong>Maximum Tier Mastered</strong>
                    )}
                  </span>
                  <span className="fw-bold" style={{ fontSize: '0.95rem', color: '#38BDF8' }}>
                    {levelProgress.progressPercentage}%
                  </span>
                </div>

                <div
                  className={styles.progressBarWrapper}
                  role="progressbar"
                  aria-valuenow={levelProgress.progressPercentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${levelProgress.progressPercentage}%` }}
                  />
                </div>

                <div className={styles.progressMetaText}>
                  <span>
                    {levelProgress.nextLevelXp
                      ? `${levelProgress.currentXp.toLocaleString()} / ${levelProgress.nextLevelXp.toLocaleString()} XP`
                      : `${levelProgress.currentXp.toLocaleString()} XP`}
                  </span>
                  <span className={styles.progressRemaining}>
                    {levelProgress.nextLevel
                      ? `${levelProgress.xpRemaining.toLocaleString()} XP remaining`
                      : 'Max Tier achieved'}
                  </span>
                </div>
              </div>
            </section>

            {/* Section D: Achievements & Badges */}
            <section className={styles.dashboardCard} aria-labelledby="achievements-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Milestones & Badges</span>
                  <h2 id="achievements-heading" className={styles.cardMainTitle}>
                    Achievements ({achievements.unlocked} of {achievements.total} Unlocked)
                  </h2>
                </div>
              </div>

              <div className={styles.achievementGrid}>
                {achievements.items && achievements.items.length > 0 ? (
                  achievements.items.map((ach) => {
                    const isEligibleToClaim = ach.unlocked && !ach.isClaimed
                    return (
                      <div
                        key={ach.id || ach.code}
                        className={`${styles.achievementCardItem} ${
                          ach.isClaimed
                            ? styles.achClaimedItem
                            : ach.unlocked
                            ? styles.achUnlockedItem
                            : styles.achLockedItem
                        }`}
                      >
                        <div
                          className={`${styles.achBadgeCircle} ${
                            ach.isClaimed
                              ? styles.badgeClaimedIcon
                              : ach.unlocked
                              ? styles.badgeUnlockedIcon
                              : styles.badgeLockedIcon
                          }`}
                        >
                          {ach.isClaimed ? '✓' : ach.unlocked ? '★' : '🔒'}
                        </div>

                        <div className={styles.achContent}>
                          <div className={styles.achTitleRow}>
                            <h3 className={styles.achItemTitle}>{ach.title}</h3>
                            {ach.isClaimed ? (
                              <span className={styles.achStatusClaimed}>
                                Claimed
                              </span>
                            ) : ach.unlocked ? (
                              <span className={styles.achStatusUnlocked}>
                                Unlocked
                              </span>
                            ) : (
                              <span className={styles.achStatusLocked}>
                                Locked
                              </span>
                            )}
                          </div>
                          <p className={styles.achItemDescription}>{ach.description}</p>

                          <div className={styles.achMetaRow}>
                            <span>
                              {ach.criteria?.type === 'XP_THRESHOLD'
                                ? `Goal: ${ach.criteria.targetValue.toLocaleString()} XP (${ach.progress.toLocaleString()} earned)`
                                : 'Requirement: Join platform'}
                            </span>

                            {isEligibleToClaim && (
                              <button
                                type="button"
                                className={styles.claimBadgeBtn}
                                onClick={() => handleClaimAchievement(ach.id, ach.title)}
                                disabled={claimingId === ach.id}
                              >
                                {claimingId === ach.id ? 'Claiming...' : 'Claim Badge'}
                              </button>
                            )}

                            {ach.isClaimed && ach.claimedAt && (
                              <span className="text-success fw-bold" style={{ fontSize: '0.75rem' }}>
                                Claimed on {formatDate(ach.claimedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-muted text-center py-3">No achievements configured.</p>
                )}
              </div>
            </section>

            {/* Section E: Recent Financial Activity (Persisted Ledger) */}
            <section className={styles.dashboardCard} aria-labelledby="activity-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Financial Ledger</span>
                  <h2 id="activity-heading" className={styles.cardMainTitle}>
                    Recent Financial Activity
                  </h2>
                </div>
                <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Live backend audit records
                </span>
              </div>

              {recentActivity && recentActivity.length > 0 ? (
                <div className={styles.activityList}>
                  {recentActivity.map((act) => {
                    const isPositive = act.amount > 0 || act.type === 'CREDIT' || act.type === 'RELEASE'
                    return (
                      <div key={act.id} className={styles.activityRow}>
                        <span
                          className={`${styles.typeBadge} ${
                            act.type === 'CREDIT'
                              ? styles.typeCredit
                              : act.type === 'HOLD'
                              ? styles.typeHold
                              : act.type === 'RELEASE'
                              ? styles.typeRelease
                              : act.type === 'SETTLE'
                              ? styles.typeSettle
                              : styles.typeDebit
                          }`}
                        >
                          {act.type}
                        </span>

                        <div className={styles.activityDetails}>
                          <p className={styles.activityDesc}>{act.description}</p>
                          <small className={styles.activityTime}>
                            {formatDateTime(act.timestamp)}
                          </small>
                        </div>

                        <div
                          className={`${styles.activityAmount} ${
                            isPositive ? styles.amountPositive : styles.amountNegative
                          }`}
                        >
                          {act.amount > 0 ? `+${act.amount.toLocaleString()}` : act.amount.toLocaleString()}{' '}
                          {act.assetType}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <p className="fw-bold mb-1">No Recent Activity</p>
                  <small>Your transactions and earnings will be securely listed here.</small>
                </div>
              )}
            </section>
          </div>

          {/* ======================================================== */}
          {/* RIGHT RAIL COLUMN (~32% width)                           */}
          {/* ======================================================== */}
          <div className="col-12 col-xl-4">
            {/* Section F: Withdrawals Overview */}
            <section className={styles.dashboardCard} aria-labelledby="withdrawals-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Redemption Overview</span>
                  <h2 id="withdrawals-heading" className={styles.cardMainTitle}>
                    Withdrawals
                  </h2>
                </div>
              </div>

              {/* Total Successfully Withdrawn Box */}
              <div className={styles.withdrawalSummaryCard}>
                <span className={styles.withdrawalSummaryLabel}>Total Successfully Withdrawn</span>
                <div className={styles.withdrawalSummaryValue}>
                  {withdrawals.totalWithdrawn.toLocaleString()} VEs
                </div>
                <small className={styles.withdrawalSummarySubtext}>
                  Excludes pending reservations strictly
                </small>
              </div>

              {/* 4-Stat Grid */}
              <div className={styles.statGrid4}>
                <div className={styles.statBox}>
                  <div className={styles.statBoxValue}>{withdrawals.totalRequests || 0}</div>
                  <div className={styles.statBoxLabel}>Total Requests</div>
                </div>
                <div className={styles.statBox}>
                  <div className={`${styles.statBoxValue} text-warning`}>{withdrawals.pending || 0}</div>
                  <div className={styles.statBoxLabel}>Pending</div>
                </div>
                <div className={styles.statBox}>
                  <div className={`${styles.statBoxValue} text-success`}>{withdrawals.completed || 0}</div>
                  <div className={styles.statBoxLabel}>Completed</div>
                </div>
                <div className={styles.statBox}>
                  <div className={`${styles.statBoxValue} text-danger`}>{withdrawals.rejected || 0}</div>
                  <div className={styles.statBoxLabel}>Rejected</div>
                </div>
              </div>

              <button
                type="button"
                className={`w-100 ${styles.btnPrimaryAction} justify-content-center`}
                onClick={() => setIsWithdrawModalOpen(true)}
              >
                Request Withdrawal
              </button>
            </section>

            {/* Section G: Referral Snapshot */}
            <section className={styles.dashboardCard} aria-labelledby="referrals-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Grow Your Network</span>
                  <h2 id="referrals-heading" className={styles.cardMainTitle}>
                    Referral Snapshot
                  </h2>
                </div>
              </div>

              <div className={styles.referralCardBox}>
                <small className="text-uppercase fw-bold" style={{ fontSize: '0.72rem', color: '#CBD5E1', letterSpacing: '0.5px' }}>
                  Your Unique Invite Code
                </small>
                <div className={styles.referralCodeDisplayRow}>
                  <code className={styles.referralCodeNumber}>
                    {referrals.referralCode || profile.referralCode || 'N/A'}
                  </code>
                  <button
                    type="button"
                    className={styles.copyCodeBtn}
                    onClick={() =>
                      copyToClipboard(
                        referrals.referralCode || profile.referralCode,
                        'Referral code'
                      )
                    }
                  >
                    Copy Code
                  </button>
                </div>

                <div className={styles.referralStatsRow}>
                  <div className={styles.referralStatItem}>
                    <div className={styles.referralStatValue}>{referrals.totalReferrals || 0}</div>
                    <div className={styles.referralStatLabel}>Total</div>
                  </div>
                  <div className={styles.referralStatItem}>
                    <div className={`${styles.referralStatValue} text-success`}>
                      {referrals.successfulReferrals || 0}
                    </div>
                    <div className={styles.referralStatLabel}>Successful</div>
                  </div>
                  <div className={styles.referralStatItem}>
                    <div className={`${styles.referralStatValue} text-warning`}>
                      {referrals.pendingReferrals || 0}
                    </div>
                    <div className={styles.referralStatLabel}>Pending</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.85rem', lineHeight: '1.4', textAlign: 'center' }}>
                  🎁 Share your invite code with friends to unlock bonus XP and rewards on their first quest completion!
                </div>
              </div>
            </section>

            {/* Section H: Security & Verification Profile */}
            <section className={styles.dashboardCard} aria-labelledby="security-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Account Verification</span>
                  <h2 id="security-heading" className={styles.cardMainTitle}>
                    Identity & Security
                  </h2>
                </div>
                <span className={styles.achStatusClaimed} style={{ fontSize: '0.72rem' }}>
                  ✓ Ledger Verified
                </span>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Account Status</span>
                  <span className={styles.statusPill}>{profile.status}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Platform Role</span>
                  <span className={styles.rolePill}>{profile.role}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Account ID</span>
                  <code style={{ fontSize: '0.85rem', color: '#818CF8', fontWeight: 800 }}>
                    {profile.id ? String(profile.id).slice(-8) : 'N/A'}
                  </code>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Registration Date</span>
                  <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                    {formatDate(profile.memberSince || profile.createdAt)}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
