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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
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
          <div style={{ backgroundColor: '#1F1315', border: '1px solid #7F1D1D', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
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
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className={styles.formLabel}>Available Balance:</span>
                    <strong style={{ color: '#34D399', fontWeight: 800 }}>{balances.VE.available.toLocaleString()} VEs</strong>
                  </div>
                  <small style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', lineHeight: 1.4 }}>
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
                      style={{ background: 'none', border: 'none', color: '#818CF8', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                    >
                      {loadingHistory ? 'Refreshing...' : '↻ Refresh History'}
                    </button>
                  </div>
                  {loadingHistory && withdrawalHistory.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', padding: '0.35rem 0' }}>Loading history...</div>
                  ) : withdrawalHistory.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic', padding: '0.25rem 0' }}>
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
                            backgroundColor: '#161F30',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC' }}>
                              {w.amount?.toLocaleString()} {w.assetType || 'VE'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                              {w.payoutDetails?.accountIdentifier || w.destination || 'Manual'} • {formatDate(w.createdAt)}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                              backgroundColor:
                                w.status === 'completed'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : w.status === 'approved'
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : w.status === 'rejected' || w.status === 'cancelled'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(245, 158, 11, 0.2)',
                              color:
                                w.status === 'completed'
                                  ? '#34D399'
                                  : w.status === 'approved'
                                  ? '#60A5FA'
                                  : w.status === 'rejected' || w.status === 'cancelled'
                                  ? '#F87171'
                                  : '#FBBF24',
                              border: `1px solid ${
                                w.status === 'completed'
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : w.status === 'approved'
                                  ? 'rgba(59, 130, 246, 0.3)'
                                  : w.status === 'rejected' || w.status === 'cancelled'
                                  ? 'rgba(239, 68, 68, 0.3)'
                                  : 'rgba(245, 158, 11, 0.3)'
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
        {/* SECTION B: PROFILE HERO HEADER                           */}
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
                <span className={styles.tierPill}>
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

          {/* Quick Actions */}
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
              onClick={openWithdrawModal}
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
        {/* SECTION C: 4 DISTINCT MULTI-ASSET WALLET CARDS           */}
        {/* ======================================================== */}
        <section className={styles.walletGridSection} aria-labelledby="wallet-section-title">
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionTitleBlock}>
              <span className={styles.sectionEyebrow}>Multi-Asset Financial Hub</span>
              <h2 id="wallet-section-title" className={styles.sectionHeading}>
                Wallet & Digital Assets
              </h2>
            </div>
            <span className={styles.ledgerBadge}>Immutable Ledger Backed</span>
          </div>

          <div className={styles.walletCardsGrid}>
            {/* Card 1: VE Rewards */}
            <div className={`${styles.walletAssetCard} ${styles.cardVeTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconVe}`} title="VE Rewards">
                  VE
                </div>
                <span className={styles.cardTypeBadge}>Primary Asset</span>
              </div>
              <div className={styles.cardMainBalanceBlock}>
                <span className={styles.cardAssetLabel}>VE Rewards Balance</span>
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
                  <span>Lifetime</span>
                  <strong>{balances.VE.totalEarned.toLocaleString()} VE</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Staked VE (SVE) */}
            <div className={`${styles.walletAssetCard} ${styles.cardSveTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconSve}`} title="Staked VE">
                  SVE
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
                  <span>Lifetime</span>
                  <strong>{balances.SVE.totalEarned.toLocaleString()} SVE</strong>
                </div>
              </div>
            </div>

            {/* Card 3: Quest Gems (GEM) */}
            <div className={`${styles.walletAssetCard} ${styles.cardGemTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconGem}`} title="Quest Gems">
                  💎
                </div>
                <span className={styles.cardTypeBadge}>Quest Currency</span>
              </div>
              <div className={styles.cardMainBalanceBlock}>
                <span className={styles.cardAssetLabel}>Quest Gems</span>
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
                  <span>Lifetime</span>
                  <strong>{balances.GEM.totalEarned.toLocaleString()} GEM</strong>
                </div>
              </div>
            </div>

            {/* Card 4: Platform Tokens (TOKEN) */}
            <div className={`${styles.walletAssetCard} ${styles.cardTokenTheme}`}>
              <div className={styles.cardHeaderRow}>
                <div className={`${styles.cardIconBadge} ${styles.iconToken}`} title="Platform Tokens">
                  🪙
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
                  <span>Lifetime</span>
                  <strong>{balances.TOKEN.totalEarned.toLocaleString()} TKN</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION D: GAMIFIED PROGRESSION & XP                     */}
        {/* ======================================================== */}
        <section className={styles.progressionCard} aria-labelledby="progression-heading">
          <div className={styles.progressionHeaderRow}>
            <div className={styles.levelTitleBlock}>
              <span className={styles.sectionEyebrow}>Gamified Progression</span>
              <h2 id="progression-heading" className={styles.levelHeading}>
                Level {String(levelProgress.currentLevel).padStart(2, '0')} — {levelProgress.currentLevelName}
              </h2>
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
              <span style={{ fontWeight: 800, color: '#38BDF8', fontSize: '1rem' }}>
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
        </section>

        {/* ======================================================== */}
        {/* SECTION E: ACHIEVEMENTS & BADGES                         */}
        {/* ======================================================== */}
        <section className={styles.achievementsCard} aria-labelledby="achievements-heading">
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionTitleBlock}>
              <span className={styles.sectionEyebrow}>Milestones & Badges</span>
              <h2 id="achievements-heading" className={styles.sectionHeading}>
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
                          <span className={styles.achStatusClaimed}>Claimed</span>
                        ) : ach.unlocked ? (
                          <span className={styles.achStatusUnlocked}>Unlocked</span>
                        ) : (
                          <span className={styles.achStatusLocked}>Locked</span>
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
                          <span style={{ color: '#34D399', fontWeight: 700, fontSize: '0.75rem' }}>
                            Claimed on {formatDate(ach.claimedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p style={{ color: '#94A3B8', textAlign: 'center', padding: '1.5rem' }}>No achievements configured.</p>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* LOWER SECTION: ASYMMETRIC 2-COLUMN HUB (F, G, H)         */}
        {/* ======================================================== */}
        <div className={styles.lowerHubGrid}>
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
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
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
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8' }}>
                  <p style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#CBD5E1' }}>No Recent Activity</p>
                  <small>Your transactions and earnings will be securely listed here.</small>
                </div>
              )}
            </section>

            {/* Account Verification & Security (Section H) */}
            <section className={styles.hubSectionCard} aria-labelledby="security-heading">
              <div className={styles.sectionHeaderRow}>
                <div className={styles.sectionTitleBlock}>
                  <span className={styles.sectionEyebrow}>Account Verification</span>
                  <h2 id="security-heading" className={styles.sectionHeading}>
                    Identity & Security
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
                  <code style={{ fontSize: '0.85rem', color: '#818CF8', fontWeight: 800 }}>
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
            {/* Section G: Withdrawals Overview */}
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

            {/* Section F: Referral Snapshot */}
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
                <small style={{ fontSize: '0.72rem', color: '#C7D2FE', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
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
                        'Referral code'
                      )
                    }
                  >
                    Copy Code
                  </button>
                </div>

                <div className={styles.referralStatsGrid}>
                  <div className={styles.referralStatItem}>
                    <div className={styles.refVal}>{referrals.totalReferrals || 0}</div>
                    <div className={styles.refLabel}>Total</div>
                  </div>
                  <div className={styles.referralStatItem}>
                    <div className={`${styles.refVal}`} style={{ color: '#34D399' }}>
                      {referrals.successfulReferrals || 0}
                    </div>
                    <div className={styles.refLabel}>Successful</div>
                  </div>
                  <div className={styles.referralStatItem}>
                    <div className={`${styles.refVal}`} style={{ color: '#FBBF24' }}>
                      {referrals.pendingReferrals || 0}
                    </div>
                    <div className={styles.refLabel}>Pending</div>
                  </div>
                </div>

                <div className={styles.referralNotice}>
                  🎁 Share your invite code with friends to unlock bonus XP and rewards on their first quest completion!
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
