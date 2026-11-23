import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './TopHeader.module.css'

export function TopHeader() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('EN')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [hapticFeedback, setHapticFeedback] = useState(true)
  const [audioFeedback, setAudioFeedback] = useState(true)

  const langRef = useRef(null)
  const settingsRef = useRef(null)
  const userMenuRef = useRef(null)

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setIsLangOpen(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getInitials = (name) => {
    if (!name) return 'VE'
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className={styles.topHeader} aria-label="Top Dashboard Navigation">
      {/* Left Area: VE Loop Brand Wordmark & Search */}
      <div className={styles.leftArea}>
        <Link to="/" className={styles.brandContainer} title="VE Loop Rewards">
          <div className={styles.brandIconBox}>
            <span className={styles.brandIconText}>VE</span>
          </div>
          <div className={styles.brandWordmark}>
            <span className={styles.brandYellow}>VE LOOP</span>
            <span className={styles.brandWhite}>REWARDS</span>
          </div>
        </Link>

        {/* Global Search */}
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search rewards, tasks, wallet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search dashboard"
          />
        </div>
      </div>

      {/* Right Area: Language Selector, Settings, Notifications & Profile */}
      <div className={styles.rightArea}>
        {/* Language Selector Dropdown */}
        <div className={styles.dropdownContainer} ref={langRef}>
          <button
            type="button"
            className={`${styles.headerPillBtn} ${isLangOpen ? styles.btnActive : ''}`}
            onClick={() => setIsLangOpen((prev) => !prev)}
            aria-label="Select Language"
            aria-expanded={isLangOpen}
          >
            <span className={styles.langGlobeIcon} aria-hidden="true">🌐</span>
            <span className={styles.langCurrentText}>{selectedLang}</span>
            <svg
              className={`${styles.chevronIcon} ${isLangOpen ? styles.chevronRotated : ''}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isLangOpen && (
            <div className={styles.dropdownMenu} role="menu">
              <button
                type="button"
                className={`${styles.menuItem} ${selectedLang === 'EN' ? styles.menuItemActive : ''}`}
                onClick={() => {
                  setSelectedLang('EN')
                  setIsLangOpen(false)
                }}
                role="menuitem"
              >
                <span className={styles.flagIcon}>🇺🇸</span>
                <span>English (EN)</span>
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${selectedLang === 'HI' ? styles.menuItemActive : ''}`}
                onClick={() => {
                  setSelectedLang('HI')
                  setIsLangOpen(false)
                }}
                role="menuitem"
              >
                <span className={styles.flagIcon}>🇮🇳</span>
                <span>हिन्दी (HI)</span>
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${selectedLang === 'ES' ? styles.menuItemActive : ''}`}
                onClick={() => {
                  setSelectedLang('ES')
                  setIsLangOpen(false)
                }}
                role="menuitem"
              >
                <span className={styles.flagIcon}>🇪🇸</span>
                <span>Español (ES)</span>
              </button>
            </div>
          )}
        </div>

        {/* Settings Button & Popover */}
        <div className={styles.dropdownContainer} ref={settingsRef}>
          <button
            type="button"
            className={`${styles.iconBtn} ${isSettingsOpen ? styles.btnActive : ''}`}
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            title="Settings & Preferences"
            aria-label="Settings and preferences"
            aria-expanded={isSettingsOpen}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {isSettingsOpen && (
            <div className={styles.settingsMenu} role="dialog" aria-label="Quick Settings">
              <div className={styles.menuHeader}>
                <span className={styles.menuTitle}>Preferences</span>
                <span className={styles.badgePro}>Fintech Core</span>
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Audio Cues</div>
                  <div className={styles.settingSub}>Reward sound effects</div>
                </div>
                <button
                  type="button"
                  className={`${styles.toggleSwitch} ${audioFeedback ? styles.toggleOn : ''}`}
                  onClick={() => setAudioFeedback((prev) => !prev)}
                  aria-label="Toggle reward sound effects"
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Haptic Feedback</div>
                  <div className={styles.settingSub}>Subtle reward vibrations</div>
                </div>
                <button
                  type="button"
                  className={`${styles.toggleSwitch} ${hapticFeedback ? styles.toggleOn : ''}`}
                  onClick={() => setHapticFeedback((prev) => !prev)}
                  aria-label="Toggle haptic feedback"
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
              <div className={styles.settingsDivider} />
              <Link to="/user-profile" className={styles.menuLink} onClick={() => setIsSettingsOpen(false)}>
                <span>Account & Security Settings</span>
                <span>&rarr;</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          className={styles.iconBtn}
          title="Notifications"
          aria-label="View notifications"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.notificationDot} />
        </button>

        {/* User Account Capsule / Dropdown */}
        {isAuthenticated && user ? (
          <div className={styles.dropdownContainer} ref={userMenuRef}>
            <button
              type="button"
              className={styles.userCapsule}
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-label="User account menu"
              aria-expanded={isUserMenuOpen}
            >
              <div className={styles.avatar}>{getInitials(user.name)}</div>
              <div className={styles.userMeta}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userRoleTag}>{user.role || 'Member'}</span>
              </div>
              <svg
                className={`${styles.chevronIcon} ${isUserMenuOpen ? styles.chevronRotated : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isUserMenuOpen && (
              <div className={styles.userDropdownMenu} role="menu">
                <div className={styles.userDropdownHeader}>
                  <div className={styles.userDropdownName}>{user.name}</div>
                  <div className={styles.userDropdownEmail}>{user.email}</div>
                </div>
                <div className={styles.dropdownDivider} />
                <Link
                  to="/user-profile"
                  className={styles.userMenuItem}
                  onClick={() => setIsUserMenuOpen(false)}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>My Profile &amp; Wallet</span>
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={styles.userMenuItem}
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Admin Command Center</span>
                  </Link>
                )}
                <div className={styles.dropdownDivider} />
                <button
                  type="button"
                  className={`${styles.userMenuItem} ${styles.logoutMenuItem}`}
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
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
