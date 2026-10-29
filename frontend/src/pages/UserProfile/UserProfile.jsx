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

  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // Toast auto-dismiss
  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }, [])

  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    try {
      const data = await api.user.getOverview()
      setOverview(data)
      setError(null)
      if (isRefresh) {
        showToast('Dashboard data refreshed', 'success')
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

  // Format date helper
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

  // Get initials for avatar
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
      <div className={styles.dashboardContainer}>
        <div className={styles.dashboardWrapper}>
          {/* Skeleton Hero */}
          <div className={`${styles.skeletonCard} mb-4`}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonAvatar}></div>
              <div style={{ flex: 1 }}>
                <div className={styles.skeletonLine} style={{ width: '35%', height: '1.5rem' }}></div>
                <div className={styles.skeletonLine} style={{ width: '50%', height: '1rem', marginTop: '0.5rem' }}></div>
              </div>
            </div>
          </div>
          {/* Skeleton Grid */}
          <div className="row g-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="col-12 col-sm-6 col-lg-3">
                <div className={styles.skeletonCard} style={{ height: '140px' }}></div>
              </div>
            ))}
          </div>
          {/* Skeleton Progress */}
          <div className={`${styles.skeletonCard} mb-4`} style={{ height: '180px' }}></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboardContainer}>
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
    <div className={styles.dashboardContainer}>
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

      <div className={styles.dashboardWrapper}>
        {/* ======================================================== */}
        {/* SECTION A: PROFILE HERO                                   */}
        {/* ======================================================== */}
        <section className={styles.heroCard} aria-labelledby="profile-heading">
          <div className={styles.heroHeader}>
            <div className={styles.avatarAndMeta}>
              <div className={styles.avatar} aria-hidden="true">
                {getInitials(profile.name)}
              </div>
              <div className={styles.metaDetails}>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                  <h1 id="profile-heading" className={styles.userName}>
                    {profile.name}
                  </h1>
                  <span className={`${styles.statusBadge} ${profile.status === 'active' ? styles.statusActive : ''}`}>
                    {profile.status}
                  </span>
                  <span className={styles.roleBadge}>{profile.role}</span>
                </div>
                <p className={styles.userEmail}>{profile.email}</p>
                <div className={styles.subMetaRow}>
                  <span className={styles.memberSince}>
                    Member since {formatDate(profile.memberSince || profile.createdAt)}
                  </span>
                  <span className={styles.metaDivider}>•</span>
                  <span className={styles.userIdChip}>
                    ID: <code>{profile.id ? String(profile.id).slice(-8) : 'N/A'}</code>
                    <button
                      type="button"
                      className={styles.copySmallBtn}
                      onClick={() => copyToClipboard(profile.id, 'User ID')}
                      title="Copy User ID"
                      aria-label="Copy User ID"
                    >
                      Copy
                    </button>
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.heroActions}>
              <button
                type="button"
                className={`btn btn-sm ${styles.actionBtnOutline}`}
                onClick={() => loadOverview(true)}
                disabled={refreshing}
                title="Refresh dashboard from server"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${styles.actionBtnDanger}`}
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION B: REWARD ASSETS                                  */}
        {/* ======================================================== */}
        <section className="mb-4" aria-labelledby="rewards-heading">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 id="rewards-heading" className={styles.sectionHeading}>
              <span>Your Reward Assets</span>
            </h2>
            <span className={styles.sectionSubtext}>Backed by immutable ledger</span>
          </div>

          <div className="row g-3">
            {/* VE Card */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div className={`${styles.assetCard} ${styles.assetVe}`}>
                <div className={styles.assetHeader}>
                  <div className={styles.assetBadge}>VE</div>
                  <span className={styles.assetLabel}>Primary Rewards</span>
                </div>
                <div className={styles.assetBalance}>
                  {balances.VE.available.toLocaleString()}
                  <span className={styles.assetUnit}>VEs</span>
                </div>
                <div className={styles.assetBreakdown}>
                  <div className={styles.breakdownRow}>
                    <span>Reserved:</span>
                    <strong>{balances.VE.reserved.toLocaleString()}</strong>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Lifetime Earned:</span>
                    <strong>{balances.VE.totalEarned.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SVE Card */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div className={`${styles.assetCard} ${styles.assetSve}`}>
                <div className={styles.assetHeader}>
                  <div className={styles.assetBadge}>SVE</div>
                  <span className={styles.assetLabel}>Staked Units</span>
                </div>
                <div className={styles.assetBalance}>
                  {balances.SVE.available.toLocaleString()}
                  <span className={styles.assetUnit}>SVEs</span>
                </div>
                <div className={styles.assetBreakdown}>
                  <div className={styles.breakdownRow}>
                    <span>Reserved:</span>
                    <strong>{balances.SVE.reserved.toLocaleString()}</strong>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Lifetime Earned:</span>
                    <strong>{balances.SVE.totalEarned.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Gems Card */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div className={`${styles.assetCard} ${styles.assetGem}`}>
                <div className={styles.assetHeader}>
                  <div className={styles.assetBadge}>GEM</div>
                  <span className={styles.assetLabel}>Quest Gems</span>
                </div>
                <div className={styles.assetBalance}>
                  {balances.GEM.available.toLocaleString()}
                  <span className={styles.assetUnit}>Gems</span>
                </div>
                <div className={styles.assetBreakdown}>
                  <div className={styles.breakdownRow}>
                    <span>Reserved:</span>
                    <strong>{balances.GEM.reserved.toLocaleString()}</strong>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Lifetime Earned:</span>
                    <strong>{balances.GEM.totalEarned.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Tokens Card */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div className={`${styles.assetCard} ${styles.assetToken}`}>
                <div className={styles.assetHeader}>
                  <div className={styles.assetBadge}>TOKEN</div>
                  <span className={styles.assetLabel}>Platform Tokens</span>
                </div>
                <div className={styles.assetBalance}>
                  {balances.TOKEN.available.toLocaleString()}
                  <span className={styles.assetUnit}>Tokens</span>
                </div>
                <div className={styles.assetBreakdown}>
                  <div className={styles.breakdownRow}>
                    <span>Reserved:</span>
                    <strong>{balances.TOKEN.reserved.toLocaleString()}</strong>
                  </div>
                  <div className={styles.breakdownRow}>
                    <span>Lifetime Earned:</span>
                    <strong>{balances.TOKEN.totalEarned.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION C: LEVEL AND XP PROGRESS                          */}
        {/* ======================================================== */}
        <section className="mb-4" aria-labelledby="level-heading">
          <div className={styles.dashboardCard}>
            <div className={styles.cardHeaderFlex}>
              <div>
                <span className={styles.cardEyebrow}>Gamified Progression</span>
                <h2 id="level-heading" className={styles.cardMainTitle}>
                  Level {String(levelProgress.currentLevel).padStart(2, '0')} — {levelProgress.currentLevelName}
                </h2>
              </div>
              <div className={styles.xpTotalBadge}>
                <span>{levelProgress.currentXp.toLocaleString()} Total XP</span>
              </div>
            </div>

            <div className={styles.progressContainer}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className={styles.progressStatusText}>
                  {levelProgress.nextLevel ? (
                    <>
                      Progress to <strong>Level {levelProgress.nextLevel} ({levelProgress.nextLevelName})</strong>
                    </>
                  ) : (
                    <strong>Maximum Level Achieved</strong>
                  )}
                </span>
                <span className={styles.progressPercentage}>
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
                ></div>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <span className={styles.progressDetailText}>
                  {levelProgress.nextLevelXp
                    ? `${levelProgress.currentXp.toLocaleString()} / ${levelProgress.nextLevelXp.toLocaleString()} XP`
                    : `${levelProgress.currentXp.toLocaleString()} XP`}
                </span>
                <span className={styles.progressRemainingText}>
                  {levelProgress.nextLevel
                    ? `${levelProgress.xpRemaining.toLocaleString()} XP remaining`
                    : 'Max Tier reached'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Section: Achievements & (Referrals + Withdrawals) */}
        <div className="row g-4 mb-4">
          {/* ======================================================== */}
          {/* SECTION D: ACHIEVEMENTS & BADGES                         */}
          {/* ======================================================== */}
          <div className="col-12 col-lg-7">
            <section className={styles.dashboardCard} aria-labelledby="achievements-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Milestones & Badges</span>
                  <h2 id="achievements-heading" className={styles.cardMainTitle}>
                    Achievements ({achievements.unlocked} of {achievements.total} Unlocked)
                  </h2>
                </div>
              </div>

              <div className={styles.achievementList}>
                {achievements.items && achievements.items.length > 0 ? (
                  achievements.items.map((ach) => {
                    const isEligibleToClaim = ach.unlocked && !ach.isClaimed
                    return (
                      <div
                        key={ach.id || ach.code}
                        className={`${styles.achievementItem} ${
                          ach.isClaimed
                            ? styles.achClaimed
                            : ach.unlocked
                            ? styles.achUnlocked
                            : styles.achLocked
                        }`}
                      >
                        <div className={styles.achIconCol}>
                          <div
                            className={`${styles.achBadge} ${
                              ach.unlocked ? styles.achBadgeUnlocked : styles.achBadgeLocked
                            }`}
                          >
                            {ach.isClaimed ? '✓' : ach.unlocked ? '★' : '🔒'}
                          </div>
                        </div>

                        <div className={styles.achDetailsCol}>
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                            <h3 className={styles.achTitle}>{ach.title}</h3>
                            {ach.isClaimed ? (
                              <span className={styles.pillClaimed}>Claimed</span>
                            ) : ach.unlocked ? (
                              <span className={styles.pillUnlocked}>Unlocked</span>
                            ) : (
                              <span className={styles.pillLocked}>Locked</span>
                            )}
                          </div>
                          <p className={styles.achDescription}>{ach.description}</p>

                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2">
                            <span className={styles.achCriteriaText}>
                              {ach.criteria?.type === 'XP_THRESHOLD'
                                ? `Goal: ${ach.criteria.targetValue.toLocaleString()} XP (${ach.progress.toLocaleString()} earned)`
                                : 'Requirement: Join platform'}
                            </span>

                            {isEligibleToClaim && (
                              <button
                                type="button"
                                className={`btn btn-sm ${styles.claimBtn}`}
                                onClick={() => handleClaimAchievement(ach.id, ach.title)}
                                disabled={claimingId === ach.id}
                              >
                                {claimingId === ach.id ? 'Claiming...' : 'Claim Badge'}
                              </button>
                            )}

                            {ach.isClaimed && ach.claimedAt && (
                              <small className={styles.claimTimestamp}>
                                Claimed on {formatDate(ach.claimedAt)}
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className={styles.emptyCardState}>
                    <p>No achievements configured.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Referrals + Withdrawals */}
          <div className="col-12 col-lg-5">
            {/* ======================================================== */}
            {/* SECTION E: REFERRAL SNAPSHOT                             */}
            {/* ======================================================== */}
            <section className={`${styles.dashboardCard} mb-4`} aria-labelledby="referrals-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Grow Your Network</span>
                  <h2 id="referrals-heading" className={styles.cardMainTitle}>
                    Referral Snapshot
                  </h2>
                </div>
              </div>

              <div className={styles.referralBox}>
                <span className={styles.referralBoxLabel}>Your Unique Invite Code</span>
                <div className={styles.referralCodeRow}>
                  <code className={styles.referralCodeDisplay}>
                    {referrals.referralCode || profile.referralCode || 'N/A'}
                  </code>
                  <button
                    type="button"
                    className={`btn btn-sm ${styles.copyCodeBtn}`}
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
              </div>

              <div className={styles.statGrid}>
                <div className={styles.statCell}>
                  <div className={styles.statNumber}>{referrals.totalReferrals || 0}</div>
                  <div className={styles.statLabel}>Total Invites</div>
                </div>
                <div className={styles.statCell}>
                  <div className={styles.statNumber}>{referrals.successfulReferrals || 0}</div>
                  <div className={styles.statLabel}>Successful</div>
                </div>
                <div className={styles.statCell}>
                  <div className={styles.statNumber}>{referrals.pendingReferrals || 0}</div>
                  <div className={styles.statLabel}>Pending</div>
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* SECTION F: WITHDRAWAL OVERVIEW                           */}
            {/* ======================================================== */}
            <section className={styles.dashboardCard} aria-labelledby="withdrawals-heading">
              <div className={styles.cardHeaderFlex}>
                <div>
                  <span className={styles.cardEyebrow}>Redemption Overview</span>
                  <h2 id="withdrawals-heading" className={styles.cardMainTitle}>
                    Withdrawals
                  </h2>
                </div>
              </div>

              <div className={styles.totalWithdrawnBox}>
                <span className={styles.totalWithdrawnLabel}>
                  Total Successfully Withdrawn
                </span>
                <div className={styles.totalWithdrawnNumber}>
                  {withdrawals.totalWithdrawn.toLocaleString()}
                  <span className={styles.assetUnit}>VEs</span>
                </div>
                <small className={styles.nonNegotiableNote}>
                  Excludes pending reservations strictly
                </small>
              </div>

              <div className={styles.statGrid}>
                <div className={styles.statCell}>
                  <div className={styles.statNumber}>{withdrawals.totalRequests || 0}</div>
                  <div className={styles.statLabel}>Requests</div>
                </div>
                <div className={styles.statCell}>
                  <div className={`${styles.statNumber} ${styles.colorAmber}`}>
                    {withdrawals.pending || 0}
                  </div>
                  <div className={styles.statLabel}>Pending</div>
                </div>
                <div className={styles.statCell}>
                  <div className={`${styles.statNumber} ${styles.colorGreen}`}>
                    {withdrawals.completed || 0}
                  </div>
                  <div className={styles.statLabel}>Completed</div>
                </div>
                <div className={styles.statCell}>
                  <div className={`${styles.statNumber} ${styles.colorRed}`}>
                    {withdrawals.rejected || 0}
                  </div>
                  <div className={styles.statLabel}>Rejected</div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION G: RECENT ACTIVITY (PERSISTED EVENTS)             */}
        {/* ======================================================== */}
        <section className={styles.dashboardCard} aria-labelledby="activity-heading">
          <div className={styles.cardHeaderFlex}>
            <div>
              <span className={styles.cardEyebrow}>Persisted Ledger Records</span>
              <h2 id="activity-heading" className={styles.cardMainTitle}>
                Recent Activity
              </h2>
            </div>
            <span className={styles.sectionSubtext}>Real backend audit events</span>
          </div>

          {recentActivity && recentActivity.length > 0 ? (
            <div className={styles.activityTimeline}>
              {recentActivity.map((act) => {
                const isPositive = act.amount > 0 || act.type === 'CREDIT' || act.type === 'RELEASE'
                return (
                  <div key={act.id} className={styles.activityItem}>
                    <div className={styles.activityTypeCol}>
                      <span
                        className={`${styles.typePill} ${
                          act.type === 'CREDIT'
                            ? styles.pillCredit
                            : act.type === 'HOLD'
                            ? styles.pillHold
                            : act.type === 'RELEASE'
                            ? styles.pillRelease
                            : act.type === 'SETTLE'
                            ? styles.pillSettle
                            : styles.pillDebit
                        }`}
                      >
                        {act.type}
                      </span>
                    </div>

                    <div className={styles.activityDescCol}>
                      <p className={styles.activityDescription}>{act.description}</p>
                      <small className={styles.activityTimestamp}>
                        {formatDateTime(act.timestamp)}
                      </small>
                    </div>

                    <div className={styles.activityAmountCol}>
                      <span
                        className={`${styles.activityAmount} ${
                          isPositive ? styles.amountPositive : styles.amountNegative
                        }`}
                      >
                        {act.amount > 0 ? `+${act.amount.toLocaleString()}` : act.amount.toLocaleString()}{' '}
                        {act.assetType}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={styles.emptyCardState}>
              <p className={styles.emptyTitle}>No Recent Activity</p>
              <p className={styles.emptyText}>
                Your earnings, rewards, and withdrawal transactions will appear here once recorded.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default UserProfile
