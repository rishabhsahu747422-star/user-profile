import { useState } from 'react'
import styles from './SpinWheelModal.module.css'

const SEGMENTS = [
  { label: '50 VE', color: '#8652F5', icon: '💎' },
  { label: '100 XP', color: '#347CF5', icon: '⭐' },
  { label: '25 VE', color: '#E84DA8', icon: '🪙' },
  { label: '2x Boost', color: '#FFC928', icon: '⚡' },
  { label: '10 GEM', color: '#18C78A', icon: '💠' },
  { label: '75 VE', color: '#8652F5', icon: '🎁' },
  { label: '250 XP', color: '#347CF5', icon: '🔥' },
  { label: 'Lucky Key', color: '#FFC928', icon: '🗝️' }
]

export function SpinWheelModal({ isOpen, onClose, onRewardWon }) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)

  if (!isOpen) return null

  const handleSpin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    // Random segment index
    const randomIndex = Math.floor(Math.random() * SEGMENTS.length)
    const segmentAngle = 360 / SEGMENTS.length
    // Spin at least 5 full rotations (1800 deg) + target angle
    const extraTurns = 5 * 360
    const targetDeg = extraTurns + (360 - (randomIndex * segmentAngle + segmentAngle / 2))
    const totalRotation = rotation + targetDeg

    setRotation(totalRotation)

    setTimeout(() => {
      setSpinning(false)
      const won = SEGMENTS[randomIndex]
      setResult(won)
      if (onRewardWon) {
        onRewardWon(won)
      }
    }, 3800)
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="wheel-title">
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <span className={styles.badgePink}>Daily Fortune</span>
            <h3 id="wheel-title" className={styles.modalTitle}>Lucky Spin Wheel</h3>
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
          <p className={styles.modalSubtitle}>
            Spin daily to unlock bonus VEs, XP boosters, and mystery platform gems!
          </p>

          <div className={styles.wheelContainer}>
            {/* Pointer / Ticker */}
            <div className={styles.wheelPointer} aria-hidden="true">
              ▼
            </div>

            {/* Rotating Wheel Plate */}
            <div
              className={styles.wheelPlate}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 3.8s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none'
              }}
            >
              <div className={styles.wheelCenterPin}>
                <span>VE</span>
              </div>
              {SEGMENTS.map((seg, idx) => {
                const angle = (360 / SEGMENTS.length) * idx
                return (
                  <div
                    key={idx}
                    className={styles.wheelSector}
                    style={{
                      transform: `rotate(${angle}deg)`
                    }}
                  >
                    <span className={styles.sectorContent} style={{ color: seg.color }}>
                      {seg.icon} {seg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {result && (
            <div className={styles.resultBanner}>
              <span className={styles.resultIcon}>{result.icon}</span>
              <div>
                <strong className={styles.resultTitle}>Congratulations!</strong>
                <p className={styles.resultMsg}>You landed on <strong>{result.label}</strong>!</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onClose}
            disabled={spinning}
          >
            Close
          </button>
          <button
            type="button"
            className={styles.btnSpin}
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? 'Spinning...' : 'Spin The Wheel'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SpinWheelModal
