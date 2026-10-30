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
import {
  formatMentorGoValue,
  getMentorGoDirectoryData,
  popularMentors,
} from "@/lib/mentorgo";
import styles from "./page.module.css";
import { SearchInput } from "./search-input";

const mentorTypes = [
  {
    id: "expert",
    title: "Expert Mentors",
    description: "Industry professionals providing mentorship in every field, tech and platform.",
    accentColor: "#96a1ab",
    bgColor: "rgba(150, 161, 171, 0.08)",
    borderColor: "rgba(150, 161, 171, 0.25)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
    points: [
      "Experts in All Domains",
      "Tech, Non-Tech, Every Platform",
      "Career Guidance & Skill Growth",
      "1-on-1 Mentorship Sessions",
    ],
  },
  {
    id: "senior",
    title: "Senior Mentors",
    description: "Experienced seniors guiding you through career, skills and real-world insights.",
    accentColor: "#D97706",
    bgColor: "rgba(217, 119, 6, 0.08)",
    borderColor: "rgba(217, 119, 6, 0.25)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
      </svg>
    ),
    points: [
      "Career & Skill Guidance",
      "Project & Problem Solving Help",
      "Resume & Interview Support",
      "Personalized Mentorship",
    ],
  },
  {
    id: "alumni",
    title: "Alumni Mentors",
    description: "Learn from our alumni who have been in your shoes and are now leading the way.",
    accentColor: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.25)",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    points: [
      "College to Career Guidance",
      "Industry Insights & Experience",
      "Higher Studies & Placements",
      "Alumni Network Access",
    ],
  },
] as const;

const steps = [
  {
    number: "1",
    title: "Find Your Mentor",
    description: "Browse mentors by type, expertise, skills or domain.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    number: "2",
    title: "Book a Session",
    description: "Choose a time and book a 1-on-1 session.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    number: "3",
    title: "Learn & Connect",
    description: "Attend your session and get guidance & feedback.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    number: "4",
    title: "Grow Together",
    description: "Implement learnings and achieve your goals.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
] as const;


const highlights = [
  {
    text: "Verified & Experienced Mentors",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    text: "1-on-1 Personalized Guidance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    text: "Flexible Scheduling & Sessions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    text: "Career & Skill Development",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    text: "Lifelong Learning Community",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#96a1ab" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
] as const;

interface PageProps {
  searchParams: Promise<{ showAll?: string; search?: string }>;
}

export const dynamic = "force-dynamic";

export default async function MentorGoPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const showAll = resolvedParams?.showAll === "true";
  const search = (resolvedParams?.search ?? "").trim().toLowerCase();
  const appUrl = resolveAppUrl();
  const { profiles, schemaMissing } = await getMentorGoDirectoryData();
  const userContext = await getAppUser().catch(() => null);
  const appUser = userContext?.appUser ?? null;
  const authUser = userContext?.authUser ?? null;
  const userName = appUser?.full_name?.trim() || appUser?.email || authUser?.email || null;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);

  // Filter popular mentors list based on search term (name, headline, tags, or type)
  const filteredPopularMentors = popularMentors.filter((mentor) => {
    if (!search) return true;
    return (
      mentor.name.toLowerCase().includes(search) ||
      mentor.headline.toLowerCase().includes(search) ||
      mentor.type.toLowerCase().includes(search) ||
      mentor.tags.some(tag => tag.toLowerCase().includes(search))
    );
  });
  
  // Filter database profiles based on search term
  const filteredProfiles = profiles.filter((profile) => {
    if (!search) return true;
    return (
      profile.display_name.toLowerCase().includes(search) ||
      profile.headline.toLowerCase().includes(search) ||
      profile.short_bio.toLowerCase().includes(search) ||
      profile.mentor_type.toLowerCase().includes(search) ||
      profile.expertise_tags.some(tag => tag.toLowerCase().includes(search))
    );
  });

  const visiblePopularMentors = showAll ? filteredPopularMentors : filteredPopularMentors.slice(0, 4);

  return (
    <div className={styles.viewport}>
      <ScrollRevealController />
      <main className={styles.canvas}>
        {/* Header with Search and Branding */}
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
          </div>
          
          <div className={styles.headerRight}>
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
                <TransitionLink href="/signin?next=/mentorgo" className={styles.secondaryAction}>
                  Sign in
                </TransitionLink>
                <TransitionLink href="/signup?next=/mentorgo" className={styles.primaryAction}>
                  Get started
                </TransitionLink>
              </>
            )}
          </div>
        </header>

        {/* Title and Intro */}
        <section className={styles.heroSection}>
          <div className={`${styles.heroCopy} ${styles.reveal}`} data-reveal>
            <span className={styles.eyebrow}>MentorGO</span>
            <h1 className={styles.heroTitle}>Learn from experienced mentors and grow your career.</h1>
            <p className={styles.heroBody}>
              MentorGO is the expert guidance layer of LerenGO. Connect with verified industry professionals, alumni, and senior builders for 1-on-1 mentorship sessions, career guidance, and actionable feedback.
            </p>
          </div>
        </section>

        {/* Choose Your Mentor Type */}
        <section className={styles.section}>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`} data-reveal>Choose Your Mentor Type</h2>
          <div className={styles.typeGrid}>
            {mentorTypes.map((type, idx) => (
              <article
                key={type.id}
                className={`${styles.typeCard} ${styles.reveal}`}
                data-reveal
                style={{
                  "--type-accent": type.accentColor,
                  "--type-bg": type.bgColor,
                  "--type-border": type.borderColor,
                  "--reveal-delay": `${idx * 100}ms`,
                } as CSSProperties}
              >
                <div className={styles.typeCardHeader}>
                  <div className={styles.typeIconWrapper}>
                    {type.icon}
                  </div>
                  <div>
                    <h3 className={styles.typeCardTitle}>{type.title}</h3>
                    <p className={styles.typeCardDesc}>{type.description}</p>
                  </div>
                </div>
                
                <ul className={styles.pointsList}>
                  {type.points.map((point, index) => (
                    <li key={index} className={styles.pointItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={type.accentColor} strokeWidth="3" className={styles.checkIcon}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <TransitionLink 
                  href={`/mentorgo/category/${type.id}`} 
                  className={styles.typeActionButton}
                  style={{
                    backgroundColor: type.bgColor,
                    borderColor: type.borderColor,
                    color: type.accentColor,
                  }}
                >
                  Explore {type.title} &rarr;
                </TransitionLink>
              </article>
            ))}
          </div>
        </section>

        {/* How Mentorship Works */}
        <section className={styles.section}>
          <h2 className={`${styles.sectionTitle} ${styles.reveal}`} data-reveal>How Mentorship Works</h2>
          <div className={`${styles.stepsGrid} ${styles.reveal}`} data-reveal>
            {steps.map((step, idx) => (
              <div key={step.number} className={styles.stepWrapper}>
                <div className={styles.stepCard}>
                  <div className={styles.stepNumberCircle}>
                    {step.number}
                  </div>
                  <div className={styles.stepIconInner}>
                    {step.icon}
                  </div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={styles.stepArrow}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(245, 243, 240, 0.15)" strokeWidth="2" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Popular Mentors */}
        <section className={styles.section}>
          <div className={`${styles.popularHeader} ${styles.reveal}`} data-reveal>
            <h2 className={styles.sectionTitle}>Popular Mentors</h2>
            <div className={styles.popularHeaderActions}>
              <SearchInput defaultValue={search} />
            </div>
          </div>

          <div className={styles.mentorGrid}>
            {schemaMissing ? (
              // Fallback cards matching design if database schema isn't present
              visiblePopularMentors.map((mentor, idx) => (
                <article
                  key={mentor.name}
                  className={`${styles.mentorCard} ${styles.reveal}`}
                  data-reveal
                  style={{ "--mentor-accent": mentor.accentColor, "--reveal-delay": `${idx * 80}ms` } as CSSProperties}
                >
                  <div className={styles.mentorTag} style={{ color: mentor.accentColor }}>
                    {mentor.type}
                  </div>
                  <div className={styles.mentorAvatarSection}>
                    {mentor.imageUrl ? (
                      <Image
                        src={mentor.imageUrl}
                        alt={mentor.name}
                        width={44}
                        height={44}
                        className={styles.avatarImage}
                        style={{ border: `2px solid ${mentor.accentColor}` }}
                      />
                    ) : (
                      <div className={styles.avatarCircle} style={{ border: `2px solid ${mentor.accentColor}` }}>
                        {mentor.avatarChar}
                      </div>
                    )}
                    <div className={styles.mentorIdentity}>
                      <h3 className={styles.mentorName}>
                        {mentor.name}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={mentor.accentColor} className={styles.verificationBadge}>
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </h3>
                      <p className={styles.mentorHeadline}>{mentor.headline}</p>
                    </div>
                  </div>
                  <div className={styles.mentorRatingRow}>
                    <span className={styles.star}>★</span>
                    <strong>{mentor.rating}</strong>
                    <span className={styles.sessionCount}>({mentor.sessions})</span>
                  </div>
                  <div className={styles.mentorTags}>
                    {mentor.tags.map((tag) => (
                      <span key={tag} className={styles.mentorTagPill}>{tag}</span>
                    ))}
                  </div>
                  <TransitionLink href={`/mentorgo/mentor/${mentor.name.toLowerCase().replace(/ /g, "-")}`} className={styles.bookButton}>
                    View Profile & Book
                  </TransitionLink>
                </article>
              ))
            ) : profiles.length === 0 ? (
              // If schema is present but no active profiles yet, show the curated popular mentors
              visiblePopularMentors.map((mentor, idx) => (
                <article
                  key={mentor.name}
                  className={`${styles.mentorCard} ${styles.reveal}`}
                  data-reveal
                  style={{ "--mentor-accent": mentor.accentColor, "--reveal-delay": `${idx * 80}ms` } as CSSProperties}
                >
                  <div className={styles.mentorTag} style={{ color: mentor.accentColor }}>
                    {mentor.type}
                  </div>
                  <div className={styles.mentorAvatarSection}>
                    {mentor.imageUrl ? (
                      <Image
                        src={mentor.imageUrl}
                        alt={mentor.name}
                        width={44}
                        height={44}
                        className={styles.avatarImage}
                        style={{ border: `2px solid ${mentor.accentColor}` }}
                      />
                    ) : (
                      <div className={styles.avatarCircle} style={{ border: `2px solid ${mentor.accentColor}` }}>
                        {mentor.avatarChar}
                      </div>
                    )}
                    <div className={styles.mentorIdentity}>
                      <h3 className={styles.mentorName}>
                        {mentor.name}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={mentor.accentColor} className={styles.verificationBadge}>
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </h3>
                      <p className={styles.mentorHeadline}>{mentor.headline}</p>
                    </div>
                  </div>
                  <div className={styles.mentorRatingRow}>
                    <span className={styles.star}>★</span>
                    <strong>{mentor.rating}</strong>
                    <span className={styles.sessionCount}>({mentor.sessions})</span>
                  </div>
                  <div className={styles.mentorTags}>
                    {mentor.tags.map((tag) => (
                      <span key={tag} className={styles.mentorTagPill}>{tag}</span>
                    ))}
                  </div>
                  <TransitionLink href={`/mentorgo/mentor/${mentor.name.toLowerCase().replace(/ /g, "-")}`} className={styles.bookButton}>
                    View Profile & Book
                  </TransitionLink>
                </article>
              ))
            ) : (
              // Render real database profiles if they exist
              filteredProfiles.map((profile, idx) => {
                const isExpert = profile.mentor_type === "industry_expert" || profile.mentor_type === "founder";
                const isAlumni = profile.mentor_type === "alumni";
                const typeLabel = formatMentorGoValue(profile.mentor_type);
                const accent = isExpert ? "#96a1ab" : isAlumni ? "#10B981" : "#D97706";

                return (
                  <article
                    key={profile.id}
                    className={`${styles.mentorCard} ${styles.reveal}`}
                    data-reveal
                    style={{ "--mentor-accent": accent, "--reveal-delay": `${idx * 80}ms` } as CSSProperties}
                  >
                    <div className={styles.mentorTag} style={{ color: accent }}>
                      {typeLabel}
                    </div>
                    <div className={styles.mentorAvatarSection}>
                      <div className={styles.avatarCircle} style={{ border: `2px solid ${accent}` }}>
                        {profile.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.mentorIdentity}>
                        <h3 className={styles.mentorName}>
                          {profile.display_name}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={accent} className={styles.verificationBadge}>
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        </h3>
                        <p className={styles.mentorHeadline}>{profile.headline}</p>
                      </div>
                    </div>
                    <div className={styles.mentorRatingRow}>
                      <span className={styles.star}>★</span>
                      <strong>{profile.average_rating ? profile.average_rating.toString() : "5.0"}</strong>
                      <span className={styles.sessionCount}>({profile.review_count} sessions)</span>
                    </div>
                    <div className={styles.mentorTags}>
                      {profile.expertise_tags.slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.mentorTagPill}>{tag}</span>
                      ))}
                    </div>
                    <TransitionLink href={`/mentorgo/mentor/${profile.slug}`} className={styles.bookButton}>
                      View Profile & Book
                    </TransitionLink>
                  </article>
                );
              })
            )}
          </div>

          <div className={`${styles.viewAllContainer} ${styles.reveal}`} data-reveal>
            {showAll ? (
              <Link href="/mentorgo" className={styles.viewAllButton} scroll={false}>
                View Less Mentors &uarr;
              </Link>
            ) : (
              <Link href="/mentorgo?showAll=true" className={styles.viewAllButton} scroll={false}>
                View All Mentors &darr;
              </Link>
            )}
          </div>
        </section>

        {/* Why Choose Our Mentorship? */}
        <section className={`${styles.whySection} ${styles.reveal}`} data-reveal>
          <h3 className={styles.whyTitle}>Why Choose Our Mentorship?</h3>
          <div className={styles.highlightsGrid}>
            {highlights.map((hl, idx) => (
              <div key={idx} className={styles.highlightItem}>
                <div className={styles.highlightIcon}>
                  {hl.icon}
                </div>
                <span className={styles.highlightText}>{hl.text}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
