import { useState, useEffect } from 'react'
import { api } from '../services/api'
import styles from './HealthStatus.module.css'

export function HealthStatus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.checkHealth()
      setStatus(data)
    } catch (err) {
      setError(err.message || 'Unable to reach backend service')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false

    api
      .checkHealth()
      .then((data) => {
        if (!ignore) {
          setStatus(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Unable to reach backend service')
          setStatus(null)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className={`card ${styles.statusCard}`}>
      <div className={styles.cardHeader}>
        <span className={styles.headerTitle}>VE Loop System Health</span>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      <div className="card-body py-3">
        {loading && (
          <div className="text-center py-2">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-secondary small mb-0">Checking backend and MongoDB connectivity...</p>
          </div>
        )}

        {!loading && error && (
          <div className="alert alert-danger mb-0 py-2" role="alert">
            <h6 className="alert-heading fw-bold mb-1 small">Backend Connection Error</h6>
            <p className="mb-1 small">{error}</p>
            <small className="text-secondary d-block">
              Ensure the backend server is running on port 3000 and MongoDB is active.
            </small>
          </div>
        )}

        {!loading && status && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className={styles.label}>API Service:</span>
              <span className={styles.badgeService}>{status.service}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className={styles.label}>Service Status:</span>
              <span className={styles.badgeSuccess}>{status.status.toUpperCase()}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className={styles.label}>MongoDB Database:</span>
              <span
                className={
                  status.database?.connected ? styles.badgeSuccess : styles.badgeWarning
                }
              >
                {status.database?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            {status.timestamp && (
              <div className={`text-end mt-2 ${styles.timestamp}`}>
                Last checked: {new Date(status.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthStatus
