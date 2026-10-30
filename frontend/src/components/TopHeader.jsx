import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './TopHeader.module.css'

export function TopHeader() {
  const { isAuthenticated, user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const getInitials = (name) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
  }

  return (
    <header className={styles.topHeader} aria-label="Top Dashboard Navigation">
      <div className={styles.leftArea}>
        {/* Mobile Brand */}
        <Link to="/" className={styles.mobileBrand}>
          <div className={styles.mobileBrandBadge}>VE</div>
        </Link>

        {/* Global Search Bar */}
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search rewards, transactions, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search dashboard"
          />
        </div>
      </div>

      <div className={styles.rightArea}>
        {/* Notification Bell */}
        <button
          type="button"
          className={styles.iconBtn}
          title="Notifications"
          aria-label="View notifications"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.notificationDot} />
        </button>

        {/* User Pill / Profile Status */}
        {isAuthenticated && user ? (
          <Link
            to="/user-profile"
            className={styles.userPill}
            title="Go to user profile"
          >
            <div className={styles.avatar}>{getInitials(user.name)}</div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.role}</span>
            </div>
          </Link>
        ) : (
          <Link to="/login" className={styles.signInBtn}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}

export default TopHeader
