import { useState } from 'react'
import styles from './StakeModal.module.css'

export function StakeModal({ isOpen, onClose, availableVE = 2300, currentSVE = 150, onStakeSuccess }) {
  const [stakeAmount, setStakeAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  if (!isOpen) return null

  const handleStake = (e) => {
    e.preventDefault()
    const amountNum = Number(stakeAmount)
    if (!amountNum || amountNum <= 0) return
    if (amountNum > availableVE) {
      setMessage({ type: 'error', text: `Amount exceeds available ${availableVE.toLocaleString()} VE.` })
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setMessage({ type: 'success', text: `Successfully locked ${amountNum} VE into SVE yield vault!` })
      if (onStakeSuccess) {
        onStakeSuccess(amountNum)
      }
      setTimeout(() => {
        onClose()
      }, 1500)
    }, 800)
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="stake-modal-title">
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.badgeGreen}>Cryptographic Vault</span>
            <h3 id="stake-modal-title" className={styles.modalTitle}>Stake VE for SVE Yield</h3>
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

        <form onSubmit={handleStake}>
          <div className={styles.modalBody}>
            <div className={styles.balanceSummary}>
              <div className={styles.balanceItem}>
                <span className={styles.balanceLabel}>Available VE</span>
                <strong className={styles.balanceVal}>{availableVE.toLocaleString()} VE</strong>
              </div>
              <div className={styles.balanceItem}>
                <span className={styles.balanceLabel}>Current SVE Position</span>
                <strong className={styles.balanceValGreen}>{currentSVE.toLocaleString()} SVE</strong>
              </div>
            </div>

            {message && (
              <div className={message.type === 'error' ? styles.msgError : styles.msgSuccess}>
                {message.text}
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="stake-input" className={styles.formLabel}>
                Amount to Stake (VE)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="stake-input"
                  type="number"
                  min="1"
                  max={availableVE}
                  placeholder="e.g. 500"
                  className={styles.formInput}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.maxBtn}
                  onClick={() => setStakeAmount(String(availableVE))}
                >
                  MAX
                </button>
              </div>
            </div>

            <div className={styles.termsNote}>
              🔒 Staked positions generate platform fee shares. Early unstaking respects compensating transaction balance rules.
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submitting || availableVE <= 0}
            >
              {submitting ? 'Staking...' : 'Confirm Staking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StakeModal
