import { useState } from 'react'
import styles from './SwapModal.module.css'

export function SwapModal({
  isOpen,
  onClose,
  availableGems = 50,
  availableVE = 2300,
  onSwapSuccess
}) {
  const [gemAmount, setGemAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  if (!isOpen) return null

  const handleSwap = (e) => {
    e.preventDefault()
    const amountNum = Number(gemAmount)
    if (!amountNum || amountNum <= 0) return
    if (amountNum > availableGems) {
      setMessage({ type: 'error', text: `Amount exceeds available ${availableGems.toLocaleString()} GEM.` })
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      const receivedVE = amountNum * 2 // 1 GEM = 2 VE rate
      setMessage({
        type: 'success',
        text: `Swapped ${amountNum} GEM for ${receivedVE} VE successfully!`
      })
      if (onSwapSuccess) {
        onSwapSuccess(amountNum, receivedVE)
      }
      setTimeout(() => {
        onClose()
      }, 1500)
    }, 800)
  }

  const calculatedVE = (Number(gemAmount) || 0) * 2

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="swap-modal-title">
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.badgeBlue}>0% Slippage Protocol</span>
            <h3 id="swap-modal-title" className={styles.modalTitle}>VE Swap Center</h3>
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

        <form onSubmit={handleSwap}>
          <div className={styles.modalBody}>
            <div className={styles.poolBalances}>
              <div className={styles.poolCard}>
                <span className={styles.poolLabel}>Your Gems</span>
                <strong className={styles.poolVal}>{availableGems.toLocaleString()} GEM</strong>
              </div>
              <div className={styles.poolCard}>
                <span className={styles.poolLabel}>Your VE</span>
                <strong className={styles.poolValYellow}>{availableVE.toLocaleString()} VE</strong>
              </div>
            </div>

            {message && (
              <div className={message.type === 'error' ? styles.msgError : styles.msgSuccess}>
                {message.text}
              </div>
            )}

            <div className={styles.swapBox}>
              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <label htmlFor="swap-gem" className={styles.swapLabel}>You Convert</label>
                  <button
                    type="button"
                    className={styles.maxTextBtn}
                    onClick={() => setGemAmount(String(availableGems))}
                  >
                    Max ({availableGems})
                  </button>
                </div>
                <div className={styles.inputFieldRow}>
                  <input
                    id="swap-gem"
                    type="number"
                    min="1"
                    max={availableGems}
                    placeholder="0"
                    className={styles.swapInput}
                    value={gemAmount}
                    onChange={(e) => setGemAmount(e.target.value)}
                    required
                  />
                  <span className={styles.assetPill}>💎 GEM</span>
                </div>
              </div>

              <div className={styles.swapDivider}>
                <div className={styles.arrowCircle}>↓</div>
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.inputHeader}>
                  <span className={styles.swapLabel}>You Receive</span>
                  <span className={styles.rateTag}>Rate: 1 GEM = 2 VE</span>
                </div>
                <div className={styles.inputFieldRow}>
                  <input
                    type="text"
                    readOnly
                    className={styles.swapInputReadOnly}
                    value={calculatedVE ? `${calculatedVE.toLocaleString()} VE` : '0 VE'}
                  />
                  <span className={styles.assetPillYellow}>⚡ VE</span>
                </div>
              </div>
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
              disabled={submitting || availableGems <= 0 || !calculatedVE}
            >
              {submitting ? 'Converting...' : 'Execute Swap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SwapModal
