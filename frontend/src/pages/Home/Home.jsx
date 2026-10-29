import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import HealthStatus from '../../components/HealthStatus'
import styles from './Home.module.css'

export function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <main className={`container my-auto py-5 ${styles.homeMain}`}>
      <div className="row justify-content-center text-center">
        <div className="col-lg-8 col-md-10">
          <div className={styles.welcomeBadge}>Enterprise Loyalty & Profile System</div>
          <h1 className={styles.welcomeHeading}>
            Welcome to <span className={styles.textAccentGold}>VE Loop Rewards</span>
          </h1>
          <p className={styles.welcomeDescription}>
            Your centralized platform for managing verified user profiles, tracking engagement,
            and unlocking tier-based rewards.
          </p>

          <div className="d-flex justify-content-center gap-3 mt-4">
            {isAuthenticated ? (
              <Link to="/profile" className="btn btn-primary px-4 py-2 fw-semibold">
                View My Profile
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary px-4 py-2 fw-semibold">
                Sign In to Platform
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Development Diagnostic */}
      <div className="row justify-content-center mt-5">
        <div className="col-lg-6 col-md-8">
          <div className={styles.diagnosticSection}>
            <div className="text-center mb-2">
              <small className={styles.diagnosticHeader}>
                System Diagnostics
              </small>
            </div>
            <HealthStatus />
          </div>
        </div>
      </div>
    </main>
  )
}

export default Home
