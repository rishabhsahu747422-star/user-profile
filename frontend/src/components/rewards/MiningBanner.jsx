import styles from './MiningBanner.module.css'

export function MiningBanner({ onAction, userTier = 'Bronze Explorer' }) {
  return (
    <section className={styles.bannerRoot} aria-labelledby="mining-banner-heading">
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className={styles.bannerGrid}>
        {/* Left Column: Information, Badges & Headline */}
        <div className={styles.contentCol}>
          <div className={styles.badgeRow}>
            <span className={styles.featureBadge}>⚡ Passive Ledger Compute</span>
            <span className={styles.tierBadge}>{userTier} Node</span>
          </div>

          <h2 id="mining-banner-heading" className={styles.bannerHeadline}>
            Mine &amp; Earn <span className={styles.headlineHighlight}>VE Tokens</span>
          </h2>

          <p className={styles.bannerDesc}>
            Allocate background proof-of-engagement compute to validate task micro-transactions. Accumulate passive loyalty rewards without impacting device battery or performance.
          </p>

          <div className={styles.benefitIndicators}>
            <div className={styles.indicatorPill}>
              <span className={styles.indicatorIcon}>⛏️</span>
              <div className={styles.indicatorText}>
                <span className={styles.indicatorTitle}>Compute Efficiency</span>
                <span className={styles.indicatorSub}>Zero CPU Strain</span>
              </div>
            </div>

            <div className={styles.indicatorPill}>
              <span className={styles.indicatorIcon}>📈</span>
              <div className={styles.indicatorText}>
                <span className={styles.indicatorTitle}>Auto Staking Yield</span>
                <span className={styles.indicatorSub}>Compound Weekly</span>
              </div>
            </div>

            <div className={styles.indicatorPill}>
              <span className={styles.indicatorIcon}>🔒</span>
              <div className={styles.indicatorText}>
                <span className={styles.indicatorTitle}>Security Protocol</span>
                <span className={styles.indicatorSub}>100% Cryptographic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Mining Rig / Node Illustration & CTA */}
        <div className={styles.actionCol}>
          <div className={styles.miningVisualBox}>
            <div className={styles.minerRigGlow}>
              <div className={styles.minerCore}>
                <span className={styles.coreIcon}>⛏️</span>
                <div className={styles.pulseRing} />
              </div>
            </div>

            <div className={styles.hashMeta}>
              <span className={styles.hashLabel}>Node Hashrate</span>
              <span className={styles.hashValue}>12.4 MH/s</span>
            </div>

            <button
              type="button"
              className={styles.mainCtaBtn}
              onClick={onAction}
            >
              <span>Activate Node Miner</span>
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

export default MiningBanner
