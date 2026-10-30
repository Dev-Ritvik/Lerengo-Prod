import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMentorsByCategory } from "@/lib/mentorgo-api";
import { formatMentorGoValue, popularMentors } from "@/lib/mentorgo";
import styles from "@/app/mentorgo/page.module.css";
import type { CSSProperties } from "react";
import { TransitionLink } from "@/components/transition-link";

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export default async function MentorCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  if (!["expert", "senior", "alumni"].includes(category)) {
    redirect("/mentorgo");
  }

  const { profiles, schemaMissing } = await getMentorsByCategory(category);

  // Filter mock data if backend schema is missing or no profiles
  const visibleMocks = popularMentors.filter((m) => m.typeKey === category);
  const showMocks = schemaMissing || profiles.length === 0;

  const titleMap: Record<string, string> = {
    expert: "Expert Mentors",
    senior: "Senior Mentors",
    alumni: "Alumni Mentors",
  };

  return (
    <div className={styles.viewport}>
      <header className={styles.header}>
        <div className={styles.canvas} style={{ display: "flex", width: "100%", paddingBottom: 0, alignItems: "center", paddingTop: 0 }}>
          <div className={styles.headerLeft}>
            <Link href="/mentorgo" className={styles.secondaryAction}>
              &larr; Back to MentorGO
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.canvas}>
        <section className={styles.heroSection} style={{ paddingTop: "40px", paddingBottom: "20px" }}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Mentor Category</span>
            <h1 className={styles.heroTitle}>{titleMap[category]}</h1>
            <p className={styles.heroBody}>
              Browse through our curated list of {titleMap[category].toLowerCase()} and book a session to accelerate your career.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.mentorGrid}>
            {showMocks ? (
              visibleMocks.map((mentor) => (
                <article
                  key={mentor.name}
                  className={styles.mentorCard}
                  style={{ "--mentor-accent": mentor.accentColor } as CSSProperties}
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
              profiles.map((profile) => {
                const isExpert = profile.mentor_type === "industry_expert" || profile.mentor_type === "founder";
                const isAlumni = profile.mentor_type === "alumni";
                const typeLabel = formatMentorGoValue(profile.mentor_type);
                const accent = isExpert ? "#96a1ab" : isAlumni ? "#10B981" : "#D97706";

                return (
                  <article
                    key={profile.id}
                    className={styles.mentorCard}
                    style={{ "--mentor-accent": accent } as CSSProperties}
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
        </section>
      </main>
    </div>
  );
}
