import styles from './MegaRewardVault.module.css'

export function MegaRewardVault({
  userContributionVE = 2300,
  referralCode = 'DEMO2026',
  referralCount = 1,
  onOpenVault
}) {
  return (
    <section className={styles.vaultRoot} aria-labelledby="vault-heading">
      <div className={styles.ambientGoldGlow} aria-hidden="true" />

      <div className={styles.vaultInner}>
        {/* Left Side: Strong Title Hierarchy, Terminology & Content */}
        <div className={styles.leftContent}>
          <div className={styles.vaultBadgeRow}>
            <span className={styles.goldBadge}>👑 Mega Reward Vault</span>
            <span className={styles.poolStatusBadge}>Community Pool Active</span>
          </div>

          <h2 id="vault-heading" className={styles.vaultTitle}>
            Community Contribution &amp; <span className={styles.goldHighlight}>Mega Vault</span>
          </h2>

          <p className={styles.vaultDesc}>
            Participate in the global community incentive pool. Stake your loyalty footprint, invite active network members, and share in seasonal mega jackpot distributions.
          </p>

          <div className={styles.vaultMetricsGrid}>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Your Eligible Weight</span>
              <strong className={styles.metricVal}>
                {userContributionVE.toLocaleString()} <span className={styles.currencyYellow}>VE</span>
              </strong>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Affiliate Multiplier</span>
              <strong className={styles.metricVal}>
                {referralCount} Referred <span className={styles.tierTag}>10% Rev-Share</span>
              </strong>
            </div>

            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Network Identifier</span>
              <strong className={styles.metricVal}>
                <code>{referralCode}</code>
              </strong>
            </div>
          </div>
        </div>

        {/* Right Side: Vault Prize Card & Primary Action */}
        <div className={styles.rightCard}>
          <div className={styles.jackpotCard}>
            <div className={styles.jackpotIcon}>🏆</div>
            <span className={styles.jackpotLabel}>Seasonal Vault Target</span>
            <div className={styles.jackpotAmount}>
              500,000 <span className={styles.currencyYellow}>VE</span>
            </div>
            <p className={styles.jackpotNotice}>
              Distributed proportionally to all verified Bronze+ accounts upon season milestone settlement.
            </p>
            <button
              type="button"
              className={styles.vaultCtaBtn}
              onClick={onOpenVault}
            >
              <span>Contribute to Vault</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MegaRewardVault
