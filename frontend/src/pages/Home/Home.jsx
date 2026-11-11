import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import HealthStatus from '../../components/HealthStatus'
import styles from './Home.module.css'

export function Home() {
  const { isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Smooth scroll-reveal observer respecting prefers-reduced-motion
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const targets = document.querySelectorAll('[data-reveal="true"]')
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add(styles.revealVisible))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )

    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className={styles.landingContainer}>
      {/* Animated Ambient Lighting Background Orbs */}
      <div className={styles.ambientLayer} aria-hidden="true">
        <div className={styles.ambientOrbPurple} />
        <div className={styles.ambientOrbYellow} />
        <div className={styles.ambientOrbCyan} />
      </div>

      {/* ======================================================== */}
      {/* SECTION A: PUBLIC NAVIGATION BAR                         */}
      {/* ======================================================== */}
      <header className={styles.landingNavbar}>
        <div className={styles.navInner}>
          <Link to="/" className={styles.brandLink} onClick={closeMobileMenu}>
            <div className={styles.brandBadge}>VE</div>
            <span className={styles.brandTitle}>
              <span className={styles.brandTitleAccent}>VE</span> Loop Rewards
            </span>
          </Link>

          <nav className={styles.navLinks} aria-label="Main Navigation">
            <a href="#how-it-works" className={styles.navLink}>
              How It Works
            </a>
            <a href="#rewards" className={styles.navLink}>
              Rewards
            </a>
            <a href="#levels" className={styles.navLink}>
              Levels &amp; Badges
            </a>
            <a href="#referrals" className={styles.navLink}>
              Referrals
            </a>
            <a href="#diagnostics" className={styles.navLink}>
              System Status
            </a>
          </nav>

          <div className={styles.navActions}>
            {isAuthenticated ? (
              <Link to="/profile" className={styles.getStartedBtn}>
                Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.signInLink}>
                  Sign In
                </Link>
                <Link to="/login?mode=register" className={styles.getStartedBtn}>
                  Get Started
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}

            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="7" x2="21" y2="7" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="17" x2="21" y2="17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <nav
          className={`${styles.mobileDrawer} ${mobileMenuOpen ? styles.mobileDrawerOpen : ''}`}
          aria-label="Mobile Navigation"
        >
          <a href="#how-it-works" className={styles.navLink} onClick={closeMobileMenu}>How It Works</a>
          <a href="#rewards" className={styles.navLink} onClick={closeMobileMenu}>Rewards Ecosystem</a>
          <a href="#levels" className={styles.navLink} onClick={closeMobileMenu}>Levels &amp; Badges</a>
          <a href="#referrals" className={styles.navLink} onClick={closeMobileMenu}>Referrals</a>
          <a href="#diagnostics" className={styles.navLink} onClick={closeMobileMenu}>System Status</a>
          {!isAuthenticated && (
            <Link to="/login" className={styles.navLink} onClick={closeMobileMenu}>
              Sign In
            </Link>
          )}
        </nav>
      </header>

      {/* ======================================================== */}
      {/* SECTION B: HERO SECTION                                  */}
      {/* ======================================================== */}
      <section className={styles.heroSection} id="hero">
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrowBadge}>
            <span className={styles.pulseDot} />
            Enterprise Loyalty &amp; Rewards Platform
          </div>

          <h1 className={styles.heroTitle}>
            Earn, Stake &amp; Redeem with{' '}
            <span className={styles.gradientText}>VE Loop Rewards</span>
          </h1>

          <p className={styles.heroSubtitle}>
            A centralized digital asset command center backed by an immutable compensating transaction ledger.
            Track four verified reward currencies, climb 7 gamified tier ranks, claim achievement rewards, and withdraw with complete transparency.
          </p>

          <div className={styles.heroCtaGroup}>
            {isAuthenticated ? (
              <Link to="/profile" className={styles.primaryCta}>
                Open My Rewards Dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link to="/login?mode=register" className={styles.primaryCta}>
                  Get Started Free
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <a href="#rewards" className={styles.secondaryCta}>
                  Explore Reward Assets
                </a>
              </>
            )}
          </div>

          <div className={styles.heroFeaturePills}>
            <div className={styles.featurePill}>
              <span className={styles.featureCheck}>✓</span> Immutable Ledger Backed
            </div>
            <div className={styles.featurePill}>
              <span className={styles.featureCheck}>✓</span> 4-Asset Wallet (VE, SVE, GEM, TOKEN)
            </div>
            <div className={styles.featurePill}>
              <span className={styles.featureCheck}>✓</span> Real-Time Progression &amp; Claims
            </div>
          </div>
        </div>

        {/* Hero Interactive Ecosystem Preview with Floating Coins & Sparkles */}
        <div className={styles.heroShowcase}>
          <div className={styles.floatingCoinGold} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 9.5L12 16l3.5-6.5" />
            </svg>
          </div>
          <div className={styles.floatingGemCyan} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12l4 6-10 13L2 9z" />
              <path d="M2 9h20" />
            </svg>
          </div>
          <span className={`${styles.heroSparkle} ${styles.sparkleGold}`} aria-hidden="true" />
          <span className={`${styles.heroSparkle} ${styles.sparkleCyan}`} aria-hidden="true" />

          <div className={styles.showcaseCard}>
            <div className={styles.showcaseHeader}>
              <div className={styles.showcaseUserBadge}>
                <div className={styles.showcaseAvatar}>VE</div>
                <div className={styles.showcaseUserMeta}>
                  <span className={styles.showcaseUserName}>Rewards Command Center</span>
                  <span className={styles.showcaseUserLevel}>★ 7 Tier Ranks &bull; Sample Preview</span>
                </div>
              </div>
              <span className={styles.showcaseStatusTag}>&bull; Ledger Audited</span>
            </div>

            <div className={styles.showcaseAssetTiles}>
              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileVe}`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 9.5L12 16l3.5-6.5" />
                  </svg>
                </div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>VE Rewards</span>
                  <span className={styles.tileValue}>Redeemable Unit</span>
                </div>
              </div>

              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileSve}`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>Staked Units</span>
                  <span className={styles.tileValue}>SVE Yield Tier</span>
                </div>
              </div>

              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileGem}`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12l4 6-10 13L2 9z" />
                    <path d="M2 9h20" />
                  </svg>
                </div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>Quest Gems</span>
                  <span className={styles.tileValue}>GEM Milestones</span>
                </div>
              </div>

              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileToken}`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>Platform Tokens</span>
                  <span className={styles.tileValue}>TKN Utility</span>
                </div>
              </div>
            </div>

            <div className={styles.showcaseProgress}>
              <div className={styles.showcaseProgressMeta}>
                <span>Bronze Explorer &rarr; Silver Adventurer</span>
                <span style={{ color: '#16DCEB' }}>3,000 XP Goal</span>
              </div>
              <div className={styles.showcaseTrack}>
                <div className={styles.showcaseFill} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION C: HOW IT WORKS                                  */}
      {/* ======================================================== */}
      <section className={`${styles.sectionWrapper} ${styles.revealSection}`} data-reveal="true" id="how-it-works">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Simple &amp; Transparent</span>
          <h2 className={styles.sectionTitle}>How VE Loop Rewards Works</h2>
          <p className={styles.sectionSubtitle}>
            Participate in an enterprise-grade rewards lifecycle designed for security, auditability, and sustained engagement.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepTopRow}>
              <div className={styles.stepNumber} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <span className={styles.stepBadgeNum}>STEP 01</span>
            </div>
            <h3 className={styles.stepTitle}>Create Your Account</h3>
            <p className={styles.stepDescription}>
              Register in seconds with bcrypt-secured credentials and automatically receive your unique referral code.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepTopRow}>
              <div className={styles.stepNumber} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className={styles.stepBadgeNum}>STEP 02</span>
            </div>
            <h3 className={styles.stepTitle}>Accumulate Multi-Asset Rewards</h3>
            <p className={styles.stepDescription}>
              Earn VE Rewards, Staked SVE units, Quest Gems, and Platform Tokens tracked inside a double-entry wallet ledger.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepTopRow}>
              <div className={styles.stepNumber} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <span className={styles.stepBadgeNum}>STEP 03</span>
            </div>
            <h3 className={styles.stepTitle}>Level Up &amp; Claim Badges</h3>
            <p className={styles.stepDescription}>
              Gain XP to progress through 7 verified tier ranks from Novice to Diamond Master and claim unlocked achievement badges.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepTopRow}>
              <div className={styles.stepNumber} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <span className={styles.stepBadgeNum}>STEP 04</span>
            </div>
            <h3 className={styles.stepTitle}>Redeem &amp; Audit Live</h3>
            <p className={styles.stepDescription}>
              Submit withdrawal requests with atomic balance reservation, duplicate guardrails, and complete transaction history.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION D: REWARDS & EARNING ECOSYSTEM                   */}
      {/* ======================================================== */}
      <section className={`${styles.sectionWrapper} ${styles.revealSection}`} data-reveal="true" id="rewards">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Multi-Asset Architecture</span>
          <h2 className={styles.sectionTitle}>The Rewards Ecosystem</h2>
          <p className={styles.sectionSubtitle}>
            Four distinct digital reward assets backed directly by our compensating wallet ledger, each serving a clear role.
          </p>
        </div>

        <div className={styles.rewardsGrid}>
          {/* Card 1: VE */}
          <div className={`${styles.rewardCard} ${styles.rewardVe}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className={styles.rewardHeaderTop}>
                <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #FFD500 0%, #F59E0B 100%)', color: '#11121F' }} aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 9.5L12 16l3.5-6.5" />
                  </svg>
                </div>
                <span className={styles.rewardTag}>Primary Currency</span>
              </div>
              <h3 className={styles.rewardTitle}>VE Rewards</h3>
              <p className={styles.rewardDesc}>
                The core redeemable loyalty unit earned through platform participation. Reserve funds cleanly and request verified withdrawals directly from your wallet.
              </p>
            </div>
            <Link to={isAuthenticated ? '/profile' : '/login?mode=register'} className={styles.rewardActionLink}>
              {isAuthenticated ? 'View VE Wallet' : 'Start Earning VE'} &rarr;
            </Link>
          </div>

          {/* Card 2: SVE */}
          <div className={`${styles.rewardCard} ${styles.rewardSve}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className={styles.rewardHeaderTop}>
                <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #16DCEB 0%, #438EFF 100%)', color: '#11121F' }} aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <span className={styles.rewardTag}>Yield Staked</span>
              </div>
              <h3 className={styles.rewardTitle}>Staked Units (SVE)</h3>
              <p className={styles.rewardDesc}>
                Committed staking units tracked independently alongside your liquid balance. Designed for long-term participants advancing through reward tiers.
              </p>
            </div>
            <Link to={isAuthenticated ? '/profile' : '/login?mode=register'} className={styles.rewardActionLink}>
              {isAuthenticated ? 'Check SVE Balance' : 'Explore SVE Tier'} &rarr;
            </Link>
          </div>

          {/* Card 3: GEM */}
          <div className={`${styles.rewardCard} ${styles.rewardGem}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className={styles.rewardHeaderTop}>
                <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #C084FC 0%, #7C5CFF 100%)', color: '#FFFFFF' }} aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12l4 6-10 13L2 9z" />
                    <path d="M11 3l-4 6 5 13 5-13-4-6" />
                    <path d="M2 9h20" />
                  </svg>
                </div>
                <span className={styles.rewardTag}>Milestone Asset</span>
              </div>
              <h3 className={styles.rewardTitle}>Quest Gems</h3>
              <p className={styles.rewardDesc}>
                Bonus milestone currency awarded alongside achievement unlocks and special progression accomplishments inside your command center.
              </p>
            </div>
            <Link to={isAuthenticated ? '/profile' : '/login?mode=register'} className={styles.rewardActionLink}>
              {isAuthenticated ? 'Inspect Gems' : 'Unlock Quest Gems'} &rarr;
            </Link>
          </div>

          {/* Card 4: TOKEN */}
          <div className={`${styles.rewardCard} ${styles.rewardToken}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className={styles.rewardHeaderTop}>
                <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #00E6A0 0%, #059669 100%)', color: '#11121F' }} aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <span className={styles.rewardTag}>Platform Utility</span>
              </div>
              <h3 className={styles.rewardTitle}>Platform Tokens</h3>
              <p className={styles.rewardDesc}>
                Ecosystem utility tokens tracked in your multi-asset vault, powering community drops and account-level utility across the platform.
              </p>
            </div>
            <Link to={isAuthenticated ? '/profile' : '/login?mode=register'} className={styles.rewardActionLink}>
              {isAuthenticated ? 'View Token Vault' : 'Claim Account Vault'} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION E: PROGRESSION TIERS & MILESTONE ACHIEVEMENTS    */}
      {/* ======================================================== */}
      <section className={`${styles.sectionWrapper} ${styles.revealSection}`} data-reveal="true" id="levels">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Gamification Engine</span>
          <h2 className={styles.sectionTitle}>Progression Tiers &amp; Milestone Badges</h2>
          <p className={styles.sectionSubtitle}>
            Every verified action earns XP toward our database-backed 7-rank hierarchy and unlocks claimable achievements.
          </p>
        </div>

        <div className={styles.levelsAchievementsLayout}>
          {/* Left: Actual 7-Tier Roadmap Highlights from backend progression.service.js */}
          <div className={styles.featureCardBox}>
            <div>
              <span className={styles.sectionBadge}>7 Tier Ranks</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.6rem 0 0', color: '#FFFFFF', fontFamily: 'Poppins, Outfit, sans-serif' }}>
                Verified Level Hierarchy
              </h3>
            </div>

            <div className={styles.tierTiersList}>
              <div className={`${styles.tierRowItem} ${styles.tierHighlightGold}`}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum}>7</div>
                  <span className={styles.tierTitle}>Diamond Master</span>
                </div>
                <span className={styles.tierXpReq}>20,000 XP</span>
              </div>

              <div className={`${styles.tierRowItem} ${styles.tierHighlightSilver}`}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum} style={{ color: '#16DCEB', borderColor: 'rgba(22, 220, 235, 0.4)', background: 'rgba(22, 220, 235, 0.14)' }}>5</div>
                  <span className={styles.tierTitle}>Gold Champion</span>
                </div>
                <span className={styles.tierXpReq}>8,000 XP</span>
              </div>

              <div className={`${styles.tierRowItem} ${styles.tierHighlightBronze}`}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum} style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.14)' }}>3</div>
                  <span className={styles.tierTitle}>Silver Adventurer</span>
                </div>
                <span className={styles.tierXpReq}>3,000 XP</span>
              </div>

              <div className={styles.tierRowItem}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum} style={{ color: '#A8ABC5', borderColor: 'rgba(168, 171, 197, 0.3)', background: 'rgba(168, 171, 197, 0.12)' }}>2</div>
                  <span className={styles.tierTitle}>Bronze Explorer</span>
                </div>
                <span className={styles.tierXpReq}>1,000 XP</span>
              </div>

              <div className={styles.tierRowItem}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum} style={{ color: '#A8ABC5', borderColor: 'rgba(168, 171, 197, 0.25)', background: 'rgba(168, 171, 197, 0.1)' }}>1</div>
                  <span className={styles.tierTitle}>Novice</span>
                </div>
                <span className={styles.tierXpReq}>0 XP</span>
              </div>
            </div>
          </div>

          {/* Right: Actual Milestone Badges from backend DEFAULT_ACHIEVEMENTS */}
          <div className={styles.featureCardBox}>
            <div>
              <span className={styles.sectionBadge}>Rewards Catalog</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.6rem 0 0', color: '#FFFFFF', fontFamily: 'Poppins, Outfit, sans-serif' }}>
                Unlockable Achievement Badges
              </h3>
            </div>

            <div className={styles.sampleAchievementsGrid}>
              <div className={styles.sampleAchItem}>
                <div className={styles.sampleAchIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className={styles.sampleAchMeta}>
                  <h4 className={styles.sampleAchTitle}>Welcome to VE Loop</h4>
                  <p className={styles.sampleAchDesc}>Successfully activate your account and join VE Loop Rewards.</p>
                </div>
                <span className={styles.sampleAchXp}>On Signup</span>
              </div>

              <div className={styles.sampleAchItem}>
                <div className={styles.sampleAchIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className={styles.sampleAchMeta}>
                  <h4 className={styles.sampleAchTitle}>Bronze Reward Hunter</h4>
                  <p className={styles.sampleAchDesc}>Earn 1,000 lifetime XP across platform milestones.</p>
                </div>
                <span className={styles.sampleAchXp}>1,000 XP</span>
              </div>

              <div className={styles.sampleAchItem}>
                <div className={styles.sampleAchIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className={styles.sampleAchMeta}>
                  <h4 className={styles.sampleAchTitle}>Silver Reward Hunter</h4>
                  <p className={styles.sampleAchDesc}>Earn 3,000 lifetime XP through sustained engagement.</p>
                </div>
                <span className={styles.sampleAchXp}>3,000 XP</span>
              </div>

              <div className={styles.sampleAchItem}>
                <div className={styles.sampleAchIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className={styles.sampleAchMeta}>
                  <h4 className={styles.sampleAchTitle}>Gold Reward Hunter</h4>
                  <p className={styles.sampleAchDesc}>Reach 6,000 lifetime XP to unlock elite recognition.</p>
                </div>
                <span className={styles.sampleAchXp}>6,000 XP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION F: REFERRAL PROGRAMME                            */}
      {/* ======================================================== */}
      <section className={`${styles.sectionWrapper} ${styles.revealSection}`} data-reveal="true" id="referrals">
        <div className={styles.referralSectionBox}>
          <div className={styles.referralLeft}>
            <span className={styles.sectionBadge}>Network Growth</span>
            <h2 className={styles.referralTitle}>Invite Friends, Expand Your Circle</h2>
            <p className={styles.referralText}>
              Every registered user receives a cryptographic referral code. Share your code with friends
              to grow your network and track every pending and completed referral cleanly inside your profile.
            </p>

            <div className={styles.referralBenefitsList}>
              <div className={styles.benefitItem}>
                <span className={styles.benefitIcon}>✓</span>
                <span>Automatic unique referral code generation upon registration</span>
              </div>
              <div className={styles.benefitItem}>
                <span className={styles.benefitIcon}>✓</span>
                <span>Real-time tracking of Total, Successful, and Pending referrals</span>
              </div>
              <div className={styles.benefitItem}>
                <span className={styles.benefitIcon}>✓</span>
                <span>Self-referral prevention and database-enforced relationship integrity</span>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <Link to={isAuthenticated ? '/profile' : '/login?mode=register'} className={styles.primaryCta}>
                {isAuthenticated ? 'View My Referral Code' : 'Get Your Referral Code'}
              </Link>
            </div>
          </div>

          <div className={styles.referralPreviewBox}>
            <span style={{ fontSize: '0.78rem', color: '#A8ABC5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              Unique Referral Code Format
            </span>
            <div className={styles.referralSampleBadge}>
              VL••••••••
            </div>
            <p style={{ fontSize: '0.84rem', color: '#A8ABC5', margin: 0, lineHeight: 1.55 }}>
              Assigned automatically for each verified profile. Share and track referee statuses directly from your User Profile dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* PLATFORM TRANSPARENCY, SECURITY & LIVE DIAGNOSTICS       */}
      {/* ======================================================== */}
      <section className={`${styles.sectionWrapper} ${styles.revealSection}`} data-reveal="true" id="diagnostics">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Observability &amp; Trust</span>
          <h2 className={styles.sectionTitle}>System Status &amp; Security Architecture</h2>
          <p className={styles.sectionSubtitle}>
            Live operational diagnostics connecting directly to our backend health probes alongside enterprise security controls.
          </p>
        </div>

        <div className={styles.diagnosticsSectionBox}>
          <div>
            <HealthStatus />
          </div>

          <div className={styles.trustPillarStack}>
            <div className={styles.trustPillarCard}>
              <div className={styles.trustIconCircle} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div>
                <h3 className={styles.trustPillarTitle}>Compensating Double-Entry Ledger</h3>
                <p className={styles.trustPillarDesc}>
                  Every credit, reservation hold, settlement, and reversal creates an immutable ledger entry with full reconciliation audits.
                </p>
              </div>
            </div>

            <div className={styles.trustPillarCard}>
              <div className={styles.trustIconCircle} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3 className={styles.trustPillarTitle}>OWASP Hardened JWT Authentication</h3>
                <p className={styles.trustPillarDesc}>
                  Strict JWT verification, rate-limited endpoints, fail-fast secret checks, and security headers protect every user session.
                </p>
              </div>
            </div>

            <div className={styles.trustPillarCard}>
              <div className={styles.trustIconCircle} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <h3 className={styles.trustPillarTitle}>Idempotent Withdrawal Guardrails</h3>
                <p className={styles.trustPillarDesc}>
                  Duplicate request protection prevents double-spends and holds funds atomically until administrative settlement or cancellation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION G: FINAL CTA                                     */}
      {/* ======================================================== */}
      <section className={`${styles.sectionWrapper} ${styles.revealSection}`} data-reveal="true">
        <div className={styles.finalCtaBox}>
          <span className={styles.sectionBadge}>Start Earning Today</span>
          <h2 className={styles.finalCtaHeading}>Ready to Experience VE Loop Rewards?</h2>
          <p className={styles.finalCtaDesc}>
            Join the rewards command center built for transparency, atomic wallet security, and gamified level progression.
          </p>
          <div className={styles.finalCtaActions}>
            {isAuthenticated ? (
              <Link to="/profile" className={styles.primaryCta}>
                Go to My User Profile
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link to="/login?mode=register" className={styles.primaryCta}>
                  Create Your Account
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link to="/login" className={styles.secondaryCta}>
                  Sign In to Existing Account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className={styles.landingFooter}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrandCol}>
            <div className={styles.brandLink}>
              <div className={styles.brandBadge}>VE</div>
              <span className={styles.brandTitle}>
                <span className={styles.brandTitleAccent}>VE</span> Loop Rewards
              </span>
            </div>
            <p className={styles.footerBrandDesc}>
              Enterprise loyalty, multi-asset digital wallet, and gamified progression platform powered by an immutable compensating ledger.
            </p>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Platform</span>
            <a href="#how-it-works" className={styles.footerColLink}>How It Works</a>
            <a href="#rewards" className={styles.footerColLink}>Rewards Ecosystem</a>
            <a href="#levels" className={styles.footerColLink}>Levels &amp; Badges</a>
            <a href="#referrals" className={styles.footerColLink}>Referral Program</a>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Account</span>
            <Link to="/login" className={styles.footerColLink}>Sign In</Link>
            <Link to="/login?mode=register" className={styles.footerColLink}>Create Account</Link>
            <Link to="/profile" className={styles.footerColLink}>User Dashboard</Link>
            <Link to="/admin" className={styles.footerColLink}>Admin Portal</Link>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>System</span>
            <a href="#diagnostics" className={styles.footerColLink}>Health Probes</a>
            <span className={styles.footerColLink}>OWASP Hardened</span>
            <span className={styles.footerColLink}>Two-Phase Ledger</span>
            <span className={styles.footerColLink}>v1.0.0 Production</span>
          </div>
        </div>

        <div className={styles.footerBottomBar}>
          <div>
            &copy; {new Date().getFullYear()} VE Loop Rewards. Enterprise Loyalty &amp; Wallet System. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
