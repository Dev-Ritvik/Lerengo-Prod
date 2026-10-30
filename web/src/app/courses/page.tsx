import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { resolveAppUrl } from "@/lib/app-url";
import { getAppUser } from "@/lib/auth";
import { ProfileMenu } from "@/components/profile-menu";

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
import { allowCoursesFallback, getCoursesHomeData } from "@/lib/courses";
import styles from "./page.module.css";

type Props = {
  searchParams: Promise<{
    focus?: string;
  }>;
};

export const dynamic = "force-dynamic";

const courseColumns = [
  {
    title: "Career-Ready Tracks",
    description:
      "These are structured, multi-week programs designed to take you from zero to job-ready in a specific engineering domain. Each track ends with a portfolio-grade capstone that demonstrates real competence to recruiters and hiring managers.",
    href: "/courses?focus=Most%20Popular#catalog",
    items: [
      {
        provider: "Google",
        title: "Google Data Analytics",
        meta: "Professional Certificate",
        rating: "4.8",
        duration: "8 weeks",
        students: "12,400+ enrolled",
      },
      {
        provider: "Google",
        title: "Foundations: Data, Data, Everywhere",
        meta: "Course",
        rating: "4.8",
        duration: "4 weeks",
        students: "8,900+ enrolled",
      },
      {
        provider: "University of Michigan",
        title: "Python for Everybody",
        meta: "Specialization",
        rating: "4.8",
        duration: "10 weeks",
        students: "15,200+ enrolled",
      },
    ],
  },
  {
    title: "Skill Boosters",
    description:
      "Shorter, more targeted programs for people who already have a foundation and want to level up on something specific. These are not introductory — they assume you have context and want to move fast on a particular tool, framework, or methodology.",
    href: "/courses?focus=Weekly%20Spotlight#catalog",
    items: [
      {
        provider: "Macquarie University",
        title: "Excel Skills for Business",
        meta: "Specialization",
        rating: "4.9",
        duration: "6 weeks",
        students: "5,300+ enrolled",
      },
      {
        provider: "IBM",
        title: "IBM Data Analyst",
        meta: "Professional Certificate",
        rating: "4.6",
        duration: "9 weeks",
        students: "9,100+ enrolled",
      },
      {
        provider: "Google",
        title: "Google Advanced Data Analytics",
        meta: "Professional Certificate",
        rating: "4.8",
        duration: "7 weeks",
        students: "11,000+ enrolled",
      },
    ],
  },
  {
    title: "AI & Innovation Labs",
    description:
      "Bleeding-edge tracks focused on applied AI — prompt engineering, agentic workflows, vector databases, and production-grade AI deployments. These programs are updated frequently to keep pace with how fast the field moves.",
    href: "/courses?focus=Artificial%20Intelligence#catalog",
    items: [
      {
        provider: "DeepLearning.AI",
        title: "Generative AI for Everyone",
        meta: "Course",
        rating: "4.8",
        duration: "3 weeks",
        students: "6,700+ enrolled",
      },
      {
        provider: "IBM",
        title: "IBM Applied AI Professional Certificate",
        meta: "Professional Certificate",
        rating: "4.7",
        duration: "8 weeks",
        students: "4,200+ enrolled",
      },
      {
        provider: "Google",
        title: "Google IT Automation with Python",
        meta: "Professional Certificate",
        rating: "4.8",
        duration: "8 weeks",
        students: "3,800+ enrolled",
      },
    ],
  },
] as const;

const categories = [
  "Business",
  "Artificial Intelligence",
  "Data Science",
  "Computer Science",
  "Personal Development",
] as const;

const freshDrops = [
  {
    provider: "Google",
    title: "Google AI Professional Certificate",
    type: "Professional Certificate",
    rating: "4.8",
    syllabusCount: "5 Courses",
  },
  {
    provider: "Microsoft",
    title: "Microsoft Generative AI Engineering",
    type: "Professional Certificate",
    rating: "4.7",
    syllabusCount: "6 Courses",
  },
  {
    provider: "Google",
    title: "Google Digital Marketing & E-commerce",
    type: "Professional Certificate",
    rating: "4.8",
    syllabusCount: "4 Courses",
  },
  {
    provider: "UC San Diego",
    title: "Learning How to Learn",
    type: "Course",
    rating: "4.9",
    syllabusCount: "4 Courses",
  },
] as const;

const faqs = [
  {
    question: "What is SkillGO?",
    answer:
      "SkillGO is the learning module of LerenGO. It provides structured, outcome-driven tracks in engineering, AI, data science, and more. Unlike generic course platforms, every track is designed to end with verifiable proof of work — something you built, not just something you watched.",
  },
  {
    question: "How does SkillGO connect to the rest of LerenGO?",
    answer:
      "SkillGO, ForgeGO, and CampusGO share one identity. Skills you learn in SkillGO can be applied directly in ForgeGO projects, and validated through CampusGO institutional partners. You use one account across the entire platform.",
  },
  {
    question: "Are these programs useful for placements and portfolios?",
    answer:
      "Yes. The catalog is built around applied skills, interview readiness, and portfolio-grade output. Tracks from Google, IBM, and Microsoft carry industry recognition, and the capstone projects are designed to demonstrate real competence.",
  },
  {
    question: "Can universities or teams run cohorts here?",
    answer:
      "Yes. SkillGO supports individual learners, team capability building, and campus-oriented cohort programs. Universities can run structured cohorts under their own branding while using the SkillGO track infrastructure.",
  },
  {
    question: "Do I need a separate account?",
    answer:
      "No. SkillGO runs under your LerenGO identity. One account, one login, access to all modules.",
  },
] as const;

function getRevealStyle(index: number): CSSProperties {
  return { "--reveal-delay": `${index * 80}ms` } as CSSProperties;
}

function buildFocusHref(label: string) {
  return `/courses?focus=${encodeURIComponent(label)}#catalog`;
}

export default async function CoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  const appUrl = resolveAppUrl();
  const selectedFocus = typeof params.focus === "string" ? params.focus.trim() : "";
  const homeData = await getCoursesHomeData({ focus: selectedFocus });
  const allowMarketingFallback = allowCoursesFallback();
  const userContext = await getAppUser().catch(() => null);
  const appUser = userContext?.appUser ?? null;
  const authUser = userContext?.authUser ?? null;
  const userName = appUser?.full_name?.trim() || appUser?.email || authUser?.email || null;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);

  const courseColumnsToRender =
    homeData.courseColumns.length > 0
      ? homeData.courseColumns
      : allowMarketingFallback
        ? courseColumns
        : [];
  const categoryCloudToRender =
    homeData.categories.length > 0
      ? homeData.categories
      : allowMarketingFallback
        ? categories
        : [];
  const freshDropsToRender =
    homeData.freshDrops.length > 0
      ? homeData.freshDrops
      : allowMarketingFallback
        ? freshDrops
        : [];

  return (
    <div className={styles.viewport}>
      <ScrollRevealController />

      <main className={styles.canvas}>

        {/* ── Header ── */}
        <header className={`${styles.header} ${styles.reveal}`} data-reveal>
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

          <nav className={styles.nav} aria-label="SkillGO navigation">
            <Link href="/courses#catalog" className={styles.navLink}>Explore</Link>
            <Link href="/courses#categories" className={styles.navLink}>Categories</Link>
            <Link href="/courses#fresh" className={styles.navLink}>New</Link>
            <Link href="/courses#faq" className={styles.navLink}>FAQ</Link>
          </nav>

          <div className={styles.headerActions}>
            {appUser && authUser ? (
              <ProfileMenu
                avatarUrl={authUser.avatarUrl ?? null}
                displayName={displayName}
                initials={initials}
                showAdminLink={appUser.role === "admin" || appUser.role === "superadmin"}
                adminUrl={appUser.role === "superadmin" ? "/admin/control" : "/admin"}
                showMentorLink={appUser.mentor_approved}
              />
            ) : (
              <>
                <TransitionLink href="/signin?next=/courses" className={styles.ghostAction}>
                  Sign in
                </TransitionLink>
                <TransitionLink href="/signup?next=/courses" className={styles.primaryAction}>
                  Get started
                </TransitionLink>
              </>
            )}
          </div>
        </header>

        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={`${styles.heroInner} ${styles.reveal}`} data-reveal>
            <p className={styles.label}>SkillGO</p>
            <h1 className={styles.heroTitle}>
              Learn skills that end in<br />proof of work, not certificates.
            </h1>
            <p className={styles.heroSub}>
              SkillGO curates intensive, outcome-driven learning tracks from Google, IBM, Microsoft,
              and independent practitioners. Every track is built around a real engineering challenge.
              You do not just watch videos — you build something, and that output becomes part of your
              portfolio. The focus is on applied skill acquisition that translates directly to hiring
              conversations, team contributions, and production environments.
            </p>
          </div>
        </section>

        {/* ── Search ── */}
        <div className={`${styles.searchWrap} ${styles.reveal}`} data-reveal>
          <form action="/courses" className={styles.searchForm}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              aria-label="Search courses"
              className={styles.searchInput}
              defaultValue={selectedFocus}
              name="focus"
              placeholder="Search by skill, provider, or topic..."
              type="text"
            />
            <button className={styles.searchButton} type="submit">Search</button>
          </form>
        </div>

        {/* ── Course Catalog ── */}
        <section className={styles.section} id="catalog">
          {courseColumnsToRender.map((column: any, colIdx: number) => (
            <div key={column.title} className={styles.catalogGroup}>
              <div className={`${styles.catalogHeader} ${styles.reveal}`} data-reveal style={getRevealStyle(colIdx)}>
                <h2 className={styles.catalogTitle}>{column.title}</h2>
                <p className={styles.catalogDesc}>
                  {"description" in column ? column.description : "Curated pathways for focused learning."}
                </p>
              </div>

              <div className={styles.courseGrid}>
                {column.items.map((item: any, idx: number) => (
                  <TransitionLink
                    key={item.title}
                    href={"slug" in item ? `/courses/${item.slug}` : "/signup?next=/courses"}
                    className={`${styles.courseCard} ${styles.reveal}`}
                    data-reveal
                    style={getRevealStyle(idx + 1)}
                  >
                    <div className={styles.courseProvider}>{item.provider}</div>
                    <h3 className={styles.courseTitle}>{item.title}</h3>
                    <p className={styles.courseMeta}>{item.meta}</p>
                    <div className={styles.courseFooter}>
                      <span className={styles.courseDuration}>{item.duration}</span>
                      <span className={styles.courseRating}>★ {item.rating}</span>
                      <span className={styles.courseStudents}>{item.students || ""}</span>
                    </div>
                  </TransitionLink>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── Categories ── */}
        <div className={styles.altBg} id="categories">
          <section className={styles.sectionInner}>
            <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
              <p className={styles.label}>Browse by field</p>
              <h2 className={styles.sectionTitle}>Pick a domain.</h2>
              <p className={styles.sectionDesc}>
                Filter the catalog by career domain. Each category maps to curated tracks
                with specific industry outcomes.
              </p>
            </div>

            <div className={styles.categoryCloud}>
              {categoryCloudToRender.map((cat: any, idx: number) => (
                <Link
                  key={cat}
                  href={buildFocusHref(cat)}
                  className={`${styles.categoryChip} ${selectedFocus === cat ? styles.categoryChipActive : ""} ${styles.reveal}`}
                  data-reveal
                  style={getRevealStyle(idx)}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ── Fresh Drops ── */}
        <section className={styles.section} id="fresh">
          <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
            <p className={styles.label}>New this week</p>
            <h2 className={styles.sectionTitle}>Fresh drops.</h2>
            <p className={styles.sectionDesc}>
              Recently added programs. Enroll early for cohort-based study groups.
            </p>
          </div>

          <div className={styles.freshGrid}>
            {freshDropsToRender.map((item: any, idx: number) => (
              <TransitionLink
                key={item.title}
                href={"slug" in item ? `/courses/${item.slug}` : "/signup?next=/courses"}
                className={`${styles.freshCard} ${styles.reveal}`}
                data-reveal
                style={getRevealStyle(idx + 1)}
              >
                <div className={styles.freshProvider}>{item.provider}</div>
                <h3 className={styles.freshTitle}>{item.title}</h3>
                <div className={styles.freshFooter}>
                  <span>{item.type}</span>
                  <span>★ {item.rating}</span>
                  <span>{item.syllabusCount}</span>
                </div>
              </TransitionLink>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <div className={styles.altBg} id="faq">
          <section className={styles.sectionInner}>
            <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
              <p className={styles.label}>FAQ</p>
              <h2 className={styles.sectionTitle}>Common questions.</h2>
            </div>

            <div className={styles.faqList}>
              {faqs.map((faq, idx) => (
                <details
                  key={faq.question}
                  className={`${styles.faqItem} ${styles.reveal}`}
                  data-reveal
                  open={idx === 0}
                  style={getRevealStyle(idx + 1)}
                >
                  <summary className={styles.faqQuestion}>
                    <span>{faq.question}</span>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
