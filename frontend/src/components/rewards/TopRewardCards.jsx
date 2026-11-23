import styles from './TopRewardCards.module.css'

export function TopRewardCards({
  onOpenStreak,
  onOpenSpin,
  onOpenMissions,
  streakDay = 4,
  streakMultiplier = '1.5x',
  unlockedMissionsCount = 2,
  totalMissionsCount = 4
}) {
  return (
    <section className={styles.sectionRoot} aria-labelledby="top-rewards-heading">
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Ecosystem Opportunities</span>
          <h2 id="top-rewards-heading" className={styles.sectionTitle}>
            Daily Quests &amp; Rewards
          </h2>
        </div>
        <span className={styles.liveBadge}>Active Season</span>
      </div>

      <div className={styles.threeColumnGrid}>
        {/* Card 1: Streak Rewards (Purple Identity) */}
        <div className={`${styles.rewardCard} ${styles.cardStreak}`}>
          <div className={styles.cardTopRow}>
            <div className={`${styles.iconContainer} ${styles.iconPurple}`}>
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2c0 4.5-4 6.5-4 10a6 6 0 0 0 12 0c0-3.5-4-5.5-4-10z" />
              </svg>
            </div>
            <span className={styles.categoryBadgePurple}>Streak Multiplier</span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardHeading}>Streak Rewards</h3>
            <div className={styles.rewardHighlight}>
              <span className={styles.rewardValue}>Day {streakDay}</span>
              <span className={styles.multiplierTag}>{streakMultiplier} Boost</span>
            </div>
            <p className={styles.cardDescription}>
              Check in consecutively to retain your daily multiplier bonus and unlock mystery gems every 7 days.
            </p>
          </div>

          <div className={styles.cardAction}>
            <button
              type="button"
              className={styles.btnPurpleCta}
              onClick={onOpenStreak}
            >
              <span>Maintain Streak</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Card 2: Spin The Wheel (Pink/Purple Identity) */}
        <div className={`${styles.rewardCard} ${styles.cardSpin}`}>
          <div className={styles.cardTopRow}>
            <div className={`${styles.iconContainer} ${styles.iconPink}`}>
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span className={styles.categoryBadgePink}>Lucky Wheel</span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardHeading}>Spin The Wheel</h3>
            <div className={styles.rewardHighlight}>
              <span className={styles.rewardValue}>1 Free Spin</span>
              <span className={styles.pinkHighlightTag}>Available Today</span>
            </div>
            <p className={styles.cardDescription}>
              Test your fortune to win immediate VE currency vouchers, double XP cards, and rare platform collectibles.
            </p>
          </div>

          <div className={styles.cardAction}>
            <button
              type="button"
              className={styles.btnPinkCta}
              onClick={onOpenSpin}
            >
              <span>Spin &amp; Win</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Card 3: Complete Missions (Blue Identity) */}
        <div className={`${styles.rewardCard} ${styles.cardMissions}`}>
          <div className={styles.cardTopRow}>
            <div className={`${styles.iconContainer} ${styles.iconBlue}`}>
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <span className={styles.categoryBadgeBlue}>Missions &amp; XP</span>
          </div>

          <div className={styles.cardContent}>
            <h3 className={styles.cardHeading}>Complete Missions</h3>
            <div className={styles.rewardHighlight}>
              <span className={styles.rewardValue}>{unlockedMissionsCount}/{totalMissionsCount} Missions</span>
              <span className={styles.blueHighlightTag}>Earn +500 VE</span>
            </div>
            <p className={styles.cardDescription}>
              Conquer tiered milestones, earn high-prestige badges, and level up your profile rank to unlock higher yield.
            </p>
          </div>

          <div className={styles.cardAction}>
            <button
              type="button"
              className={styles.btnBlueCta}
              onClick={onOpenMissions}
            >
              <span>View Missions</span>
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

export default TopRewardCards
