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
      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 py-2">
        <span className="fw-semibold small">VE Loop System Health</span>
        <button
          type="button"
          className="btn btn-sm btn-outline-light py-0 px-2"
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
              <span className="fw-medium text-light small">API Service:</span>
              <span className="badge bg-primary">{status.service}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-medium text-light small">Service Status:</span>
              <span className="badge bg-success">{status.status.toUpperCase()}</span>
            </div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="fw-medium text-light small">MongoDB Database:</span>
              <span
                className={`badge ${
                  status.database?.connected ? 'bg-success' : 'bg-warning text-dark'
                }`}
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
