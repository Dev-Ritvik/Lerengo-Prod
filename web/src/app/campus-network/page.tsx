import type { CSSProperties } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { resolveAppUrl } from "@/lib/app-url";
import { requireVerifiedProfile } from "@/lib/tenant";
import { buildCampusAnalytics } from "./analytics";
import { WeeklyDiscussionCard } from "./components/weekly-discussion-card";
import { WeeklyExamCard } from "./components/weekly-exam-card";
import { WeeklyProjectCard } from "./components/weekly-project-card";
import { WeeklyTopSubjectCard } from "./components/weekly-top-subject-card";
import styles from "./page.module.css";

function getFirstName(value: string | null | undefined) {
  if (!value) return "User";
  const firstName = value.trim().split(/\s+/)[0];
  return firstName || "User";
}

function getInitials(value: string | null | undefined) {
  if (!value) return "U";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getRevealStyle(index: number): CSSProperties {
  return { "--reveal-delay": `${index * 80}ms` } as CSSProperties;
}

export const dynamic = "force-dynamic";

export default async function CampusNetworkPage() {
  const { authUser, profile, supabase } = await requireVerifiedProfile();
  if (!profile.university_id) {
    redirect("/onboarding/university");
  }
  const hasCampusProfile =
    Boolean(profile.campus_name) &&
    Boolean(profile.batch) &&
    Boolean(profile.department) &&
    Boolean(profile.program_domain);
  if (!hasCampusProfile) {
    redirect("/onboarding/campus-profile");
  }
  if (!profile.verified) {
    redirect("/verify");
  }
  const { data: university } = await supabase
    .from("universities")
    .select("name")
    .eq("id", profile.university_id)
    .maybeSingle();

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "Campus";
  const appUrl = resolveAppUrl();

  const analytics = await buildCampusAnalytics({
    profileDomain: profile.program_domain,
    supabase,
    universityId: profile.university_id,
    universityName,
  });

  const serviceCards = [
    {
      action: "Browse notes",
      body: "Course-specific notes, syllabus revision sets, and lecture resources uploaded and verified by campus peers. Search by subject, semester, or contributor.",
      href: "/browse-notes",
      icon: "/notes.png",
      meta: `${formatCount(analytics.liveStats.notesUpdatedMonth)} uploads this month`,
      title: "Notes Vault",
    },
    {
      action: "Book a session",
      body: "Schedule one-on-one sessions with senior student coordinators, peer advisors, and subject specialists. Sessions are structured around specific topics and outcomes.",
      href: "/mentorship",
      icon: "/mentorship.png",
      meta: `${formatCount(analytics.liveStats.activeMentors)} mentors active`,
      title: "Mentorship",
    },
    {
      action: "Join discussions",
      body: "Moderated forums for campus discussions, project co-founder matching, and academic announcements. Threads are organized by subject and relevance.",
      href: "/community",
      icon: "/community.png",
      meta: `${formatCount(analytics.liveStats.verifiedStudents)} verified members`,
      title: "Campus Board",
    },
  ] as const;

  return (
    <div className={styles.viewport}>
      <ScrollRevealController />

      <main className={styles.canvas}>

        {/* ── Header ── */}
        <header className={`${styles.header} ${styles.reveal}`} data-reveal>
          <div className={styles.headerLeft}>
            <a href={appUrl} className={styles.brand} aria-label="LerenGO home">
              <Image
                src="/logo.lerengo.embedded.svg"
                alt="LerenGO logo"
                width={562}
                height={303}
                className={styles.logoImage}
                priority
              />
            </a>

            <div className={styles.campusBadge}>
              <Image
                alt=""
                aria-hidden="true"
                className={styles.campusLogo}
                height={24}
                src="/lpu logo.png"
                width={24}
              />
              <span className={styles.campusName}>{universityName}</span>
            </div>
          </div>

          <nav className={styles.nav} aria-label="CampusGO navigation">
            <TransitionLink href="/browse-notes" className={styles.navLink}>Notes</TransitionLink>
            <TransitionLink href="/mentorship" className={styles.navLink}>Mentorship</TransitionLink>
            <TransitionLink href="/community" className={styles.navLink}>Community</TransitionLink>
            <TransitionLink href="/community/project-board" className={styles.navLink}>Projects</TransitionLink>
          </nav>

          <div className={styles.profileWrap}>
            <ProfileMenu
              avatarUrl={authUser.avatarUrl ?? null}
              displayName={displayName}
              initials={initials}
              showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
              adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
            />
          </div>
        </header>

        {/* ── Welcome ── */}
        <section className={styles.hero}>
          <div className={`${styles.heroInner} ${styles.reveal}`} data-reveal>
            <p className={styles.label}>CampusGO</p>
            <h1 className={styles.heroTitle}>Welcome back, {displayName}.</h1>
            <p className={styles.heroSub}>
              Your campus hub for notes, mentorship, and peer collaboration at {universityName}.
              Everything here is scoped to your university and verified by your campus network.
            </p>
          </div>
        </section>

        {/* ── Services ── */}
        <section className={styles.section} id="services">
          <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
            <h2 className={styles.sectionTitle}>Campus services</h2>
          </div>

          <div className={styles.serviceGrid}>
            {serviceCards.map((card, idx) => (
              <TransitionLink
                key={card.title}
                href={card.href}
                className={`${styles.serviceCard} ${styles.reveal}`}
                data-reveal
                style={getRevealStyle(idx + 1)}
              >
                <div className={styles.serviceTop}>
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={styles.serviceIcon}
                    height={28}
                    src={card.icon}
                    width={28}
                  />
                  <span className={styles.serviceMeta}>{card.meta}</span>
                </div>
                <h3 className={styles.serviceTitle}>{card.title}</h3>
                <p className={styles.serviceBody}>{card.body}</p>
                <span className={styles.serviceAction}>{card.action} →</span>
              </TransitionLink>
            ))}
          </div>
        </section>

        {/* ── Weekly Activity ── */}
        <div className={styles.altBg}>
          <section className={styles.sectionInner}>
            <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
              <p className={styles.label}>This week</p>
              <h2 className={styles.sectionTitle}>Campus activity</h2>
              <p className={styles.sectionDesc}>
                What is happening this week — active banners, discussions, and academic signals
                from your campus network.
              </p>
              <span className={styles.periodLabel}>{analytics.thisWeek.periodLabel}</span>
            </div>

            {/* Weekly banners */}
            {analytics.thisWeek.banners.length > 0 && (
              <div className={styles.bannerGrid}>
                {analytics.thisWeek.banners.map((item, idx) => {
                  const content = (
                    <div className={styles.bannerContent}>
                      <div className={styles.bannerTop}>
                        <span className={styles.bannerEyebrow}>{item.eyebrow}</span>
                        <span className={styles.bannerPill}>{item.pill}</span>
                      </div>
                      <h3 className={styles.bannerTitle}>{item.headline}</h3>
                      <p className={styles.bannerBody}>{item.body}</p>
                      <div className={styles.bannerFooter}>
                        <span className={styles.bannerMeta}>{item.meta}</span>
                        <span className={styles.bannerAction}>{item.ctaLabel}</span>
                      </div>
                    </div>
                  );

                  if (item.external) {
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        rel="noreferrer"
                        target="_blank"
                        className={`${styles.bannerCard} ${styles.reveal}`}
                        data-reveal
                        style={getRevealStyle(idx + 1)}
                      >
                        {content}
                      </a>
                    );
                  }
                  return (
                    <TransitionLink
                      key={item.id}
                      href={item.href}
                      className={`${styles.bannerCard} ${styles.reveal}`}
                      data-reveal
                      style={getRevealStyle(idx + 1)}
                    >
                      {content}
                    </TransitionLink>
                  );
                })}
              </div>
            )}

            {/* Announcements */}
            {analytics.thisWeek.announcements.length > 0 && (
              <div className={styles.announcementSection}>
                <div className={styles.announcementHeader}>
                  <h3 className={styles.announcementTitle}>Noticeboard</h3>
                  <TransitionLink href="/community" className={styles.announcementViewAll}>
                    View all
                  </TransitionLink>
                </div>
                <div className={styles.announcementList}>
                  {analytics.thisWeek.announcements.map((item, idx) => (
                    <TransitionLink
                      key={item.id}
                      href={item.href}
                      className={`${styles.announcementCard} ${styles.reveal}`}
                      data-reveal
                      style={getRevealStyle(idx + 1)}
                    >
                      <div className={styles.announcementMeta}>
                        <span className={styles.announcementChannel}>{item.channelLabel}</span>
                        <span className={styles.announcementBadge}>{item.badge}</span>
                      </div>
                      <h4 className={styles.announcementHeading}>{item.title}</h4>
                      <p className={styles.announcementSub}>{item.subtitle}</p>
                      <span className={styles.announcementTime}>{item.timeLabel}</span>
                    </TransitionLink>
                  ))}
                </div>
              </div>
            )}

            {/* Academic Pulse */}
            <div className={styles.pulseSection}>
              <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
                <h3 className={styles.sectionTitle}>Academic pulse</h3>
                <p className={styles.sectionDesc}>
                  Subject movement, exam alerts, and community workloads calculated from campus activity.
                </p>
              </div>
              <div className={styles.pulseGrid}>
                <WeeklyTopSubjectCard data={analytics.weekly.topSubject} />
                <WeeklyExamCard data={analytics.weekly.examPrep} />
                <WeeklyDiscussionCard data={analytics.weekly.discussion} />
                <WeeklyProjectCard data={analytics.weekly.project} />
              </div>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
