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
  const [copiedKey, setCopiedKey] = useState(null)

  // Withdrawal Request Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDestination, setWithdrawDestination] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawalHistory, setWithdrawalHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

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

  // Copy to clipboard helper with inline feedback and execCommand fallback
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
      showToast('Withdrawal request submitted successfully!', 'success')
      setWithdrawAmount('')
      setWithdrawDestination('')
      await Promise.all([loadOverview(false), fetchWithdrawalHistory()])
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
          <div className={styles.skeletonCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div className={styles.skeletonAvatar} />
              <div style={{ flex: 1 }}>
                <div className={styles.skeletonLine} style={{ width: '30%', height: '1.5rem', marginBottom: '0.5rem' }} />
                <div className={styles.skeletonLine} style={{ width: '50%', height: '1rem' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className={styles.skeletonCard} style={{ height: '160px' }} />
            <div className={styles.skeletonCard} style={{ height: '160px' }} />
            <div className={styles.skeletonCard} style={{ height: '160px' }} />
            <div className={styles.skeletonCard} style={{ height: '160px' }} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboardContainer} data-theme="dark-gaming">
        <div className={styles.dashboardWrapper}>
          <div style={{ backgroundColor: '#1F1315', border: '1px solid #7F1D1D', padding: '2rem', borderRadius: '18px', textAlign: 'center' }}>
            <h3 style={{ color: '#F87171', fontWeight: 800, marginBottom: '0.5rem' }}>Unable to Load Dashboard</h3>
            <p style={{ color: '#FECACA', marginBottom: '1.5rem' }}>{error}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                type="button"
                className={styles.btnDangerAction}
                onClick={() => loadOverview(true)}
              >
                Retry
              </button>
              <button
                type="button"
                className={styles.btnSecondaryAction}
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

  const formattedLevel = String(levelProgress.currentLevel).padStart(2, '0')

  return (
    <div className={styles.dashboardContainer} data-theme="dark-gaming">
      {/* Subtle Animated Ambient Lighting Background */}
      <div className={styles.ambientLayer} aria-hidden="true">
        <div className={styles.ambientOrbPurple} />
        <div className={styles.ambientOrbYellow} />
        <div className={styles.ambientOrbCyan} />
      </div>

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
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className={styles.formLabel}>Available Balance:</span>
                    <strong style={{ color: '#00E6A0', fontWeight: 800 }}>{balances.VE.available.toLocaleString()} VEs</strong>
                  </div>
                  <small style={{ color: '#A8ABC5', fontSize: '0.75rem', display: 'block', lineHeight: 1.4 }}>
                    Minimum withdrawal is 200 VE. Requested funds will be reserved immediately upon submission.
                  </small>
                </div>
                <div>
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
                <div>
                  <label htmlFor="withdraw-dest-input" className={styles.formLabel}>
                    Destination Address / Account:
                  </label>
                  <input
                    id="withdraw-dest-input"
                    type="text"
                    className={styles.formControl}
                    placeholder="e.g. 0x71C... or bank account"
                    value={withdrawDestination}
                    onChange={(e) => setWithdrawDestination(e.target.value)}
                    required
                  />
                </div>

                {/* Recent Withdrawal Requests History in Modal */}
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={styles.formLabel} style={{ margin: 0, fontSize: '0.8rem' }}>Recent Requests:</span>
                    <button
                      type="button"
                      onClick={fetchWithdrawalHistory}
                      disabled={loadingHistory}
                      style={{ background: 'none', border: 'none', color: '#16DCEB', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                    >
                      {loadingHistory ? 'Refreshing...' : '↻ Refresh History'}
                    </button>
                  </div>
                  {loadingHistory && withdrawalHistory.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#A8ABC5', padding: '0.35rem 0' }}>Loading history...</div>
                  ) : withdrawalHistory.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#A8ABC5', fontStyle: 'italic', padding: '0.25rem 0' }}>
                      No prior withdrawal requests recorded.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '150px', overflowY: 'auto' }}>
                      {withdrawalHistory.slice(0, 5).map((w) => (
                        <div
                          key={w._id || w.withdrawalId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#20213F',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>
                              {w.amount?.toLocaleString()} {w.assetType || 'VE'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#A8ABC5' }}>
                              {w.payoutDetails?.accountIdentifier || w.destination || 'Manual'} • {formatDate(w.createdAt)}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              backgroundColor:
                                w.status === 'completed'
                                  ? 'rgba(0, 230, 160, 0.16)'
                                  : w.status === 'approved'
                                  ? 'rgba(67, 142, 255, 0.18)'
                                  : w.status === 'rejected' || w.status === 'cancelled'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(255, 213, 0, 0.16)',
                              color:
                                w.status === 'completed'
                                  ? '#00E6A0'
                                  : w.status === 'approved'
                                  ? '#438EFF'
                                  : w.status === 'rejected' || w.status === 'cancelled'
                                  ? '#FCA5A5'
                                  : '#FFD500',
                              border: `1px solid ${
                                w.status === 'completed'
                                  ? 'rgba(0, 230, 160, 0.35)'
                                  : w.status === 'approved'
                                  ? 'rgba(67, 142, 255, 0.35)'
                                  : w.status === 'rejected' || w.status === 'cancelled'
                                  ? 'rgba(239, 68, 68, 0.35)'
                                  : 'rgba(255, 213, 0, 0.35)'
                              }`
                            }}
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
        {/* SECTION A: PROFILE HERO SHOWCASE                         */}
        {/* ======================================================== */}
        <section className={`${styles.welcomeSection} ${styles.animSection1}`} aria-labelledby="welcome-heading">
          {/* Subtle Floating Decorative Reward Sparkles */}
          <span className={`${styles.heroSparkle} ${styles.sparkleGold1}`} aria-hidden="true" />
          <span className={`${styles.heroSparkle} ${styles.sparkleCyan1}`} aria-hidden="true" />
          <span className={`${styles.heroSparkle} ${styles.sparkleGold2}`} aria-hidden="true" />

          <div className={styles.heroTopRow}>
            <div className={styles.welcomeUserArea}>
              <div className={styles.avatarWrapper}>
                <div className={styles.userAvatar} aria-hidden="true">
                  {getInitials(profile.name)}
                </div>
                <span className={styles.onlineIndicator} title="Active Account" />
              </div>

              <div className={styles.welcomeTextMeta}>
                <div className={styles.greetingRow}>
                  <h1 id="welcome-heading" className={styles.welcomeGreeting}>
                    Welcome back, <span className={styles.welcomeNameAccent}>{profile.name}</span>
                  </h1>
                  <span className={styles.statusPill}>
                    <span className={styles.statusDotInner} />
                    {profile.status}
                  </span>
                  <span className={styles.rolePill}>{profile.role}</span>
                  <span className={styles.tierPill}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Level {formattedLevel} &bull; {levelProgress.currentLevelName}
                  </span>
                </div>

                <div className={styles.subMetaLine}>
                  <span>{profile.email}</span>
                  <span className={styles.metaDot}>&bull;</span>
                  <span>Member since {formatDate(profile.memberSince || profile.createdAt)}</span>
                  <span className={styles.metaDot}>&bull;</span>
                  <span className={styles.idBadge}>
                    ID: <code>{profile.id ? String(profile.id).slice(-8) : 'N/A'}</code>
                    <button
                      type="button"
                      className={`${styles.copyMiniBtn} ${copiedKey === 'id' ? styles.copyMiniBtnSuccess : ''}`}
                      onClick={() => copyToClipboard(profile.id, 'User ID', 'id')}
                      title="Copy full user ID"
                      aria-label="Copy User ID"
                    >
                      {copiedKey === 'id' ? 'Copied!' : 'Copy'}
                    </button>
                  </span>
                </div>
              </div>
            </div>

            {/* Integrated Level Shield & Mini XP Progress Showcase */}
            <div className={styles.heroLevelPanel}>
              <div className={styles.heroLevelTop}>
                <div className={styles.heroShieldBadge}>
                  <div className={styles.heroShieldIcon} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M12 8v4l2.5 2.5" />
                    </svg>
                  </div>
                  <div>
                    <div className={styles.heroLevelLabel}>Current Rank</div>
                    <div className={styles.heroLevelValue}>{levelProgress.currentLevelName}</div>
                  </div>
                </div>
                <span className={styles.heroXpPill}>
                  {levelProgress.currentXp.toLocaleString()} XP
                </span>
              </div>

              <div className={styles.heroMiniTrack}>
                <div
                  className={styles.heroMiniFill}
                  style={{ width: `${levelProgress.progressPercentage}%` }}
                />
              </div>

              <div className={styles.heroMiniMeta}>
                <span>{levelProgress.progressPercentage}% to next tier</span>
                <span style={{ color: '#FFD500', fontWeight: 700 }}>
                  {levelProgress.nextLevel
                    ? `${levelProgress.xpRemaining.toLocaleString()} XP left`
                    : 'Max Level'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className={styles.heroBottomBar}>
            <div className={styles.quickActionsRow}>
              <button
                type="button"
                className={styles.btnPrimaryAction}
                onClick={openWithdrawModal}
                title="Request funds withdrawal"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span>Request Withdrawal</span>
              </button>

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
                className={styles.btnSecondaryAction}
                onClick={() => copyToClipboard(referrals.referralCode || profile.referralCode, 'Invite Code', 'inviteTop')}
                title="Copy your referral invite code"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                <span>{copiedKey === 'inviteTop' ? 'Code Copied!' : 'Invite Friends'}</span>
              </button>
            </div>

            <button
              type="button"
              className={styles.btnDangerAction}
              onClick={handleLogout}
              title="Sign out of platform"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION B: ACCOUNT STATISTICS KPI CARDS                  */}
        {/* ======================================================== */}
        <section className={`${styles.statsStripGrid} ${styles.animSection2}`} aria-label="Account Statistics">
          <div className={`${styles.kpiStatCard} ${styles.kpiVe}`}>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconYellow}`} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9l3 6 3-6" />
              </svg>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Available VEs</span>
              <span className={styles.kpiValue}>{balances.VE.available.toLocaleString()} VEs</span>
              <span className={styles.kpiSub}>{balances.VE.reserved.toLocaleString()} VE reserved</span>
            </div>
          </div>

          <div className={`${styles.kpiStatCard} ${styles.kpiXp}`}>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconCyan}`} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Current XP</span>
              <span className={styles.kpiValue}>{levelProgress.currentXp.toLocaleString()} XP</span>
              <span className={styles.kpiSub}>
                {levelProgress.nextLevel
                  ? `${levelProgress.xpRemaining.toLocaleString()} XP to Level ${levelProgress.nextLevel}`
                  : 'Maximum tier unlocked'}
              </span>
            </div>
          </div>

          <div className={`${styles.kpiStatCard} ${styles.kpiTier}`}>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconPurple}`} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Tier &amp; Badges</span>
              <span className={styles.kpiValue}>Level {formattedLevel}</span>
              <span className={styles.kpiSub}>
                {levelProgress.currentLevelName} &bull; {achievements.unlocked}/{achievements.total} Badges
              </span>
            </div>
          </div>

          <div className={`${styles.kpiStatCard} ${styles.kpiWithdraw}`}>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconGreen}`} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Withdrawals</span>
              <span className={styles.kpiValue}>{withdrawals.totalWithdrawn.toLocaleString()} VEs</span>
              <span className={styles.kpiSub}>
                {withdrawals.completed || 0} settled &bull; {withdrawals.pending || 0} pending
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION C: EARNINGS & WALLET OVERVIEW (4 REAL ASSETS)    */}
        {/* ======================================================== */}
        <section className={`${styles.walletGridSection} ${styles.animSection3}`} aria-labelledby="wallet-section-title">
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionTitleBlock}>
              <span className={styles.sectionEyebrow}>Multi-Asset Financial Hub</span>
              <h2 id="wallet-section-title" className={styles.sectionHeading}>
                Earnings &amp; Wallet Overview
              </h2>
            </div>
            <span className={styles.ledgerBadge}>Immutable Ledger Backed</span>
          </div>

          <div className={styles.walletCardsGrid}>
            {/* Card 1: VE Rewards */}
            <div className={`${styles.walletAssetCard} ${styles.cardVeTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconVe}`} title="VE Rewards" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 9.5L12 16l3.5-6.5" />
                  </svg>
                </div>
                <span className={styles.cardTypeBadge}>Primary Asset</span>
              </div>
              <div className={styles.cardMainBalanceBlock}>
                <span className={styles.cardAssetLabel}>Available VEs</span>
                <div className={styles.cardBalanceNumber}>
                  {balances.VE.available.toLocaleString()}
                  <span className={styles.cardTicker}>VEs</span>
                </div>
              </div>
              <div className={styles.cardSubMetricsRow}>
                <div className={styles.metricItem}>
                  <span>Reserved</span>
                  <strong>{balances.VE.reserved.toLocaleString()} VE</strong>
                </div>
                <div className={styles.metricItem} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.VE.totalEarned.toLocaleString()} VE</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Staked VE (SVE) */}
            <div className={`${styles.walletAssetCard} ${styles.cardSveTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconSve}`} title="Staked VE" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <span className={styles.cardTypeBadge}>Yield Staked</span>
              </div>
              <div className={styles.cardMainBalanceBlock}>
                <span className={styles.cardAssetLabel}>Staked Units</span>
                <div className={styles.cardBalanceNumber}>
                  {balances.SVE.available.toLocaleString()}
                  <span className={styles.cardTicker}>SVE</span>
                </div>
              </div>
              <div className={styles.cardSubMetricsRow}>
                <div className={styles.metricItem}>
                  <span>Reserved</span>
                  <strong>{balances.SVE.reserved.toLocaleString()} SVE</strong>
                </div>
                <div className={styles.metricItem} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.SVE.totalEarned.toLocaleString()} SVE</strong>
                </div>
              </div>
            </div>

            {/* Card 3: Quest Gems (GEM) */}
            <div className={`${styles.walletAssetCard} ${styles.cardGemTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconGem}`} title="Available Gems" aria-hidden="true">
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12l4 6-10 13L2 9z" />
                    <path d="M11 3l-4 6 5 13 5-13-4-6" />
                    <path d="M2 9h20" />
                  </svg>
                </div>
                <span className={styles.cardTypeBadge}>Quest Currency</span>
              </div>
              <div className={styles.cardMainBalanceBlock}>
                <span className={styles.cardAssetLabel}>Available Gems</span>
                <div className={styles.cardBalanceNumber}>
                  {balances.GEM.available.toLocaleString()}
                  <span className={styles.cardTicker}>GEM</span>
                </div>
              </div>
              <div className={styles.cardSubMetricsRow}>
                <div className={styles.metricItem}>
                  <span>Reserved</span>
                  <strong>{balances.GEM.reserved.toLocaleString()} GEM</strong>
                </div>
                <div className={styles.metricItem} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.GEM.totalEarned.toLocaleString()} GEM</strong>
                </div>
              </div>
            </div>

            {/* Card 4: Platform Tokens (TOKEN) */}
            <div className={`${styles.walletAssetCard} ${styles.cardTokenTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconToken}`} title="Platform Tokens" aria-hidden="true">
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <span className={styles.cardTypeBadge}>Ecosystem Utility</span>
              </div>
              <div className={styles.cardMainBalanceBlock}>
                <span className={styles.cardAssetLabel}>Platform Tokens</span>
                <div className={styles.cardBalanceNumber}>
                  {balances.TOKEN.available.toLocaleString()}
                  <span className={styles.cardTicker}>TKN</span>
                </div>
              </div>
              <div className={styles.cardSubMetricsRow}>
                <div className={styles.metricItem}>
                  <span>Reserved</span>
                  <strong>{balances.TOKEN.reserved.toLocaleString()} TKN</strong>
                </div>
                <div className={styles.metricItem} style={{ textAlign: 'right' }}>
                  <span>Lifetime Earned</span>
                  <strong>{balances.TOKEN.totalEarned.toLocaleString()} TKN</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION D: LEVEL & XP PROGRESSION                        */}
        {/* ======================================================== */}
        <section className={`${styles.progressionCard} ${styles.animSection4}`} aria-labelledby="progression-heading">
          <div className={styles.progressionHeaderRow}>
            <div className={styles.progressionLeftCluster}>
              <div className={styles.levelShieldEmblem} aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polygon points="12 8 13.5 11 17 11.5 14.5 14 15 17.5 12 16 9 17.5 9.5 14 7 11.5 10.5 11 12 8" />
                </svg>
              </div>
              <div className={styles.levelTitleBlock}>
                <span className={styles.sectionEyebrow}>Level &amp; XP Progression</span>
                <h2 id="progression-heading" className={styles.levelHeading}>
                  Level {formattedLevel} &mdash; {levelProgress.currentLevelName}
                </h2>
              </div>
            </div>

            <div className={styles.xpBadgeHighlight}>
              {levelProgress.currentXp.toLocaleString()} Total XP
            </div>
          </div>

          <div className={styles.progressTrackContainer}>
            <div className={styles.progressInfoRow}>
              <span style={{ fontWeight: 600 }}>
                {levelProgress.nextLevel ? (
                  <>Progress toward <strong>Level {levelProgress.nextLevel} ({levelProgress.nextLevelName})</strong></>
                ) : (
                  <strong>Maximum Tier Mastered</strong>
                )}
              </span>
              <span className={styles.progressPercentGlow}>
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
                  ? `${levelProgress.xpRemaining.toLocaleString()} XP remaining to Level ${levelProgress.nextLevel}`
                  : 'Max Tier achieved'}
              </span>
            </div>
          </div>

          <div className={styles.milestoneStripGrid}>
            <div className={styles.milestoneMiniCard}>
              <span className={styles.milestoneMiniLabel}>Active Level Badge</span>
              <span className={styles.milestoneMiniValue} style={{ color: '#FFD500' }}>
                Level {formattedLevel} &bull; {levelProgress.currentLevelName}
              </span>
            </div>
            <div className={styles.milestoneMiniCard}>
              <span className={styles.milestoneMiniLabel}>Next Milestone Target</span>
              <span className={styles.milestoneMiniValue} style={{ color: '#16DCEB' }}>
                {levelProgress.nextLevel
                  ? `Level ${String(levelProgress.nextLevel).padStart(2, '0')} (${levelProgress.nextLevelXp?.toLocaleString()} XP)`
                  : 'Top Tier Achieved'}
              </span>
            </div>
            <div className={styles.milestoneMiniCard}>
              <span className={styles.milestoneMiniLabel}>Achievement Progress</span>
              <span className={styles.milestoneMiniValue} style={{ color: '#00E6A0' }}>
                {achievements.claimed} Claimed / {achievements.unlocked} Unlocked
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION E: ACHIEVEMENTS & BADGES                         */}
        {/* ======================================================== */}
        <section className={`${styles.achievementsCard} ${styles.animSection5}`} aria-labelledby="achievements-heading">
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionTitleBlock}>
              <span className={styles.sectionEyebrow}>Milestones &amp; Badges</span>
              <h2 id="achievements-heading" className={styles.sectionHeading}>
                Achievements ({achievements.unlocked} of {achievements.total} Unlocked)
              </h2>
            </div>
            <span className={styles.tierPill}>
              {achievements.claimed} Rewarded
            </span>
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
                      aria-hidden="true"
                    >
                      {ach.isClaimed ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : ach.unlocked ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                    </div>

                    <div className={styles.achContent}>
                      <div className={styles.achTitleRow}>
                        <h3 className={styles.achItemTitle}>{ach.title}</h3>
                        {ach.isClaimed ? (
                          <span className={styles.achStatusClaimed}>Claimed</span>
                        ) : ach.unlocked ? (
                          <span className={styles.achStatusUnlocked}>Unlocked</span>
                        ) : (
                          <span className={styles.achStatusLocked}>Locked</span>
                        )}
                      </div>
                      <p className={styles.achItemDescription}>{ach.description}</p>

                      {!ach.unlocked && isXpCriteria && (
                        <div className={styles.achMiniBarTrack} title={`${achPercent}% complete`}>
                          <div className={styles.achMiniBarFill} style={{ width: `${achPercent}%` }} />
                        </div>
                      )}

                      <div className={styles.achMetaRow}>
                        <span>
                          {isXpCriteria
                            ? `Goal: ${ach.criteria.targetValue.toLocaleString()} XP (${(ach.progress || 0).toLocaleString()} earned)`
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
                          <span style={{ color: '#00E6A0', fontWeight: 700, fontSize: '0.74rem' }}>
                            Claimed on {formatDate(ach.claimedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p style={{ color: '#A8ABC5', textAlign: 'center', padding: '1.5rem' }}>No achievements configured.</p>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION F: REWARDS, ACTIVITY, WITHDRAWALS & REFERRALS    */}
        {/* ======================================================== */}
        <div className={`${styles.lowerHubGrid} ${styles.animSection6}`}>
          {/* Left Column Stack */}
          <div className={styles.leftColumnStack}>
            {/* Recent Financial Activity (Ledger) */}
            <section className={styles.hubSectionCard} aria-labelledby="activity-heading">
              <div className={styles.sectionHeaderRow}>
                <div className={styles.sectionTitleBlock}>
                  <span className={styles.sectionEyebrow}>Financial Ledger</span>
                  <h2 id="activity-heading" className={styles.sectionHeading}>
                    Recent Financial Activity
                  </h2>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#A8ABC5', fontWeight: 600 }}>
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
                <div className={styles.emptyStateBox}>
                  <p style={{ fontWeight: 800, marginBottom: '0.25rem', color: '#FFFFFF' }}>No Recent Activity</p>
                  <small>Your verified transactions and reward earnings will appear here automatically.</small>
                </div>
              )}
            </section>

            {/* Account Verification & Security */}
            <section className={styles.hubSectionCard} aria-labelledby="security-heading">
              <div className={styles.sectionHeaderRow}>
                <div className={styles.sectionTitleBlock}>
                  <span className={styles.sectionEyebrow}>Account Verification</span>
                  <h2 id="security-heading" className={styles.sectionHeading}>
                    Identity &amp; Security
                  </h2>
                </div>
                <span className={styles.achStatusClaimed} style={{ fontSize: '0.72rem' }}>
                  ✓ Ledger Verified
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className={styles.securityRow}>
                  <span className={styles.securityLabel}>Account Status</span>
                  <span className={styles.statusPill}>{profile.status}</span>
                </div>
                <div className={styles.securityRow}>
                  <span className={styles.securityLabel}>Platform Role</span>
                  <span className={styles.rolePill}>{profile.role}</span>
                </div>
                <div className={styles.securityRow}>
                  <span className={styles.securityLabel}>Account ID</span>
                  <code style={{ fontSize: '0.85rem', color: '#16DCEB', fontWeight: 800, fontFamily: 'Chivo Mono, monospace' }}>
                    {profile.id ? String(profile.id).slice(-8) : 'N/A'}
                  </code>
                </div>
                <div className={styles.securityRow}>
                  <span className={styles.securityLabel}>Registration Date</span>
                  <span className={styles.securityValue}>
                    {formatDate(profile.memberSince || profile.createdAt)}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column Stack */}
          <div className={styles.rightColumnStack}>
            {/* Withdrawals Overview */}
            <section className={styles.hubSectionCard} aria-labelledby="withdrawals-heading">
              <div className={styles.sectionHeaderRow}>
                <div className={styles.sectionTitleBlock}>
                  <span className={styles.sectionEyebrow}>Redemption Overview</span>
                  <h2 id="withdrawals-heading" className={styles.sectionHeading}>
                    Withdrawals
                  </h2>
                </div>
              </div>

              {/* Total Successfully Withdrawn Box */}
              <div className={styles.withdrawalHeroBox}>
                <span className={styles.withdrawalHeroLabel}>Total Successfully Withdrawn</span>
                <div className={styles.withdrawalHeroNumber}>
                  {withdrawals.totalWithdrawn.toLocaleString()} VEs
                </div>
                <small className={styles.withdrawalHeroSub}>
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
                  <div className={`${styles.statBoxValue} ${styles.statBoxPending}`}>{withdrawals.pending || 0}</div>
                  <div className={styles.statBoxLabel}>Pending</div>
                </div>
                <div className={styles.statBox}>
                  <div className={`${styles.statBoxValue} ${styles.statBoxCompleted}`}>{withdrawals.completed || 0}</div>
                  <div className={styles.statBoxLabel}>Completed</div>
                </div>
                <div className={styles.statBox}>
                  <div className={`${styles.statBoxValue} ${styles.statBoxRejected}`}>{withdrawals.rejected || 0}</div>
                  <div className={styles.statBoxLabel}>Rejected</div>
                </div>
              </div>

              <button
                type="button"
                className={styles.btnPrimaryAction}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={openWithdrawModal}
              >
                Request Withdrawal
              </button>
            </section>

            {/* Referral Snapshot */}
            <section className={styles.hubSectionCard} aria-labelledby="referrals-heading">
              <div className={styles.sectionHeaderRow}>
                <div className={styles.sectionTitleBlock}>
                  <span className={styles.sectionEyebrow}>Grow Your Network</span>
                  <h2 id="referrals-heading" className={styles.sectionHeading}>
                    Referral Snapshot
                  </h2>
                </div>
              </div>

              <div className={styles.referralContainer}>
                <small style={{ fontSize: '0.72rem', color: '#A8ABC5', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.6px' }}>
                  Your Unique Invite Code
                </small>
                <div className={styles.inviteCodeDisplayRow}>
                  <code className={styles.inviteCodeText}>
                    {referrals.referralCode || profile.referralCode || 'N/A'}
                  </code>
                  <button
                    type="button"
                    className={styles.copyCodeBtn}
                    onClick={() =>
                      copyToClipboard(
                        referrals.referralCode || profile.referralCode,
                        'Referral code',
                        'referralCard'
                      )
                    }
                  >
                    {copiedKey === 'referralCard' ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <div className={styles.referralStatsGrid}>
                  <div className={styles.referralStatItem}>
                    <div className={styles.refVal}>{referrals.totalReferrals || 0}</div>
                    <div className={styles.refLabel}>Total</div>
                  </div>
                  <div className={styles.referralStatItem}>
                    <div className={styles.refVal} style={{ color: '#00E6A0' }}>
                      {referrals.successfulReferrals || 0}
                    </div>
                    <div className={styles.refLabel}>Successful</div>
                  </div>
                  <div className={styles.referralStatItem}>
                    <div className={styles.refVal} style={{ color: '#FFD500' }}>
                      {referrals.pendingReferrals || 0}
                    </div>
                    <div className={styles.refLabel}>Pending</div>
                  </div>
                </div>

                <div className={styles.referralNotice}>
                  Share your invite code with friends to unlock bonus XP and rewards on their first quest completion.
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
