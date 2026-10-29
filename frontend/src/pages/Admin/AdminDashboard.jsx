import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import styles from './AdminDashboard.module.css'

export function AdminDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Active Tab: 'overview' | 'users' | 'withdrawals' | 'audit'
  const [activeTab, setActiveTab] = useState('overview')

  // Global UI States
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Overview Data
  const [overview, setOverview] = useState(null)

  // Users Tab State
  const [usersData, setUsersData] = useState({ users: [], pagination: {} })
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [selectedUserDetails, setSelectedUserDetails] = useState(null)
  const [statusModalUser, setStatusModalUser] = useState(null)
  const [newStatus, setNewStatus] = useState('active')
  const [statusReason, setStatusReason] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)

  // Withdrawals Tab State
  const [withdrawalsData, setWithdrawalsData] = useState({ withdrawals: [], pagination: {} })
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('')
  const [withdrawalPage, setWithdrawalPage] = useState(1)
  const [reviewModalWithdrawal, setReviewModalWithdrawal] = useState(null)
  const [reviewDecision, setReviewDecision] = useState('approve')
  const [reviewReason, setReviewReason] = useState('')
  const [reviewAdminNotes, setReviewAdminNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [settleModalWithdrawal, setSettleModalWithdrawal] = useState(null)
  const [settleReason, setSettleReason] = useState('')
  const [settling, setSettling] = useState(false)

  // Audit Logs Tab State
  const [auditData, setAuditData] = useState({ logs: [], pagination: {} })
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [auditTargetFilter, setAuditTargetFilter] = useState('')
  const [auditPage, setAuditPage] = useState(1)

  // Toast Helper
  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage({ text: msg, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }, [])

  // 1. Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.admin.getOverview()
      setOverview(data)
    } catch (err) {
      setError(err.message || 'Failed to load administrative overview.')
    }
  }, [])

  // 2. Fetch Users Data
  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.admin.getUsers({
        page: userPage,
        limit: 15,
        search: userSearch,
        status: userStatusFilter || undefined,
        role: userRoleFilter || undefined
      })
      setUsersData(data)
    } catch (err) {
      showToast(err.message || 'Failed to load users list.', 'error')
    }
  }, [userPage, userSearch, userStatusFilter, userRoleFilter, showToast])

  // 3. Fetch Withdrawals Data
  const fetchWithdrawals = useCallback(async () => {
    try {
      const data = await api.admin.getWithdrawals({
        page: withdrawalPage,
        limit: 15,
        status: withdrawalStatusFilter || undefined
      })
      setWithdrawalsData(data)
    } catch (err) {
      showToast(err.message || 'Failed to load withdrawals.', 'error')
    }
  }, [withdrawalPage, withdrawalStatusFilter, showToast])

  // 4. Fetch Audit Logs Data
  const fetchAuditLogs = useCallback(async () => {
    try {
      const data = await api.admin.getAuditLogs({
        page: auditPage,
        limit: 20,
        action: auditActionFilter || undefined,
        targetType: auditTargetFilter || undefined
      })
      setAuditData(data)
    } catch (err) {
      showToast(err.message || 'Failed to load audit logs.', 'error')
    }
  }, [auditPage, auditActionFilter, auditTargetFilter, showToast])

  // Master Refresh
  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      if (activeTab === 'overview') await fetchOverview()
      else if (activeTab === 'users') await fetchUsers()
      else if (activeTab === 'withdrawals') await fetchWithdrawals()
      else if (activeTab === 'audit') await fetchAuditLogs()
      showToast('Dashboard data refreshed.', 'success')
    } catch {
      showToast('Failed to refresh data.', 'error')
    } finally {
      setRefreshing(false)
    }
  }, [activeTab, fetchOverview, fetchUsers, fetchWithdrawals, fetchAuditLogs, showToast])

  // Initial Data Load
  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (user && user.role !== 'admin') {
      return
    }

    let isMounted = true
    const init = async () => {
      try {
        const data = await api.admin.getOverview()
        if (isMounted) {
          setOverview(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to connect to admin services.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, user, authLoading, navigate])

  const handleSelectTab = (tab) => {
    setActiveTab(tab)
    if (tab === 'overview') {
      fetchOverview()
    } else if (tab === 'users') {
      fetchUsers()
    } else if (tab === 'withdrawals') {
      fetchWithdrawals()
    } else if (tab === 'audit') {
      fetchAuditLogs()
    }
  }

  // Handler: Open User Details Modal
  const handleInspectUser = async (userId) => {
    try {
      const details = await api.admin.getUserDetails(userId)
      setSelectedUserDetails(details)
    } catch (err) {
      showToast(err.message || 'Failed to fetch user details.', 'error')
    }
  }

  // Handler: Submit User Status Change
  const handleSubmitStatusChange = async (e) => {
    e.preventDefault()
    if (!statusModalUser) return
    if (!statusReason.trim()) {
      showToast('A reason is mandatory for administrative user status changes.', 'error')
      return
    }

    setStatusUpdating(true)
    try {
      const res = await api.admin.updateUserStatus(statusModalUser.id, {
        status: newStatus,
        reason: statusReason.trim()
      })
      showToast(res.message || 'User status updated successfully.', 'success')
      setStatusModalUser(null)
      setStatusReason('')
      fetchUsers()
      if (activeTab === 'overview') fetchOverview()
    } catch (err) {
      showToast(err.message || 'Failed to update user status.', 'error')
    } finally {
      setStatusUpdating(false)
    }
  }

  // Handler: Submit Withdrawal Review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!reviewModalWithdrawal) return
    if (!reviewReason.trim()) {
      showToast('A reason is mandatory for withdrawal decisions.', 'error')
      return
    }

    setReviewing(true)
    try {
      const res = await api.admin.reviewWithdrawal(reviewModalWithdrawal._id, {
        decision: reviewDecision,
        reason: reviewReason.trim(),
        adminNotes: reviewAdminNotes.trim() || undefined
      })
      showToast(res.message || `Withdrawal ${reviewDecision}d successfully.`, 'success')
      setReviewModalWithdrawal(null)
      setReviewReason('')
      setReviewAdminNotes('')
      fetchWithdrawals()
      if (activeTab === 'overview') fetchOverview()
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'error')
    } finally {
      setReviewing(false)
    }
  }

  // Handler: Submit Withdrawal Settlement
  const handleSubmitSettle = async (e) => {
    e.preventDefault()
    if (!settleModalWithdrawal) return
    if (!settleReason.trim()) {
      showToast('A settlement reason/note is required.', 'error')
      return
    }

    setSettling(true)
    try {
      const res = await api.admin.settleWithdrawal(settleModalWithdrawal._id, {
        reason: settleReason.trim()
      })
      showToast(res.message || 'Withdrawal settled and completed.', 'success')
      setSettleModalWithdrawal(null)
      setSettleReason('')
      fetchWithdrawals()
      if (activeTab === 'overview') fetchOverview()
    } catch (err) {
      showToast(err.message || 'Failed to settle withdrawal.', 'error')
    } finally {
      setSettling(false)
    }
  }

  // Format Helpers
  const formatDate = (d) => {
    if (!d) return 'N/A'
    try {
      return new Date(d).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return String(d)
    }
  }

  const formatDateTime = (d) => {
    if (!d) return 'N/A'
    try {
      return new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return String(d)
    }
  }

  // RBAC Access Denied Screen
  if (user && user.role !== 'admin') {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.deniedCard}>
          <div className={styles.deniedIcon}>🛡️</div>
          <h2 className={styles.deniedTitle}>Access Denied (HTTP 403)</h2>
          <p className={styles.deniedText}>
            Administrator credentials are required to view this portal. Your authenticated account (
            <code>{user.email}</code>) holds the <strong>{user.role}</strong> role.
          </p>
          <Link to="/user-profile" className="btn btn-primary btn-sm px-4">
            Return to My User Profile
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.adminWrapper}>
          <div className="text-center py-5">
            <div className="spinner-border text-warning mb-3" role="status"></div>
            <p className="text-secondary">Loading administrator system metrics...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.adminWrapper}>
          <div className="alert alert-danger p-4 text-center">
            <h4>Administrative Service Error</h4>
            <p className="mb-3">{error}</p>
            <button
              type="button"
              className="btn btn-danger btn-sm px-4"
              onClick={refreshAll}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.adminContainer}>
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
            className="btn-close btn-close-white ms-auto"
            onClick={() => setToastMessage(null)}
          ></button>
        </div>
      )}

      <div className={styles.adminWrapper}>
        {/* ======================================================== */}
        {/* HEADER HERO                                              */}
        {/* ======================================================== */}
        <section className={styles.adminHero}>
          <div className={styles.heroLeft}>
            <span className={styles.heroBadge}>Admin</span>
            <div>
              <h1 className={styles.heroTitle}>Management System & Control Center</h1>
              <p className={styles.heroSubtext}>
                Signed in as <strong>{user?.name}</strong> ({user?.email}) • Role:{' '}
                <code>{user?.role}</code>
              </p>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={refreshAll}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh System'}
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* NAVIGATION TABS                                          */}
        {/* ======================================================== */}
        <div className={styles.tabNav} role="tablist">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => handleSelectTab('overview')}
          >
            📊 System Overview
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabBtnActive : ''}`}
            onClick={() => handleSelectTab('users')}
          >
            👥 User Management
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'withdrawals' ? styles.tabBtnActive : ''}`}
            onClick={() => handleSelectTab('withdrawals')}
          >
            💳 Withdrawals & Redemptions
            {overview?.withdrawals?.pending > 0 && (
              <span className={styles.tabBadge}>{overview.withdrawals.pending} pending</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.tabBtnActive : ''}`}
            onClick={() => handleSelectTab('audit')}
          >
            📜 Audit Trail
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: SYSTEM OVERVIEW                                   */}
        {/* ======================================================== */}
        {activeTab === 'overview' && overview && (
          <div>
            {/* Users Summary Cards */}
            <h2 className="h5 fw-bold text-light mb-3">User Population Metrics</h2>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total Registered</span>
                <span className={`${styles.statValue} ${styles.colorBlue}`}>
                  {overview.users.total.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>Across all roles</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Active Accounts</span>
                <span className={`${styles.statValue} ${styles.colorGreen}`}>
                  {overview.users.active.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>In good standing</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Suspended</span>
                <span className={`${styles.statValue} ${styles.colorRed}`}>
                  {overview.users.suspended.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>Access restricted</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Administrators</span>
                <span className={`${styles.statValue} ${styles.colorAmber}`}>
                  {overview.users.admins.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>Privileged staff</span>
              </div>
            </div>

            {/* Withdrawals & Financial Summary Cards */}
            <h2 className="h5 fw-bold text-light mb-3">Withdrawal Pipeline & Reserves</h2>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Pending Reviews</span>
                <span className={`${styles.statValue} ${styles.colorAmber}`}>
                  {overview.withdrawals.pending.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>
                  {overview.withdrawals.totalPendingReserved.toLocaleString()} VEs reserved on hold
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Approved (Pending Settlement)</span>
                <span className={`${styles.statValue} ${styles.colorBlue}`}>
                  {overview.withdrawals.approved.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>Ready for disbursement</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Completed Settlements</span>
                <span className={`${styles.statValue} ${styles.colorGreen}`}>
                  {overview.withdrawals.completed.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>
                  Total: {overview.withdrawals.totalSettledAmount.toLocaleString()} VEs disbursed
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Rejected Requests</span>
                <span className={`${styles.statValue} ${styles.colorRed}`}>
                  {overview.withdrawals.rejected.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>Funds returned to users</span>
              </div>
            </div>

            {/* Platform Rewards Circulation */}
            <div className={styles.adminCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Platform Rewards In Circulation</h3>
                <span className="badge bg-secondary">Ledger Balance Totals</span>
              </div>
              <div className="row g-3">
                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="p-3 rounded bg-dark border border-secondary border-opacity-25">
                    <small className="text-secondary text-uppercase fw-bold">VE Points</small>
                    <div className="h4 text-light fw-bold my-1">
                      {overview.circulation.VE.available.toLocaleString()} VEs
                    </div>
                    <small className="text-warning">
                      {overview.circulation.VE.reserved.toLocaleString()} reserved in pipeline
                    </small>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="p-3 rounded bg-dark border border-secondary border-opacity-25">
                    <small className="text-secondary text-uppercase fw-bold">Staked SVEs</small>
                    <div className="h4 text-light fw-bold my-1">
                      {overview.circulation.SVE.available.toLocaleString()} SVEs
                    </div>
                    <small className="text-secondary">Staked platform units</small>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="p-3 rounded bg-dark border border-secondary border-opacity-25">
                    <small className="text-secondary text-uppercase fw-bold">Quest Gems</small>
                    <div className="h4 text-light fw-bold my-1">
                      {overview.circulation.GEM.available.toLocaleString()} Gems
                    </div>
                    <small className="text-secondary">Earned from quests</small>
                  </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <div className="p-3 rounded bg-dark border border-secondary border-opacity-25">
                    <small className="text-secondary text-uppercase fw-bold">Platform Tokens</small>
                    <div className="h4 text-light fw-bold my-1">
                      {overview.circulation.TOKEN.available.toLocaleString()} Tokens
                    </div>
                    <small className="text-secondary">Tradable tokens</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Audit Activity Snapshot */}
            <div className={styles.adminCard}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Recent Admin Actions</h3>
                <button
                  type="button"
                  className="btn btn-link text-warning p-0 text-decoration-none"
                  onClick={() => handleSelectTab('audit')}
                >
                  View Full Audit Log &rarr;
                </button>
              </div>
              {overview.recentAuditLogs && overview.recentAuditLogs.length > 0 ? (
                <div className={styles.tableResponsive}>
                  <table className={styles.adminTable}>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentAuditLogs.map((log) => (
                        <tr key={log._id}>
                          <td>{formatDateTime(log.createdAt)}</td>
                          <td>
                            <strong>{log.adminEmail}</strong>
                          </td>
                          <td>
                            <span className="badge bg-primary bg-opacity-25 text-info border border-info border-opacity-25">
                              {log.action}
                            </span>
                          </td>
                          <td>
                            <code>
                              {log.targetType}:{String(log.targetId).slice(-6)}
                            </code>
                          </td>
                          <td>{log.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-secondary m-0">No administrative actions recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: USER MANAGEMENT                                   */}
        {/* ======================================================== */}
        {activeTab === 'users' && (
          <div className={styles.adminCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>User Management Directory</h2>
              <span className="text-secondary fs-6">
                Total: {usersData.pagination.total || 0} users
              </span>
            </div>

            {/* Filters */}
            <div className={styles.filterToolbar}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by name, email, or referral code..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setUserPage(1)
                  }}
                />
              </div>
              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value)
                    setUserPage(1)
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  className={styles.filterSelect}
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value)
                    setUserPage(1)
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            {usersData.users && usersData.users.length > 0 ? (
              <div className={styles.tableResponsive}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Referral Code</th>
                      <th>VE Balance</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          {u.id === user.id && (
                            <span className="badge bg-info text-dark ms-2">You</span>
                          )}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span
                            className={`badge ${
                              u.role === 'admin'
                                ? 'bg-warning text-dark'
                                : 'bg-secondary bg-opacity-50'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.badgeStatus} ${
                              u.status === 'active'
                                ? styles.badgeActive
                                : u.status === 'suspended'
                                ? styles.badgeSuspended
                                : styles.badgeInactive
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td>
                          <code>{u.referralCode || '—'}</code>
                        </td>
                        <td>
                          <strong>{u.wallet?.VE?.toLocaleString() || 0}</strong> VEs
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>
                          <div className={styles.actionBtnRow}>
                            <button
                              type="button"
                              className={styles.btnActionOutline}
                              onClick={() => handleInspectUser(u.id)}
                            >
                              Inspect
                            </button>
                            {u.id !== user.id && (
                              <button
                                type="button"
                                className={styles.btnActionOutline}
                                onClick={() => {
                                  setStatusModalUser(u)
                                  setNewStatus(u.status === 'active' ? 'suspended' : 'active')
                                  setStatusReason('')
                                }}
                              >
                                Status
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-secondary">
                <p>No users matched your search criteria.</p>
              </div>
            )}

            {/* Pagination */}
            {usersData.pagination?.totalPages > 1 && (
              <div className={styles.paginationRow}>
                <span className={styles.pageInfo}>
                  Page {usersData.pagination.page} of {usersData.pagination.totalPages}
                </span>
                <div className={styles.paginationBtns}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={userPage >= usersData.pagination.totalPages}
                    onClick={() => setUserPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: WITHDRAWAL MANAGEMENT                             */}
        {/* ======================================================== */}
        {activeTab === 'withdrawals' && (
          <div className={styles.adminCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Withdrawal & Redemption Processing</h2>
              <span className="text-secondary fs-6">
                Total Requests: {withdrawalsData.pagination.total || 0}
              </span>
            </div>

            {/* Filter toolbar */}
            <div className={styles.filterToolbar}>
              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={withdrawalStatusFilter}
                  onChange={(e) => {
                    setWithdrawalStatusFilter(e.target.value)
                    setWithdrawalPage(1)
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved (Pending Settlement)</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Withdrawals Table */}
            {withdrawalsData.withdrawals && withdrawalsData.withdrawals.length > 0 ? (
              <div className={styles.tableResponsive}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>User</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Requested At</th>
                      <th>Review Details</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalsData.withdrawals.map((w) => {
                      const isPending = w.status === 'pending'
                      const isApproved = w.status === 'approved'
                      return (
                        <tr key={w._id}>
                          <td>
                            <code>{w.withdrawalId || String(w._id).slice(-8)}</code>
                          </td>
                          <td>
                            <div>
                              <strong>{w.userId?.name || 'Unknown'}</strong>
                              <div className="small text-secondary">{w.userId?.email}</div>
                            </div>
                          </td>
                          <td>
                            <strong className="text-warning fs-6">
                              {w.amount.toLocaleString()}
                            </strong>{' '}
                            {w.assetType}
                          </td>
                          <td>
                            <span className="badge bg-dark border border-secondary border-opacity-50">
                              {w.payoutMethod}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.badgeStatus} ${
                                w.status === 'pending'
                                  ? styles.badgePending
                                  : w.status === 'approved'
                                  ? styles.badgeApproved
                                  : w.status === 'completed'
                                  ? styles.badgeCompleted
                                  : w.status === 'rejected'
                                  ? styles.badgeRejected
                                  : styles.badgeCancelled
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td>{formatDate(w.createdAt)}</td>
                          <td>
                            {w.reviewedBy ? (
                              <div className="small">
                                By: {w.reviewedBy.name || w.reviewedBy.email}
                                {w.rejectionReason && (
                                  <div className="text-danger">Reason: {w.rejectionReason}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-secondary small">Awaiting review</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.actionBtnRow}>
                              {isPending && (
                                <button
                                  type="button"
                                  className={styles.btnActionReview}
                                  onClick={() => {
                                    setReviewModalWithdrawal(w)
                                    setReviewDecision('approve')
                                    setReviewReason('')
                                    setReviewAdminNotes('')
                                  }}
                                >
                                  Review
                                </button>
                              )}
                              {isApproved && (
                                <button
                                  type="button"
                                  className={styles.btnActionSettle}
                                  onClick={() => {
                                    setSettleModalWithdrawal(w)
                                    setSettleReason('Payout disbursement verified and completed')
                                  }}
                                >
                                  Settle Payout
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-secondary">
                <p>No withdrawals found matching the current filter.</p>
              </div>
            )}

            {/* Pagination */}
            {withdrawalsData.pagination?.totalPages > 1 && (
              <div className={styles.paginationRow}>
                <span className={styles.pageInfo}>
                  Page {withdrawalsData.pagination.page} of{' '}
                  {withdrawalsData.pagination.totalPages}
                </span>
                <div className={styles.paginationBtns}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={withdrawalPage <= 1}
                    onClick={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={withdrawalPage >= withdrawalsData.pagination.totalPages}
                    onClick={() => setWithdrawalPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: AUDIT LOGS                                        */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <div className={styles.adminCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Platform Administrative Audit Trail</h2>
              <span className="badge bg-secondary">Immutable Ledger</span>
            </div>

            {/* Filter toolbar */}
            <div className={styles.filterToolbar}>
              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value)
                    setAuditPage(1)
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="USER_STATUS_CHANGE">USER_STATUS_CHANGE</option>
                  <option value="WITHDRAWAL_APPROVE">WITHDRAWAL_APPROVE</option>
                  <option value="WITHDRAWAL_REJECT">WITHDRAWAL_REJECT</option>
                  <option value="WITHDRAWAL_SETTLE">WITHDRAWAL_SETTLE</option>
                </select>
                <select
                  className={styles.filterSelect}
                  value={auditTargetFilter}
                  onChange={(e) => {
                    setAuditTargetFilter(e.target.value)
                    setAuditPage(1)
                  }}
                >
                  <option value="">All Targets</option>
                  <option value="USER">USER</option>
                  <option value="WITHDRAWAL">WITHDRAWAL</option>
                  <option value="WALLET">WALLET</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
              </div>
            </div>

            {/* Audit Table */}
            {auditData.logs && auditData.logs.length > 0 ? (
              <div className={styles.tableResponsive}>
                <table className={styles.adminTable}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Admin Actor</th>
                      <th>Action</th>
                      <th>Target</th>
                      <th>Reason</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.logs.map((log) => (
                      <tr key={log._id}>
                        <td>{formatDateTime(log.createdAt)}</td>
                        <td>
                          <strong>{log.adminEmail}</strong>
                          <div className="small text-secondary">{log.adminRole}</div>
                        </td>
                        <td>
                          <span className="badge bg-primary bg-opacity-25 text-info border border-info border-opacity-25">
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <div>
                            <span className="badge bg-dark text-light border border-secondary border-opacity-25">
                              {log.targetType}
                            </span>{' '}
                            <code>{String(log.targetId).slice(-8)}</code>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold text-light">{log.reason}</span>
                        </td>
                        <td>
                          <small className="text-secondary font-monospace">
                            {JSON.stringify(log.details)}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-secondary">
                <p>No audit records found.</p>
              </div>
            )}

            {/* Pagination */}
            {auditData.pagination?.totalPages > 1 && (
              <div className={styles.paginationRow}>
                <span className={styles.pageInfo}>
                  Page {auditData.pagination.page} of {auditData.pagination.totalPages}
                </span>
                <div className={styles.paginationBtns}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={auditPage >= auditData.pagination.totalPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: USER DETAILS INSPECTION                           */}
      {/* ======================================================== */}
      {selectedUserDetails && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>User Profile & Financial Overview</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedUserDetails(null)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className="mb-3 p-3 bg-dark rounded border border-secondary border-opacity-25">
                <div className="h5 text-light fw-bold mb-1">
                  {selectedUserDetails.user.name}
                </div>
                <div className="text-secondary mb-2">{selectedUserDetails.user.email}</div>
                <div className="d-flex gap-2 align-items-center">
                  <span className="badge bg-secondary">{selectedUserDetails.user.role}</span>
                  <span
                    className={`badge ${
                      selectedUserDetails.user.status === 'active'
                        ? 'bg-success'
                        : 'bg-danger'
                    }`}
                  >
                    {selectedUserDetails.user.status}
                  </span>
                  <span className="small text-secondary">
                    Referral: <code>{selectedUserDetails.user.referralCode || 'N/A'}</code>
                  </span>
                </div>
              </div>

              <h4 className="h6 text-warning fw-bold text-uppercase mb-2">Wallet Balances</h4>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="p-2 bg-dark rounded border border-secondary border-opacity-25">
                    <small className="text-secondary">VE Available / Reserved</small>
                    <div className="fw-bold text-light">
                      {selectedUserDetails.wallet?.balances?.VE?.available?.toLocaleString() || 0}{' '}
                      / {selectedUserDetails.wallet?.balances?.VE?.reserved?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-dark rounded border border-secondary border-opacity-25">
                    <small className="text-secondary">SVEs</small>
                    <div className="fw-bold text-light">
                      {selectedUserDetails.wallet?.balances?.SVE?.available?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-dark rounded border border-secondary border-opacity-25">
                    <small className="text-secondary">Quest Gems</small>
                    <div className="fw-bold text-light">
                      {selectedUserDetails.wallet?.balances?.GEM?.available?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-dark rounded border border-secondary border-opacity-25">
                    <small className="text-secondary">Tokens</small>
                    <div className="fw-bold text-light">
                      {selectedUserDetails.wallet?.balances?.TOKEN?.available?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="h6 text-warning fw-bold text-uppercase mb-2">Progression</h4>
              <div className="p-2 bg-dark rounded border border-secondary border-opacity-25 mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>
                    Level {selectedUserDetails.progression?.currentLevel} (
                    {selectedUserDetails.progression?.currentLevelName})
                  </span>
                  <span className="fw-bold text-warning">
                    {selectedUserDetails.progression?.currentXp?.toLocaleString()} XP
                  </span>
                </div>
              </div>

              <h4 className="h6 text-warning fw-bold text-uppercase mb-2">Withdrawals Summary</h4>
              <div className="p-2 bg-dark rounded border border-secondary border-opacity-25">
                <div className="d-flex justify-content-between">
                  <span>Total Settled Withdrawn:</span>
                  <strong className="text-success">
                    {selectedUserDetails.withdrawals?.totalWithdrawn?.toLocaleString() || 0} VEs
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Pending Requests:</span>
                  <strong className="text-warning">
                    {selectedUserDetails.withdrawals?.pending || 0}
                  </strong>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedUserDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHANGE USER STATUS                                */}
      {/* ======================================================== */}
      {statusModalUser && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <form onSubmit={handleSubmitStatusChange}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Update Account Status</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setStatusModalUser(null)}
                >
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <p className="text-secondary mb-3">
                  Changing account status for <strong>{statusModalUser.name}</strong> (
                  <code>{statusModalUser.email}</code>).
                </p>

                <div className="mb-3">
                  <label htmlFor="new-status-select" className={styles.formLabel}>New Status</label>
                  <select
                    id="new-status-select"
                    className={styles.formControl}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="active">Active (Full platform access)</option>
                    <option value="suspended">Suspended (Access blocked with HTTP 403)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="status-reason-input" className={styles.formLabel}>
                    Mandatory Reason / Audit Justification
                  </label>
                  <textarea
                    id="status-reason-input"
                    className={styles.formControl}
                    rows="3"
                    placeholder="Enter reason for audit logs (required)..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setStatusModalUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-warning btn-sm"
                  disabled={statusUpdating || !statusReason.trim()}
                >
                  {statusUpdating ? 'Saving...' : 'Apply Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REVIEW WITHDRAWAL (APPROVE / REJECT)              */}
      {/* ======================================================== */}
      {reviewModalWithdrawal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <form onSubmit={handleSubmitReview}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Review Withdrawal Request</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setReviewModalWithdrawal(null)}
                >
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className="mb-3 p-3 bg-dark rounded border border-secondary border-opacity-25">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">Requested Amount:</span>
                    <strong className="text-warning fs-5">
                      {reviewModalWithdrawal.amount.toLocaleString()}{' '}
                      {reviewModalWithdrawal.assetType}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-secondary">User:</span>
                    <span>{reviewModalWithdrawal.userId?.name || 'User'}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-secondary">Payout Method:</span>
                    <span className="badge bg-secondary">
                      {reviewModalWithdrawal.payoutMethod}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="review-decision-select" className={styles.formLabel}>Decision</label>
                  <select
                    id="review-decision-select"
                    className={styles.formControl}
                    value={reviewDecision}
                    onChange={(e) => setReviewDecision(e.target.value)}
                  >
                    <option value="approve">Approve (Authorize for settlement)</option>
                    <option value="reject">Reject (Release reserved funds back to user)</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="review-reason-input" className={styles.formLabel}>
                    Mandatory Reason (Recorded in audit logs)
                  </label>
                  <textarea
                    id="review-reason-input"
                    className={styles.formControl}
                    rows="3"
                    placeholder="Enter reason for this decision (required)..."
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label htmlFor="review-notes-input" className={styles.formLabel}>Internal Admin Notes (Optional)</label>
                  <input
                    id="review-notes-input"
                    type="text"
                    className={styles.formControl}
                    placeholder="Optional staff notes..."
                    value={reviewAdminNotes}
                    onChange={(e) => setReviewAdminNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setReviewModalWithdrawal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-sm ${
                    reviewDecision === 'approve' ? 'btn-primary' : 'btn-danger'
                  }`}
                  disabled={reviewing || !reviewReason.trim()}
                >
                  {reviewing ? 'Processing...' : `Confirm ${reviewDecision}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SETTLE WITHDRAWAL PAYOUT                          */}
      {/* ======================================================== */}
      {settleModalWithdrawal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <form onSubmit={handleSubmitSettle}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Settle Withdrawal Payout</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setSettleModalWithdrawal(null)}
                >
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className="alert alert-info border border-info border-opacity-25 bg-dark text-light mb-3">
                  <p className="mb-1">
                    You are confirming final payout settlement of{' '}
                    <strong className="text-warning">
                      {settleModalWithdrawal.amount.toLocaleString()}{' '}
                      {settleModalWithdrawal.assetType}
                    </strong>{' '}
                    to user <strong>{settleModalWithdrawal.userId?.name}</strong>.
                  </p>
                  <small className="text-secondary">
                    This permanently clears the reserved hold, moves the funds into settled
                    withdrawals, and transitions status to <code>completed</code>.
                  </small>
                </div>

                <div className="mb-3">
                  <label htmlFor="settle-reason-input" className={styles.formLabel}>Settlement Note / Reference</label>
                  <textarea
                    id="settle-reason-input"
                    className={styles.formControl}
                    rows="3"
                    placeholder="E.g., Bank transfer reference #123456 completed"
                    value={settleReason}
                    onChange={(e) => setSettleReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setSettleModalWithdrawal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success btn-sm"
                  disabled={settling || !settleReason.trim()}
                >
                  {settling ? 'Settling...' : 'Complete & Settle Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
