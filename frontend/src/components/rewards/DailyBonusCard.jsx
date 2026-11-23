import { useState } from 'react'
import styles from './DailyBonusCard.module.css'

export function DailyBonusCard({
  claimedToday = false,
  onClaim,
  dailyAmount = 50,
  streakDays = 4,
  multiplier = '1.5x'
}) {
  const [claiming, setClaiming] = useState(false)
  const [isClaimed, setIsClaimed] = useState(claimedToday)

  const handleClaimClick = async () => {
    if (isClaimed || claiming) return
    setClaiming(true)
    try {
      if (onClaim) {
        await onClaim()
      }
      setIsClaimed(true)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <section className={styles.dailyBonusSection} aria-labelledby="daily-bonus-heading">
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className={styles.cardInner}>
        {/* Left Side: Information & Benefit Indicators */}
        <div className={styles.leftCol}>
          <div className={styles.pillRow}>
            <span className={styles.exclusiveBadge}>✨ 24h Daily Check-In</span>
            <span className={styles.streakBadge}>Day {streakDays} Streak</span>
          </div>

          <h2 id="daily-bonus-heading" className={styles.heading}>
            Daily Bonus Rewards
          </h2>

          <p className={styles.description}>
            Log in each day to claim instant VE currency credited directly to your cryptographic ledger. Maintain your continuous check-in sequence to elevate your tier multiplier.
          </p>

          <div className={styles.benefitIndicators}>
            <div className={styles.indicatorItem}>
              <div className={styles.indicatorIcon}>🎁</div>
              <div className={styles.indicatorTexts}>
                <span className={styles.indicatorLabel}>Base Reward</span>
                <strong className={styles.indicatorVal}>+{dailyAmount} VE</strong>
              </div>
            </div>

            <div className={styles.indicatorItem}>
              <div className={styles.indicatorIcon}>⚡</div>
              <div className={styles.indicatorTexts}>
                <span className={styles.indicatorLabel}>Active Multiplier</span>
                <strong className={styles.indicatorVal}>{multiplier}</strong>
              </div>
            </div>

            <div className={styles.indicatorItem}>
              <div className={styles.indicatorIcon}>🛡️</div>
              <div className={styles.indicatorTexts}>
                <span className={styles.indicatorLabel}>Streak Protection</span>
                <strong className={styles.indicatorVal}>Enabled</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Claim Status, Access Info & Signature Yellow Gradient CTA */}
        <div className={styles.rightCol}>
          <div className={styles.statusBox}>
            <div className={styles.statusHeader}>
              <span className={styles.statusLabel}>Today's Status</span>
              <span className={`${styles.statusDot} ${isClaimed ? styles.dotClaimed : styles.dotAvailable}`} />
            </div>

            <div className={styles.statusValue}>
              {isClaimed ? 'Claimed for Today' : 'Ready to Claim'}
            </div>

            <p className={styles.accessInfo}>
              {isClaimed
                ? 'Check back in tomorrow after 00:00 UTC to advance to Day ' + (streakDays + 1) + '.'
                : 'Claim now before timer resets at 23:59 UTC to retain your streak multiplier.'}
            </p>

            <button
              type="button"
              className={styles.signatureYellowBtn}
              onClick={handleClaimClick}
              disabled={isClaimed || claiming}
            >
              {isClaimed ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Bonus Claimed</span>
                </>
              ) : claiming ? (
                <span>Claiming Reward...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span>Claim Daily Bonus</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DailyBonusCard
