import styles from './EarnCards.module.css'

export function EarnCards({
  onTapEarn,
  onOpenSwap,
  availableGems = 50,
  availableVE = 2300
}) {
  return (
    <section className={styles.sectionRoot} aria-labelledby="earn-swap-heading">
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Dynamic Interaction</span>
          <h2 id="earn-swap-heading" className={styles.sectionTitle}>
            Tap &amp; Exchange Portals
          </h2>
        </div>
        <span className={styles.categoryBadge}>Fintech Utilities</span>
      </div>

      <div className={styles.twoCardGrid}>
        {/* Card 1: Tap & Earn */}
        <div className={`${styles.earnCard} ${styles.cardTap}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconContainer}>
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </div>
            <span className={styles.availabilityTag}>Energy: 100/100</span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Tap &amp; Earn</h3>
            <p className={styles.cardDesc}>
              Tap the reward matrix to mine instantaneous micro-VEs and gain rapid level XP bursts during active power-hour windows.
            </p>
            <div className={styles.rewardIndicator}>
              <span className={styles.rewardIcon}>⚡</span>
              <span className={styles.rewardText}>+5 VE / tap &bull; 100 Taps Remaining</span>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={onTapEarn}
            >
              <span>Start Tapping</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.supportLink}
              onClick={onTapEarn}
            >
              View Tap Multipliers &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Swap Center */}
        <div className={`${styles.earnCard} ${styles.cardSwap}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconContainer}>
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" />
              </svg>
            </div>
            <span className={styles.availabilityTag}>Liquidity: 1:1 Instant</span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Swap Center</h3>
            <p className={styles.cardDesc}>
              Convert your earned quest GEMs and platform Tokens into available VE liquidity with 0% protocol conversion slippage.
            </p>
            <div className={styles.rewardIndicator}>
              <span className={styles.rewardIcon}>🔄</span>
              <span className={styles.rewardText}>Available Pool: {availableGems.toLocaleString()} GEM &bull; {availableVE.toLocaleString()} VE</span>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={onOpenSwap}
            >
              <span>Exchange Assets</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.supportLink}
              onClick={onOpenSwap}
            >
              View Liquidity Rates &rarr;
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default EarnCards
