import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './Login.module.css'

export function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Client-side validations
    if (isRegisterMode && (!name || name.trim().length < 2)) {
      setError('Please provide a name with at least 2 characters.')
      return
    }

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.')
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setSubmitting(true)

    try {
      if (isRegisterMode) {
        await register({ name: name.trim(), email: email.trim(), password })
      } else {
        await login({ email: email.trim(), password })
      }
      navigate('/profile')
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMode = () => {
    setIsRegisterMode((prev) => !prev)
    setError(null)
    setPassword('')
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.cardHeader}>
          <span className={styles.authBadge}>
            {isRegisterMode ? 'Registration' : 'Secure Login'}
          </span>
          <h1 className={styles.title}>
            {isRegisterMode ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className={styles.subtitle}>
            {isRegisterMode
              ? 'Join VE Loop Rewards to begin managing your profile.'
              : 'Sign in to access your verified profile and rewards.'}
          </p>
        </div>

        <div className={styles.cardBody}>
          {error && (
            <div className={styles.errorAlert} role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {isRegisterMode && (
              <div className="mb-3">
                <label className={styles.formLabel} htmlFor="auth-name">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  className={styles.inputField}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  disabled={submitting}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="mb-3">
              <label className={styles.formLabel} htmlFor="auth-email">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                className={styles.inputField}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                disabled={submitting}
                autoComplete="email"
              />
            </div>

            <div className="mb-4">
              <label className={styles.formLabel} htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className={styles.inputField}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={submitting}
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              />
              {isRegisterMode && (
                <small className="text-secondary d-block mt-1">
                  Must be at least 6 characters long.
                </small>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting
                ? isRegisterMode
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isRegisterMode
                ? 'Create Account'
                : 'Sign In'}
            </button>
          </form>

          <div className={styles.toggleSection}>
            <span>
              {isRegisterMode
                ? 'Already have an account?'
                : "Don't have an account yet?"}
            </span>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={toggleMode}
              disabled={submitting}
            >
              {isRegisterMode ? 'Sign In' : 'Create an Account'}
            </button>
          </div>

          {!isRegisterMode && (
            <div className={styles.demoBox} aria-label="Demo Credentials Panel">
              <div className={styles.demoTitle}>
                <span>Demo Evaluation Access</span>
                <span className={styles.demoBadge}>Demo Mode</span>
              </div>
              <div className={styles.demoRow}>
                <div>
                  <div className={styles.demoLabel}>Demo Administrator</div>
                  <div className={styles.demoVal}>demo-admin@example.com</div>
                </div>
                <button
                  type="button"
                  className={styles.quickFillBtn}
                  onClick={() => {
                    setEmail('demo-admin@example.com')
                    setPassword('AdminPassword123!')
                    setError(null)
                  }}
                  title="Quick-fill Demo Admin credentials"
                >
                  Quick Fill
                </button>
              </div>
              <div className={styles.demoRow}>
                <div>
                  <div className={styles.demoLabel}>Demo Regular User</div>
                  <div className={styles.demoVal}>demo-user@example.com</div>
                </div>
                <button
                  type="button"
                  className={styles.quickFillBtn}
                  onClick={() => {
                    setEmail('demo-user@example.com')
                    setPassword('UserPassword123!')
                    setError(null)
                  }}
                  title="Quick-fill Demo User credentials"
                >
                  Quick Fill
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
