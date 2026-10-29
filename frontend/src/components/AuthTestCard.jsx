import { useState, useEffect } from 'react'
import { api, getAuthToken } from '../services/api'
import styles from './AuthTestCard.module.css'

export function AuthTestCard() {
  const [activeTab, setActiveTab] = useState('login') // 'login' | 'register'
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'danger', message: '' }

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Check if existing token can fetch current user on mount
  useEffect(() => {
    const token = getAuthToken()
    if (!token) return

    let ignore = false
    api.auth
      .getMe()
      .then((res) => {
        if (!ignore) {
          setCurrentUser(res.user)
        }
      })
      .catch(() => {
        if (!ignore) {
          api.auth.logout()
          setCurrentUser(null)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      const res = await api.auth.register({ name, email, password })
      setCurrentUser(res.user)
      setFeedback({ type: 'success', message: 'Registration successful! Signed in automatically.' })
      setPassword('')
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      const res = await api.auth.login({ email, password })
      setCurrentUser(res.user)
      setFeedback({ type: 'success', message: 'Login successful!' })
      setPassword('')
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.auth.logout()
    setCurrentUser(null)
    setFeedback({ type: 'info', message: 'Logged out successfully.' })
  }

  const handleRefreshMe = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      const res = await api.auth.getMe()
      setCurrentUser(res.user)
      setFeedback({ type: 'success', message: 'Verified current token via GET /api/auth/me.' })
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message })
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`card ${styles.cardContainer}`}>
      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
        <span className="fw-semibold">Milestone 2A: Authentication Tester</span>
        {currentUser && (
          <span className="badge bg-success">
            {currentUser.role?.toUpperCase()} • {currentUser.status}
          </span>
        )}
      </div>

      {!currentUser && (
        <div className={styles.authTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'login' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('login')
              setFeedback(null)
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'register' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('register')
              setFeedback(null)
            }}
          >
            Register
          </button>
        </div>
      )}

      <div className="card-body">
        {feedback && (
          <div className={`alert alert-${feedback.type} py-2 mb-3`} role="alert">
            <small>{feedback.message}</small>
          </div>
        )}

        {currentUser ? (
          <div>
            <h6 className="fw-bold text-success mb-2">Authenticated Session Active</h6>
            <div className="mb-3">
              <div className="small text-muted mb-1">Decoded /api/auth/me response:</div>
              <pre className={styles.jsonOutput}>{JSON.stringify(currentUser, null, 2)}</pre>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm flex-fill"
                onClick={handleRefreshMe}
                disabled={loading}
              >
                {loading ? 'Validating...' : 'Re-verify /api/auth/me'}
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        ) : activeTab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-2">
              <label className="form-label small fw-medium mb-1" htmlFor="login-email">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control form-control-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-medium mb-1" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-control form-control-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm w-100"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="mb-2">
              <label className="form-label small fw-medium mb-1" htmlFor="register-name">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                className="form-control form-control-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="mb-2">
              <label className="form-label small fw-medium mb-1" htmlFor="register-email">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                className="form-control form-control-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-medium mb-1" htmlFor="register-password">
                Password (min 6 characters)
              </label>
              <input
                id="register-password"
                type="password"
                className="form-control form-control-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-success btn-sm w-100"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default AuthTestCard
