import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import HealthStatus from '../../components/HealthStatus'
import styles from './Home.module.css'

export function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <div className={styles.landingContainer}>
      {/* ======================================================== */}
      {/* SECTION A: PUBLIC NAVIGATION BAR                         */}
      {/* ======================================================== */}
      <header className={styles.landingNavbar}>
        <div className={styles.navInner}>
          <Link to="/" className={styles.brandLink}>
            <div className={styles.brandBadge}>VE</div>
            <span className={styles.brandTitle}>VE Loop Rewards</span>
          </Link>

          <nav className={styles.navLinks} aria-label="Main Navigation">
            <a href="#how-it-works" className={styles.navLink}>
              How It Works
            </a>
            <a href="#rewards" className={styles.navLink}>
              Rewards
            </a>
            <a href="#levels" className={styles.navLink}>
              Levels & Badges
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
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* SECTION B: HERO SECTION                                  */}
      {/* ======================================================== */}
      <section className={styles.heroSection} id="hero">
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrowBadge}>
            <span className={styles.pulseDot} />
            Enterprise Loyalty & Rewards Platform
          </div>

          <h1 className={styles.heroTitle}>
            Earn, Stake & Redeem with <span className={styles.gradientText}>VE Loop Rewards</span>
          </h1>

          <p className={styles.heroSubtitle}>
            A centralized digital asset command center backed by an immutable transaction ledger.
            Track four distinct reward assets, unlock gamified level progression, and participate in verified redemptions.
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
              <span className={styles.featureCheck}>✓</span> Multi-Asset Wallet (VE, SVE, GEM, TOKEN)
            </div>
            <div className={styles.featurePill}>
              <span className={styles.featureCheck}>✓</span> Real-Time Progression
            </div>
          </div>
        </div>

        {/* Hero Interactive Showcase Mockup */}
        <div className={styles.heroShowcase}>
          <div className={styles.showcaseCard}>
            <div className={styles.showcaseHeader}>
              <div className={styles.showcaseUserBadge}>
                <div className={styles.showcaseAvatar}>VE</div>
                <div className={styles.showcaseUserMeta}>
                  <span className={styles.showcaseUserName}>Rewards Command Center</span>
                  <span className={styles.showcaseUserLevel}>★ Level 02 Bronze Explorer</span>
                </div>
              </div>
              <span className={styles.showcaseStatusTag}>• Live Audited</span>
            </div>

            <div className={styles.showcaseAssetTiles}>
              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileVe}`}>VE</div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>VE Rewards</span>
                  <span className={styles.tileValue}>2,300 VEs</span>
                </div>
              </div>
              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileSve}`}>SVE</div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>Staked Units</span>
                  <span className={styles.tileValue}>150 SVE</span>
                </div>
              </div>
              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileGem}`}>💎</div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>Quest Gems</span>
                  <span className={styles.tileValue}>50 GEM</span>
                </div>
              </div>
              <div className={styles.showcaseTile}>
                <div className={`${styles.tileIcon} ${styles.tileToken}`}>🪙</div>
                <div className={styles.tileMeta}>
                  <span className={styles.tileLabel}>Tokens</span>
                  <span className={styles.tileValue}>10 TKN</span>
                </div>
              </div>
            </div>

            <div className={styles.showcaseProgress}>
              <div className={styles.showcaseProgressMeta}>
                <span>Level 02 Progress</span>
                <span style={{ color: '#38BDF8' }}>50% Complete</span>
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
      <section className={styles.sectionWrapper} id="how-it-works">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Simple & Transparent</span>
          <h2 className={styles.sectionTitle}>How VE Loop Rewards Works</h2>
          <p className={styles.sectionSubtitle}>
            Participate in an enterprise-grade rewards lifecycle designed for security, auditability, and engagement.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Create Your Account</h3>
            <p className={styles.stepDescription}>
              Register in seconds with bank-grade bcrypt security and automatically receive your unique referral code.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Participate & Earn</h3>
            <p className={styles.stepDescription}>
              Complete platform quests and stake tokens to earn VE Rewards, SVE units, Quest Gems, and Platform Tokens.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Level Up & Unlock Badges</h3>
            <p className={styles.stepDescription}>
              Gain XP for every engagement, advance through 7 tier ranks, and claim unlocked achievement badges for bonus XP.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>4</div>
            <h3 className={styles.stepTitle}>Redeem & Track</h3>
            <p className={styles.stepDescription}>
              Submit withdrawal requests with atomic fund reservation and audit every transaction in your real-time ledger.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION D: REWARDS ECOSYSTEM                             */}
      {/* ======================================================== */}
      <section className={styles.sectionWrapper} id="rewards">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Multi-Asset Architecture</span>
          <h2 className={styles.sectionTitle}>The Rewards Ecosystem</h2>
          <p className={styles.sectionSubtitle}>
            Our platform supports four distinct digital reward assets, each serving a specific role in your loyalty journey.
          </p>
        </div>

        <div className={styles.rewardsGrid}>
          {/* Card 1: VE */}
          <div className={`${styles.rewardCard} ${styles.rewardVe}`}>
            <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
              VE
            </div>
            <span className={styles.rewardTag}>Primary Currency</span>
            <h3 className={styles.rewardTitle}>VE Rewards</h3>
            <p className={styles.rewardDesc}>
              The core platform unit earned through verified activity. VE balances can be accumulated, reserved, and redeemed through official withdrawal requests.
            </p>
          </div>

          {/* Card 2: SVE */}
          <div className={`${styles.rewardCard} ${styles.rewardSve}`}>
            <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}>
              SVE
            </div>
            <span className={styles.rewardTag}>Yield Staking</span>
            <h3 className={styles.rewardTitle}>Staked Units</h3>
            <p className={styles.rewardDesc}>
              Committed reward units staked within the ecosystem. Designed for long-term participants seeking tier status acceleration.
            </p>
          </div>

          {/* Card 3: GEM */}
          <div className={`${styles.rewardCard} ${styles.rewardGem}`}>
            <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
              💎
            </div>
            <span className={styles.rewardTag}>Milestone Asset</span>
            <h3 className={styles.rewardTitle}>Quest Gems</h3>
            <p className={styles.rewardDesc}>
              Special bonus currency unlocked by claiming milestone achievements and completing competitive community challenges.
            </p>
          </div>

          {/* Card 4: TOKEN */}
          <div className={`${styles.rewardCard} ${styles.rewardToken}`}>
            <div className={styles.rewardIconBadge} style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
              🪙
            </div>
            <span className={styles.rewardTag}>Platform Utility</span>
            <h3 className={styles.rewardTitle}>Platform Tokens</h3>
            <p className={styles.rewardDesc}>
              Ecosystem utility units powering feature access and decentralized community governance within the VE Loop platform.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION E: LEVELS & ACHIEVEMENTS                         */}
      {/* ======================================================== */}
      <section className={styles.sectionWrapper} id="levels">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Gamification Engine</span>
          <h2 className={styles.sectionTitle}>Progression & Milestones</h2>
          <p className={styles.sectionSubtitle}>
            Every action earns Experience Points (XP) that propel your account through verified tier levels and unlock achievements.
          </p>
        </div>

        <div className={styles.levelsAchievementsLayout}>
          {/* Left: Level Tiers */}
          <div className={styles.featureCardBox}>
            <div>
              <span className={styles.sectionBadge}>7 Tier Ranks</span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.5rem 0 0', color: '#FFFFFF' }}>
                Level Hierarchy
              </h3>
            </div>

            <div className={styles.tierTiersList}>
              <div className={styles.tierRowItem}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum}>1</div>
                  <span className={styles.tierTitle}>Novice</span>
                </div>
                <span className={styles.tierXpReq}>0 XP Required</span>
              </div>

              <div className={styles.tierRowItem}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum}>2</div>
                  <span className={styles.tierTitle}>Bronze Explorer</span>
                </div>
                <span className={styles.tierXpReq}>1,000 XP Required</span>
              </div>

              <div className={styles.tierRowItem}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum}>3</div>
                  <span className={styles.tierTitle}>Silver Adventurer</span>
                </div>
                <span className={styles.tierXpReq}>3,000 XP Required</span>
              </div>

              <div className={styles.tierRowItem}>
                <div className={styles.tierNameGroup}>
                  <div className={styles.tierRankNum}>4</div>
                  <span className={styles.tierTitle}>Gold Champion</span>
                </div>
                <span className={styles.tierXpReq}>6,000 XP Required</span>
              </div>
            </div>
          </div>

          {/* Right: Achievement Examples */}
          <div className={styles.featureCardBox}>
            <div>
              <span className={styles.sectionBadge}>Rewards Catalog</span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.5rem 0 0', color: '#FFFFFF' }}>
                Milestone Badges
              </h3>
            </div>

            <div className={styles.sampleAchievementsGrid}>
              <div className={styles.sampleAchItem}>
                <div className={styles.sampleAchIcon}>★</div>
                <div className={styles.sampleAchMeta}>
                  <h4 className={styles.sampleAchTitle}>Welcome to VE Loop</h4>
                  <p className={styles.sampleAchDesc}>Successfully activate your account and join the platform.</p>
                </div>
                <span className={styles.sampleAchXp}>+100 XP</span>
              </div>

              <div className={styles.sampleAchItem}>
                <div className={styles.sampleAchIcon}>★</div>
                <div className={styles.sampleAchMeta}>
                  <h4 className={styles.sampleAchTitle}>Bronze Reward Hunter</h4>
                  <p className={styles.sampleAchDesc}>Earn 1,000 lifetime XP through activities and quests.</p>
                </div>
                <span className={styles.sampleAchXp}>+250 XP</span>
              </div>

              <div className={styles.sampleAchItem}>
                <div className={styles.sampleAchIcon}>★</div>
                <div className={styles.sampleAchMeta}>
                  <h4 className={styles.sampleAchTitle}>Silver Reward Hunter</h4>
                  <p className={styles.sampleAchDesc}>Earn 3,000 lifetime XP through sustained engagement.</p>
                </div>
                <span className={styles.sampleAchXp}>+500 XP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION F: REFERRAL SECTION                              */}
      {/* ======================================================== */}
      <section className={styles.sectionWrapper} id="referrals">
        <div className={styles.referralSectionBox}>
          <div className={styles.referralLeft}>
            <span className={styles.sectionBadge}>Network Growth</span>
            <h2 className={styles.referralTitle}>Invite Friends, Expand Your Circle</h2>
            <p className={styles.referralText}>
              Every registered user receives a unique referral code. Share your code with colleagues and friends
              to grow your network and unlock community rewards upon their successful registration.
            </p>

            <div className={styles.referralBenefitsList}>
              <div className={styles.benefitItem}>
                <span className={styles.benefitIcon}>✓</span>
                <span>Automatic unique referral code generation on account creation</span>
              </div>
              <div className={styles.benefitItem}>
                <span className={styles.benefitIcon}>✓</span>
                <span>Real-time tracking of Total, Successful, and Pending referrals</span>
              </div>
              <div className={styles.benefitItem}>
                <span className={styles.benefitIcon}>✓</span>
                <span>Self-referral prevention and ledger-enforced integrity</span>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/login?mode=register" className={styles.primaryCta}>
                Get Your Referral Code
              </Link>
            </div>
          </div>

          <div className={styles.referralPreviewBox}>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
              Example Referral Code Format
            </span>
            <div className={styles.referralSampleBadge}>
              VL••••••••
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Generated cryptographically for each verified profile. Track referee status directly from your private dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* PLATFORM TRANSPARENCY & DIAGNOSTICS                      */}
      {/* ======================================================== */}
      <section className={styles.sectionWrapper} id="diagnostics">
        <div className={styles.sectionHeadingBlock}>
          <span className={styles.sectionBadge}>Observability & Uptime</span>
          <h2 className={styles.sectionTitle}>System Status & Transparency</h2>
          <p className={styles.sectionSubtitle}>
            Live operational diagnostics connecting directly to the backend health probes.
          </p>
        </div>

        <div className={styles.diagnosticsSectionBox}>
          <HealthStatus />
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION G: FINAL CTA                                     */}
      {/* ======================================================== */}
      <section className={styles.sectionWrapper}>
        <div className={styles.finalCtaBox}>
          <span className={styles.sectionBadge}>Start Earning Today</span>
          <h2 className={styles.finalCtaHeading}>Ready to Experience VE Loop Rewards?</h2>
          <p className={styles.finalCtaDesc}>
            Join the loyalty platform built for performance, transparency, and gamified engagement.
            Create your account now to begin your progression.
          </p>
          <div className={styles.finalCtaActions}>
            <Link to="/login?mode=register" className={styles.primaryCta}>
              Create Your Account
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/login" className={styles.secondaryCta}>
              Sign In to Existing Account
            </Link>
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
              <span className={styles.brandTitle}>VE Loop Rewards</span>
            </div>
            <p className={styles.footerBrandDesc}>
              Enterprise loyalty, multi-asset digital wallet, and gamified progression system powered by an immutable compensating ledger.
            </p>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.footerColTitle}>Platform</span>
            <a href="#how-it-works" className={styles.footerColLink}>How It Works</a>
            <a href="#rewards" className={styles.footerColLink}>Rewards Ecosystem</a>
            <a href="#levels" className={styles.footerColLink}>Levels & Badges</a>
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
            <span className={styles.footerColLink} style={{ color: '#64748B' }}>OWASP Hardened</span>
            <span className={styles.footerColLink} style={{ color: '#64748B' }}>Two-Phase Ledger</span>
            <span className={styles.footerColLink} style={{ color: '#64748B' }}>v1.0.0 Production</span>
          </div>
        </div>

        <div className={styles.footerBottomBar}>
          <div>
            &copy; {new Date().getFullYear()} VE Loop Rewards. Enterprise Loyalty & Wallet System. All rights reserved.
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
