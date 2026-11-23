import styles from './StakingCard.module.css'

export function StakingCard({
  sveAvailable = 150,
  sveTotalEarned = 150,
  veAvailable = 2300,
  onOpenStake
}) {
  return (
    <section className={styles.stakingSection} aria-labelledby="staking-heading">
      <div className={styles.innerContainer}>
        {/* Left Visual & Security Header */}
        <div className={styles.vaultVisualCol}>
          <div className={styles.vaultIllustrationBox}>
            <div className={styles.vaultShieldRing}>
              <div className={styles.vaultInnerCore}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.lockIcon}
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
          </div>

          <div className={styles.securityAuditBadge}>
            <span className={styles.securityDot} />
            <span>Audited Staking Vault</span>
          </div>
        </div>

        {/* Center Details: Headline, Balances & Benefit Badges */}
        <div className={styles.detailsCol}>
          <div className={styles.badgeRow}>
            <span className={styles.greenSecurityBadge}>🛡️ Cryptographic Staking</span>
            <span className={styles.yieldTypeBadge}>SVE Yield Asset</span>
          </div>

          <h2 id="staking-heading" className={styles.stakingTitle}>
            Stake &amp; Earn <span className={styles.greenHighlight}>SVE Platform Yield</span>
          </h2>

          <p className={styles.stakingDesc}>
            Lock your available VE tokens into the liquidity staking vault to generate SVE units. Staked positions earn dynamic fee-share allocations distributed in the cryptographic ledger.
          </p>

          <div className={styles.balanceReadoutsGrid}>
            <div className={styles.readoutCard}>
              <span className={styles.readoutLabel}>Staked Balance</span>
              <strong className={styles.readoutValue}>
                {sveAvailable.toLocaleString()} <span className={styles.tickerGreen}>SVE</span>
              </strong>
            </div>

            <div className={styles.readoutCard}>
              <span className={styles.readoutLabel}>Lifetime Staking Rewards</span>
              <strong className={styles.readoutValue}>
                {sveTotalEarned.toLocaleString()} <span className={styles.tickerGreen}>SVE</span>
              </strong>
            </div>

            <div className={styles.readoutCard}>
              <span className={styles.readoutLabel}>Available to Stake</span>
              <strong className={styles.readoutValue}>
                {veAvailable.toLocaleString()} <span className={styles.tickerYellow}>VE</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Right CTA Column */}
        <div className={styles.ctaCol}>
          <div className={styles.actionCard}>
            <span className={styles.actionTitle}>Staking Gateway</span>
            <p className={styles.actionSub}>Instant lock &amp; flexible unstake via compensating transactions.</p>
            <button
              type="button"
              className={styles.prominentBlueBtn}
              onClick={onOpenStake}
            >
              <span>Manage Stake</span>
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

export default StakingCard
