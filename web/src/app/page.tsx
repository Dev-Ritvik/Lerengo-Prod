import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProfileMenu } from "@/components/profile-menu";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import {
  resolveCampusNetworkAppUrl,
  resolveCoursesAppUrl,
  resolveHunterGoAppUrl,
  resolveLabsAppUrl,
  resolveMentorGoAppUrl,
} from "@/lib/app-url";
import { getAppUser } from "@/lib/auth";
import { AnimatedLearningPath } from "@/components/animated-learning-path";
import { HeroSection, StatsRibbon } from "@/components/landing/hero-section";
import styles from "./page.module.css";



function getRevealStyle(index: number): CSSProperties {
  return {
    "--reveal-delay": `${index * 90}ms`,
  } as CSSProperties;
}

type AccentTone = "charcoal" | "mist" | "slate" | "steel";
type ToneStyle = CSSProperties & {
  "--tone-from": string;
  "--tone-to": string;
  "--tone-ink": string;
  "--tone-ring": string;
};

function getToneStyle(tone: AccentTone): ToneStyle {
  const stylesByTone: Record<AccentTone, ToneStyle> = {
    charcoal: {
      "--tone-from": "#23282f",
      "--tone-to": "#38414a",
      "--tone-ink": "#f5f0e8",
      "--tone-ring": "rgba(188, 196, 203, 0.14)",
    },
    steel: {
      "--tone-from": "#44515d",
      "--tone-to": "#697581",
      "--tone-ink": "#f5f0e8",
      "--tone-ring": "rgba(188, 196, 203, 0.16)",
    },
    mist: {
      "--tone-from": "#55616d",
      "--tone-to": "#7a8590",
      "--tone-ink": "#f5f0e8",
      "--tone-ring": "rgba(188, 196, 203, 0.16)",
    },
    slate: {
      "--tone-from": "#313841",
      "--tone-to": "#58636f",
      "--tone-ink": "#f5f0e8",
      "--tone-ring": "rgba(188, 196, 203, 0.15)",
    },
  };

  return stylesByTone[tone];
}

function getFirstName(value: string | null | undefined) {
  if (!value) return "Profile";
  const [firstName] = value.trim().split(/\s+/);
  return firstName || "Profile";
}

function getInitials(value: string | null | undefined) {
  if (!value) return "U";
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 2);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const campusNetworkUrl = resolveCampusNetworkAppUrl();
  const coursesUrl = resolveCoursesAppUrl();
  const hunterGoUrl = resolveHunterGoAppUrl();
  const labsUrl = resolveLabsAppUrl();
  const mentorGoUrl = resolveMentorGoAppUrl();
  const userContext = await getAppUser().catch(() => null);
  const appUser = userContext?.appUser ?? null;
  const authUser = userContext?.authUser ?? null;
  const userName = appUser?.full_name?.trim() || appUser?.email || authUser?.email || null;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);

  const modules = [
    {
      body:
        "Students learn the practical skills they need before they are asked to build, pitch, or lead a project.",
      ctaHref: coursesUrl,
      ctaLabel: "Open SkillGO",
      features: ["Applied learning tracks", "Certificates and proof of work", "Portfolio-ready outputs"],
      icon: "/courses-icon.svg",
      label: "SkillGO",
      summary: "Learn the skills required to build real work.",
      tone: "steel" as AccentTone,
    },
    {
      body:
        "Students book focused guidance from verified mentors once they need specific direction for learning, building, research, or career decisions.",
      ctaHref: mentorGoUrl,
      ctaLabel: "Open MentorGO",
      features: ["Verified mentor profiles", "Availability and paid sessions", "Booking and review states"],
      icon: "/mentorship.png",
      label: "MentorGO",
      summary: "Book structured guidance from verified mentors.",
      tone: "slate" as AccentTone,
    },
    {
      body:
        "Ideas move into a guided build flow where students submit concepts, find collaborators, and develop working prototypes.",
      ctaHref: labsUrl,
      ctaLabel: "Open ForgeGO",
      features: ["Idea submission and review", "Team formation and execution", "Prototype and research direction"],
      icon: "/labs-icon.svg",
      label: "ForgeGO",
      summary: "Build ideas with teams and working prototypes.",
      tone: "charcoal" as AccentTone,
    },
    {
      body:
        "Universities mentor projects, validate serious work, and help student teams move toward demos, research, and launch outcomes.",
      ctaHref: campusNetworkUrl,
      ctaLabel: "Open CampusGO",
      features: ["University mentors and reviewers", "Campus validation and support", "Demo day and collaboration signals"],
      icon: "/campus-network-icon.svg",
      label: "CampusGO",
      summary: "Connect projects to university guidance and launch support.",
      tone: "mist" as AccentTone,
    },
    {
      body:
        "Opportunity owners discover students through proof signals from skills, projects, campus validation, and privacy-controlled profile data.",
      ctaHref: hunterGoUrl,
      ctaLabel: "Open HunterGO",
      features: ["Opt-in talent profiles", "Verified recruiter access", "Proof-backed discovery"],
      label: "HunterGO",
      summary: "Get discovered through verified skills and projects.",
      tone: "steel" as AccentTone,
      visualCode: "HG",
    },
  ] as const;

  return (
    <div className={styles.viewport}>
      <ScrollRevealController />
      <main className={styles.canvas}>

        {/* ── Header ── */}
        <header className={`${styles.header} ${styles.reveal}`} data-reveal>
          <Link href="/" className={styles.brand} aria-label="LerenGO home">
            <Image
              src="/logo.lerengo.embedded.svg"
              alt="LerenGO logo"
              width={562}
              height={303}
              className={styles.logoImage}
              priority
            />
          </Link>

          <nav className={styles.nav} aria-label="Homepage sections">
            <Link href="#how" className={styles.navLink}>How it works</Link>
            <Link href="#modules" className={styles.navLink}>Modules</Link>
            <Link href="#start" className={styles.navLink}>Get started</Link>
          </nav>

          <div className={styles.headerActions}>
            {appUser && authUser ? (
              <div className={styles.profileMenuWrap}>
                <ProfileMenu
                  avatarUrl={authUser.avatarUrl ?? null}
                  displayName={displayName}
                  initials={initials}
                  showAdminLink={appUser.role === "admin" || appUser.role === "superadmin"}
                  adminUrl={appUser.role === "superadmin" ? "/admin/control" : "/admin"}
                  showMentorLink={appUser.mentor_approved}
                />
              </div>
            ) : (
              <>
                <TransitionLink href="/signin" className={styles.ghostAction}>
                  Sign in
                </TransitionLink>
                <TransitionLink href="/signup" className={styles.primaryAction}>
                  Get started
                </TransitionLink>
              </>
            )}
          </div>
        </header>

        {/* ── Hero ── */}
        <div className="optimus-theme font-sans">
          <HeroSection />
          <StatsRibbon />
        </div>

        {/* ── The problem ── */}
        <section className={styles.section} id="problem">
          <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
            <p className={styles.label}>The problem</p>
            <h2 className={styles.sectionTitle}>
              Most people get stuck between learning and doing.
            </h2>
            <p className={styles.sectionDesc}>
              There is no shortage of online courses and tutorials. But finishing a course does not
              mean you can build a product, lead a team, or get your work taken seriously. The
              pipeline from education to execution is broken — and it has been broken for a long
              time. Ideas die in notebooks. Skills stay theoretical. Feedback comes too late or
              not at all.
            </p>
          </div>

          <div className={styles.problemGrid}>
            <article className={`${styles.problemCard} ${styles.reveal}`} data-reveal style={getRevealStyle(1)}>
              <h3 className={styles.problemHeading}>Good ideas never get built.</h3>
              <p className={styles.problemText}>
                People come up with genuinely interesting concepts all the time — a new tool, a
                research angle, a product that solves a real problem. But without a clear process
                to scope it, find collaborators, and build a working version, those ideas sit in a
                Google Doc forever. The gap is not talent or motivation. It is structure.
              </p>
            </article>
            <article className={`${styles.problemCard} ${styles.reveal}`} data-reveal style={getRevealStyle(2)}>
              <h3 className={styles.problemHeading}>Learning stops at the certificate.</h3>
              <p className={styles.problemText}>
                Traditional platforms hand you a completion badge and move on. They do not help you
                take what you learned and apply it to a real project with real constraints. The
                result is a lot of people who technically know how something works but have never
                actually shipped anything. That gap matters when it comes to getting hired, getting
                funded, or getting taken seriously.
              </p>
            </article>
            <article className={`${styles.problemCard} ${styles.reveal}`} data-reveal style={getRevealStyle(3)}>
              <h3 className={styles.problemHeading}>Feedback arrives way too late.</h3>
              <p className={styles.problemText}>
                When mentors, reviewers, or advisors only see your work at the end, it is usually
                too late to fix the fundamental mistakes. You have already spent weeks heading in the
                wrong direction. Continuous, milestone-based review from qualified people is the
                difference between a project that ships and one that fizzles out.
              </p>
            </article>
          </div>
        </section>

        <div className={styles.altBg} id="how">
          <section className={styles.sectionInner}>
            <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
              <p className={styles.label}>How it works</p>
              <h2 className={styles.sectionTitle}>
                Five modules. One workflow.
              </h2>
              <p className={styles.sectionDesc}>
                LerenGO is not five separate products stitched together. SkillGO, ForgeGO,
                CampusGO, MentorGO, and HunterGO are stages in a single pipeline. You move through them at your own pace —
                learn a skill, apply it in a team project, validate it on campus, seek mentorship, and unlock career opportunities.
                Each stage feeds into the next.
              </p>
            </div>

            <div className={`${styles.reveal}`} data-reveal style={{ width: "100%", marginTop: "48px" }}>
              <AnimatedLearningPath />
            </div>
          </section>
        </div>


        <section className={styles.section} id="modules">
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionEyebrow}>Platform Modules</span>
            <h2 className={styles.sectionTitle}>
              SkillGO, ForgeGO, CampusGO, MentorGO, and HunterGO are modules inside one platform.
            </h2>
            <p className={styles.sectionBody}>
              Each module has a clear job in the journey. Together they help students learn,
              build, validate, get guidance, and move toward real opportunities.
            </p>
          </div>

          <div className={styles.domainGrid}>
            {modules.map((module, index) => (
              <article
                key={module.label}
                className={`${styles.domainCard} ${styles.reveal}`}
                data-reveal
                style={getRevealStyle(index + 1)}
              >
                <div className={styles.domainTop}>
                  <div className={styles.domainVisual} style={getToneStyle(module.tone)}>
                    {"icon" in module ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className={styles.domainIcon}
                        height={34}
                        src={module.icon}
                        width={34}
                      />
                    ) : (
                      <span aria-hidden="true" className={styles.domainVisualCode}>
                        {module.visualCode}
                      </span>
                    )}
                  </div>
                  <span className={styles.domainLabel}>{module.label}</span>
                </div>
                <h3 className={styles.domainTitle}>{module.summary}</h3>
                <p className={styles.domainBody}>{module.body}</p>

                <ul className={styles.featureList}>
                  {module.features.map((feature) => (
                    <li key={feature} className={styles.featureItem}>
                      {feature}
                    </li>
                  ))}
                </ul>

                <a href={module.ctaHref} className={styles.domainAction}>
                  {module.ctaLabel}
                </a>
              </article>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
