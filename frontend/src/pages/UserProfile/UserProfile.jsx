import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import styles from './UserProfile.module.css'

export function UserProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    let isMounted = true

    const loadProfile = async () => {
      try {
        const data = await api.user.getProfile()
        if (isMounted) {
          setProfile(data.profile)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          if (err.status === 401 || err.status === 403) {
            logout()
            navigate('/login', { replace: true })
            return
          }
          setError(err.message || 'Failed to load profile data.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, logout, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    api.user
      .getProfile()
      .then((data) => {
        setProfile(data.profile)
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          logout()
          navigate('/login', { replace: true })
          return
        }
        setError(err.message || 'Failed to load profile data.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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
      <div className={styles.profileContainer}>
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonHeader}></div>
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLine} style={{ width: '40%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '70%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '55%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '85%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileWrapper}>
          <div className="alert alert-danger p-4 text-center" role="alert">
            <h4 className="alert-heading fw-bold">Unable to Load Profile</h4>
            <p className="mb-3">{error}</p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleRetry}
              >
                Retry
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
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

  if (!profile) {
    return null
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileWrapper}>
        {/* Verified User Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.cardHeader}>
            <div className={styles.avatarAndInfo}>
              <div className={styles.avatar} aria-hidden="true">
                {getInitials(profile.name)}
              </div>
              <div>
                <h1 className={styles.userName}>{profile.name}</h1>
                <p className={styles.userEmail}>{profile.email}</p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                onClick={handleRetry}
                title="Refresh profile data from server"
              >
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className={styles.cardBody}>
            <h2 className={styles.sectionTitle}>
              <span>Account Information</span>
            </h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Full Name</div>
                <div className={styles.infoValue}>{profile.name}</div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Email Address</div>
                <div className={styles.infoValue}>{profile.email}</div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Account Role</div>
                <div className={styles.infoValue}>
                  <span className={styles.roleBadge}>{profile.role}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Account Status</div>
                <div className={styles.infoValue}>
                  <span className={styles.statusBadge}>{profile.status}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Member Since</div>
                <div className={styles.infoValue}>
                  {formatDate(profile.memberSince || profile.createdAt)}
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Profile Last Updated</div>
                <div className={styles.infoValue}>
                  {formatDate(profile.updatedAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Honest Pending Reward Module Section */}
        <div className={styles.pendingCard}>
          <div className={styles.pendingHeader}>
            <h3 className={styles.pendingTitle}>Rewards & Loyalty Platform</h3>
            <span className={styles.pendingBadge}>Coming Soon</span>
          </div>
          <p className={styles.pendingText}>
            Reward point balances, tier qualifications, activity logs, referral tracking, and
            redemption catalogs are currently scheduled for development in Milestone 3.
            Real transactions and rewards will appear here once the rewards backend module
            is implemented.
          </p>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
