import { useState } from 'react'
import styles from './TapEarnModal.module.css'

export function TapEarnModal({ isOpen, onClose, onRewardEarned }) {
  const [tapsLeft, setTapsLeft] = useState(20)
  const [earnedInSession, setEarnedInSession] = useState(0)
  const [tapEffect, setTapEffect] = useState(false)

  if (!isOpen) return null

  const handleTap = () => {
    if (tapsLeft <= 0) return
    setTapsLeft((prev) => prev - 1)
    setEarnedInSession((prev) => prev + 5)
    setTapEffect(true)
    setTimeout(() => setTapEffect(false), 200)

    if (onRewardEarned) {
      onRewardEarned(5)
    }
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="tap-modal-title">
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.badgeBlue}>Active Boost Matrix</span>
            <h3 id="tap-modal-title" className={styles.modalTitle}>Tap &amp; Earn VE</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Taps Left</span>
              <strong className={styles.statValue}>{tapsLeft}</strong>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Session Earned</span>
              <strong className={styles.statValueYellow}>+{earnedInSession} VE</strong>
            </div>
          </div>

          <div className={styles.tapArea}>
            <button
              type="button"
              className={`${styles.tapCoinBtn} ${tapEffect ? styles.coinActive : ''}`}
              onClick={handleTap}
              disabled={tapsLeft <= 0}
              aria-label="Tap to earn VE"
            >
              <div className={styles.coinInner}>
                <span className={styles.coinSymbol}>VE</span>
              </div>
            </button>
            <p className={styles.tapPrompt}>
              {tapsLeft > 0 ? 'Tap the VE emblem to claim micro-rewards' : 'All energy depleted! Regenerates in 30 mins.'}
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnDone}
            onClick={onClose}
          >
            Collect &amp; Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default TapEarnModal
