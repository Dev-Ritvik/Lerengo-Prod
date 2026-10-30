import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { getAppUser } from "@/lib/auth";
import { ProfileMenu } from "@/components/profile-menu";
import { resolveAppUrl } from "@/lib/app-url";
import {
  HUNTERGO_SCHEMA_HINT,
  formatHunterGoValue,
  getHunterGoPublicData,
} from "@/lib/huntergo";
import styles from "./page.module.css";

const navLinks = [
  { href: "#profiles", label: "Talent Profiles" },
  { href: "#recruiters", label: "Recruiters" },
  { href: "#pipeline", label: "Pipeline" },
] as const;

const capabilityCards = [
  {
    body: "Students must explicitly activate a profile and control whether they are private, LerenGO-only, visible to verified recruiters, or available through a public link.",
    number: "01",
    pills: ["Opt-in", "Privacy", "Visibility"],
    title: "Consent-first talent profiles",
  },
  {
    body: "Candidate cards should lead with SkillGO certificates, ForgeGO projects, CampusGO validation, and approved MentorGO signals where privacy allows.",
    number: "02",
    pills: ["Skills", "Projects", "Validation"],
    title: "Proof-first discovery",
  },
  {
    body: "Recruiters need company verification, invite quotas, shortlists, opportunities, and pipeline state before they can reach students at scale.",
    number: "03",
    pills: ["Verification", "Shortlist", "Pipeline"],
    title: "Verified recruiter workflow",
  },
] as const;

const pipelineStates = [
  "invited",
  "interested",
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

const trustRules = [
  "Private talent profiles must not appear in search.",
  "Unverified recruiters must not access broad candidate discovery.",
  "Candidate contact details stay hidden until the student allows access.",
  "Recruiter notes remain private to the recruiter/company side.",
] as const;

function getFirstName(value: string | null | undefined) {
  if (!value) {
    return "User";
  }
  return value.trim().split(/\s+/)[0] || "User";
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "U";
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  return parts.length === 1
    ? parts[0].slice(0, 1).toUpperCase()
    : `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function getRevealStyle(index: number): CSSProperties {
  return {
    "--reveal-delay": `${index * 90}ms`,
  } as CSSProperties;
}

export const dynamic = "force-dynamic";

export default async function HunterGoPage() {
  const appUrl = resolveAppUrl();
  const { opportunities, schemaMissing } = await getHunterGoPublicData();
  const userContext = await getAppUser().catch(() => null);
  const appUser = userContext?.appUser ?? null;
  const authUser = userContext?.authUser ?? null;
  const userName = appUser?.full_name?.trim() || appUser?.email || authUser?.email || null;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);

  return (
    <div className={styles.viewport}>
      <ScrollRevealController />
      <main className={styles.canvas}>
        <header className={`${styles.header} ${styles.reveal}`} data-reveal>
          <div className={styles.headerMain}>
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

            <nav className={styles.primaryNav} aria-label="HunterGO navigation">
              {navLinks.map((link) => (
                <Link className={styles.navLink} href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

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
                <TransitionLink href="/signin?next=/huntergo" className={styles.secondaryAction}>
                  Sign in
                </TransitionLink>
                <Link href="#profiles" className={styles.primaryAction}>
                  View opportunities
                </Link>
              </>
            )}
          </div>
        </header>

        <section className={styles.heroSection}>
          <div className={`${styles.heroCopy} ${styles.reveal}`} data-reveal>
            <span className={styles.eyebrow}>HunterGO</span>
            <h1 className={styles.heroTitle}>Get discovered through skills, projects, and proof.</h1>
            <p className={styles.heroBody}>
              HunterGO is the verified talent layer of LerenGO. It should help opportunity
              owners find student builders through evidence from the platform, not through a
              generic resume database.
            </p>
             <div className={styles.heroActions}>
              <Link href="#recruiters" className={styles.primaryAction}>
                Review recruiter boundary
              </Link>
              {appUser ? (
                <TransitionLink href="/dashboard" className={styles.secondaryAction}>
                  Go to Dashboard
                </TransitionLink>
              ) : (
                <TransitionLink href="/signin?next=/huntergo" className={styles.secondaryAction}>
                  Continue with LerenGO
                </TransitionLink>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section} id="profiles">
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionEyebrow}>Foundation</span>
            <h2 className={styles.sectionTitle}>HunterGO starts with privacy, not job-board volume.</h2>
            <p className={styles.sectionBody}>
              This surface establishes the talent-discovery model without rendering fake
              candidates, fake companies, or inflated placement claims. Published opportunities are backend-backed.
            </p>
          </div>

          <div className={styles.cardGrid}>
            {capabilityCards.map((card, index) => (
              <article
                className={`${styles.capabilityCard} ${styles.reveal}`}
                data-reveal
                key={card.title}
                style={getRevealStyle(index + 1)}
              >
                <span className={styles.cardNumber}>{card.number}</span>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardBody}>{card.body}</p>
                <div className={styles.pillRow}>
                  {card.pills.map((pill) => (
                    <span className={styles.pill} key={pill}>
                      {pill}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className={`${styles.directoryPanel} ${styles.reveal}`} data-reveal>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>Published opportunities</span>
              <h2 className={styles.sectionTitle}>Opportunity discovery without exposing private talent.</h2>
              <p className={styles.sectionBody}>
                These entries come from `hunter_opportunities`. Candidate search remains gated to verified recruiters and opt-in talent profiles.
              </p>
            </div>

            {schemaMissing ? (
              <div className={styles.emptyPanel}>
                <span className={styles.cardEyebrow}>Backend state</span>
                <h3 className={styles.stateTitle}>HunterGO schema is not applied yet.</h3>
                <p className={styles.stateBody}>{HUNTERGO_SCHEMA_HINT}</p>
              </div>
            ) : opportunities.length === 0 ? (
              <div className={styles.emptyPanel}>
                <span className={styles.cardEyebrow}>Opportunity state</span>
                <h3 className={styles.stateTitle}>No published opportunities are available yet.</h3>
                <p className={styles.stateBody}>
                  Verified recruiter opportunities will appear after admin review. Private student profiles stay hidden.
                </p>
              </div>
            ) : (
              <div className={styles.profileGrid}>
                {opportunities.map((opportunity, index) => (
                  <article
                    className={`${styles.profileCard} ${styles.reveal}`}
                    data-reveal
                    key={opportunity.id}
                    style={getRevealStyle(index + 4)}
                  >
                    <div className={styles.profileHeader}>
                      <div className={styles.avatarFallback}>HG</div>
                      <div>
                        <h3 className={styles.cardTitle}>{opportunity.title}</h3>
                        <p className={styles.cardBody}>
                          {opportunity.company?.name ?? "Verified opportunity"} / {formatHunterGoValue(opportunity.location_mode)}
                        </p>
                      </div>
                    </div>
                    <p className={styles.cardBody}>{opportunity.description}</p>
                    <div className={styles.pillRow}>
                      <span className={styles.pill}>{opportunity.opportunity_type}</span>
                      {opportunity.required_skills.slice(0, 3).map((skill) => (
                        <span className={styles.pill} key={`${opportunity.id}-${skill}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className={styles.metaRail}>
                      <span>{opportunity.compensation_label ?? "Compensation not listed"}</span>
                      <strong>{formatHunterGoValue(opportunity.status)}</strong>
                    </div>
                    {appUser ? (
                      <TransitionLink href="/dashboard" className={styles.cardAction} style={{ textAlign: "center" }}>
                        View in Dashboard
                      </TransitionLink>
                    ) : (
                      <TransitionLink href="/signin?next=/huntergo" className={styles.cardAction}>
                        Sign in to express interest
                      </TransitionLink>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={styles.section} id="recruiters">
          <div className={`${styles.stateGrid} ${styles.reveal}`} data-reveal>
            <article className={styles.statePanel}>
              <span className={styles.cardEyebrow}>Recruiter boundary</span>
              <h2 className={styles.sectionTitle}>Verified discovery is the product. Spam prevention is not optional.</h2>
              <ul className={styles.stateList}>
                {trustRules.map((rule) => (
                  <li className={styles.listItem} key={rule}>
                    {rule}
                  </li>
                ))}
              </ul>
            </article>

            <aside className={styles.emptyPanel}>
              <span className={styles.cardEyebrow}>Talent state</span>
              <h3 className={styles.stateTitle}>Talent search stays gated by recruiter verification.</h3>
              <p className={styles.stateBody}>
                The backend now separates talent visibility, recruiter verification, opportunities,
                invites, and pipeline state. Search should only be exposed after recruiter onboarding UI is complete.
              </p>
              {appUser ? (
                <TransitionLink className={styles.cardAction} href="/dashboard">
                  Go to Dashboard
                </TransitionLink>
              ) : (
                <TransitionLink className={styles.cardAction} href="/signin?next=/huntergo">
                  Sign in to continue
                </TransitionLink>
              )}
            </aside>
          </div>
        </section>

        <section className={styles.section} id="pipeline">
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionEyebrow}>Pipeline lifecycle</span>
            <h2 className={styles.sectionTitle}>Opportunity progress must be clear to both sides.</h2>
            <p className={styles.sectionBody}>
              Recruiter-facing pipeline notes and candidate-visible status need separate fields.
              A candidate should never see private recruiter notes.
            </p>
          </div>

          <div className={`${styles.pillRow} ${styles.reveal}`} data-reveal>
            {pipelineStates.map((state) => (
              <span className={styles.pill} key={state}>
                {state}
              </span>
            ))}
          </div>
        </section>

        <section className={`${styles.ctaBand} ${styles.reveal}`} data-reveal>
          <div className={styles.ctaPanel}>
            <div className={styles.ctaCopy}>
              <span className={styles.sectionEyebrow}>Next build step</span>
              <h2 className={styles.ctaTitle}>Build opt-in profiles before recruiter search.</h2>
              <p className={styles.ctaBody}>
                The next slice should add HunterGO schema, private-by-default talent profiles,
                recruiter onboarding, and admin verification. Search should come after privacy rules are enforced.
              </p>
            </div>
            <div className={styles.ctaActions}>
              <Link href="#profiles" className={styles.primaryAction}>
                Back to foundation
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
