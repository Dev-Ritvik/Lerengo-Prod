import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMentorBySlug } from "@/lib/mentorgo-api";
import { popularMentors } from "@/lib/mentorgo";
import { CalcomEmbed } from "@/components/calcom-embed";
import styles from "./page.module.css";

interface MentorProfilePageProps {
  params: {
    slug: string;
  };
}

export default async function MentorProfilePage({ params }: MentorProfilePageProps) {
  const { slug } = await params;

  let mentorData: any = null;

  const { profile, schemaMissing } = await getMentorBySlug(slug);

  if (schemaMissing || !profile) {
    // Try to find in mock data
    const mockMentor = popularMentors.find(
      (m) => m.name.toLowerCase().replace(/ /g, "-") === slug
    );
    
    if (mockMentor) {
      mentorData = {
        name: mockMentor.name,
        headline: mockMentor.headline,
        bio: `${mockMentor.name} is a highly experienced ${mockMentor.type.toLowerCase()} who has conducted over ${mockMentor.sessions} on MentorGO. They specialize in helping students and early-career professionals bridge the gap between academia and industry.`,
        skills: mockMentor.tags,
        accentColor: mockMentor.accentColor,
        avatarChar: mockMentor.avatarChar,
        imageUrl: mockMentor.imageUrl,
        rating: mockMentor.rating,
        sessions: mockMentor.sessions,
        // Mock cal.com url (demo)
        calcomUrl: "lerengo-2sbya7/30min",
      };
    }
  } else {
    // We have a real profile from Supabase
    // Extract calcom url from social_links if present, otherwise fallback to demo
    const socialLinks = profile.social_links as Record<string, string>;
    const calcomUrl = socialLinks?.calcom ?? "lerengo-2sbya7/30min";

    mentorData = {
      name: profile.display_name,
      headline: profile.headline,
      bio: profile.long_bio || profile.short_bio,
      skills: [...profile.expertise_tags, ...profile.skills],
      accentColor: "#96a1ab", // Default accent
      avatarChar: profile.display_name.slice(0, 2).toUpperCase(),
      imageUrl: profile.profile_image_url,
      rating: profile.average_rating ? profile.average_rating.toString() : "5.0",
      sessions: `${profile.review_count} sessions`,
      calcomUrl,
    };
  }

  if (!mentorData) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center' }}>
          <Link href="/mentorgo" style={{
            background: 'transparent',
            color: 'rgba(245, 243, 240, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            fontWeight: 500,
            fontSize: '13px',
            padding: '8px 20px',
            textDecoration: 'none'
          }}>
            &larr; Back to MentorGO
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.profileLayout}>
          
          <div className={styles.leftCol}>
            <section className={styles.profileHeader}>
              <div className={styles.avatarCircle} style={{ borderColor: mentorData.accentColor }}>
                {mentorData.imageUrl ? (
                  <Image
                    src={mentorData.imageUrl}
                    alt={mentorData.name}
                    width={100}
                    height={100}
                    className={styles.avatarImage}
                    style={{ border: `3px solid ${mentorData.accentColor}` }}
                  />
                ) : (
                  <span style={{ color: mentorData.accentColor }}>{mentorData.avatarChar}</span>
                )}
              </div>
              
              <div className={styles.identity}>
                <h1 className={styles.name}>
                  {mentorData.name}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={mentorData.accentColor} className={styles.verificationBadge}>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </h1>
                <p className={styles.headline}>{mentorData.headline}</p>
                
                <div className={styles.ratingRow}>
                  <span className={styles.star}>★</span>
                  <strong>{mentorData.rating}</strong>
                  <span className={styles.sessionCount}>({mentorData.sessions})</span>
                </div>
              </div>
            </section>

            <section className={styles.bioSection}>
              <h2 className={styles.sectionTitle}>About</h2>
              <p className={styles.bioText}>{mentorData.bio}</p>
            </section>

            <section className={styles.skillsSection}>
              <h2 className={styles.sectionTitle}>Expertise & Skills</h2>
              <div className={styles.skillsGrid}>
                {mentorData.skills.map((skill: string) => (
                  <span key={skill} className={styles.skillPill}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.rightCol}>
            <div className={styles.bookingSidebar}>
              <div className={styles.bookingCard}>
                <h2 className={styles.bookingTitle}>Book a Session</h2>
                <p className={styles.bookingDesc}>Select a time that works for you.</p>
                <CalcomEmbed calLink={mentorData.calcomUrl} theme="dark" />
              </div>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}
