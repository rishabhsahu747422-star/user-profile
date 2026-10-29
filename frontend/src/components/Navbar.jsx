import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Navbar.module.css'

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className={styles.navbar} aria-label="Main Navigation">
      <div className="container d-flex justify-content-between align-items-center py-3">
        <Link to="/" className={styles.brand}>
          <span className={styles.brandBadge}>VE</span>
          <span className={styles.brandTitle}>VE Loop Rewards</span>
        </Link>

        <div className={styles.navLinks}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            Home
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink
                to="/user-profile"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                My Profile
              </NavLink>
              {user?.role && (
                <span className={`d-none d-md-inline-block ${styles.userBadge}`}>
                  {user.role}
                </span>
              )}
              <button
                type="button"
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                Log Out
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
