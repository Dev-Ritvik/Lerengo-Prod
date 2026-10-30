import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { resolveAppUrl } from "@/lib/app-url";
import { getAppUser } from "@/lib/auth";
import { ProfileMenu } from "@/components/profile-menu";
import styles from "./page.module.css";

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

const tracks = [
  {
    title: "Concept Intake & Assessment",
    body:
      "You start by submitting your idea with enough detail for someone to evaluate it — the problem it solves, the current state of your thinking, who it is for, and what a successful outcome looks like. This is not a pitch deck exercise. The intake process is designed to force clarity early, so that vague ideas either sharpen or get flagged before you invest weeks of work. Submissions are reviewed by advisors who assess feasibility, scope, and whether the idea fits a research, patent, or prototype track.",
    signals: ["Problem framing", "Feasibility review", "Track routing"],
  },
  {
    title: "Guided Research Desk",
    body:
      "Ideas with strong research potential are routed to the Research Desk, where advisors help structure literature reviews, define experimental methodology, and prepare work for publication. This is not a passive mentorship call — it is a working track with milestones, deadlines, and output expectations. The goal is to take a raw research angle and turn it into something that could be submitted to a journal or conference with confidence.",
    signals: ["Literature review", "Methodology design", "Publication support"],
  },
  {
    title: "Patent & Prototype Runway",
    body:
      "When a concept proves viable enough to build, it moves to the Prototype Runway. Here, teams get structured support for scoping an MVP, planning IP strategy, and executing a build sprint. The runway handles the parts of product development that independent builders usually get stuck on — architecture decisions, resource allocation, milestone tracking, and peer review. Teams that ship well here get visibility to institutional partners through CampusGO.",
    signals: ["MVP scoping", "IP strategy", "Build execution"],
  },
] as const;

const steps = [
  {
    step: "1",
    title: "Submit your concept",
    body: "Describe the problem, your proposed approach, your team (or solo) credentials, and what outcome you are targeting — a prototype, a paper, or a patent filing.",
  },
  {
    step: "2",
    title: "Review and classification",
    body: "Advisors evaluate alignment with research, prototype, or patent tracks. You get feedback on feasibility, scope, and suggested direction within one review cycle.",
  },
  {
    step: "3",
    title: "Track assignment and kickoff",
    body: "Accepted concepts launch with an assigned advisor, a milestone dashboard, and access to relevant templates, tools, and review channels.",
  },
  {
    step: "4",
    title: "Milestone-based delivery",
    body: "Work through structured milestones with continuous review. Graduate with a functioning prototype, a publication-ready draft, or a patent blueprint.",
  },
] as const;

const reviewCriteria = [
  "Problem clarity — is the problem well-defined and worth solving?",
  "Research potential — does the idea contribute something new?",
  "Prototype viability — can this be built with available resources?",
  "Team readiness — does the team have the skills to execute?",
  "Publication angle — is there a publishable insight here?",
  "Patent potential — is there defensible intellectual property?",
] as const;

const faqs = [
  {
    question: "What is ForgeGO?",
    answer:
      "ForgeGO is the execution module of LerenGO. While SkillGO handles learning and CampusGO handles institutional connections, ForgeGO is where you take an idea and turn it into something real — a prototype, a research paper, or a patent filing. It provides structure, advisors, and review cycles to keep projects moving.",
  },
  {
    question: "How does the evaluation process work?",
    answer:
      "You submit a concept through the intake form. Advisors review it for feasibility, scientific backing, and practical value. Approved ideas get routed to a specific track — research, prototype, or patent — with direct resources and milestone expectations.",
  },
  {
    question: "Do I keep ownership of my work?",
    answer:
      "Yes. ForgeGO is a support framework, not an incubator that takes equity. All ideas, code, designs, research, and patent filings remain the exclusive property of the person or team who created them.",
  },
] as const;

function getRevealStyle(index: number): CSSProperties {
  return { "--reveal-delay": `${index * 80}ms` } as CSSProperties;
}

export const dynamic = "force-dynamic";

export default async function LabsPage() {
  const appUrl = resolveAppUrl();
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

          <nav className={styles.nav} aria-label="ForgeGO navigation">
            <Link href="/labs#tracks" className={styles.navLink}>Tracks</Link>
            <Link href="/labs#process" className={styles.navLink}>Process</Link>
            <Link href="/labs#criteria" className={styles.navLink}>Criteria</Link>
            <Link href="/labs#faq" className={styles.navLink}>FAQ</Link>
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
                <TransitionLink href="/signin?next=/labs/submit" className={styles.ghostAction}>
                  Sign in
                </TransitionLink>
                <TransitionLink href="/labs/submit" className={styles.primaryAction}>
                  Submit idea
                </TransitionLink>
              </>
            )}
          </div>
        </header>

        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={`${styles.heroInner} ${styles.reveal}`} data-reveal>
            <p className={styles.label}>ForgeGO</p>
            <h1 className={styles.heroTitle}>
              Turn ideas into working<br />prototypes, papers, and patents.
            </h1>
            <p className={styles.heroSub}>
              ForgeGO is a structured pipeline for taking raw concepts and turning them into
              real output. You submit an idea, get matched with advisors, and work through a
              milestone-driven process that ends with something tangible — a functioning prototype,
              a publication-ready research paper, or a patent filing. It is not an accelerator
              or an incubator. It is an execution framework with real review cycles and accountability.
            </p>
            <div className={styles.heroCta}>
              <TransitionLink href="/labs/submit" className={styles.primaryAction}>
                Submit your idea
              </TransitionLink>
              <a href="#process" className={styles.ghostAction}>
                See the process
              </a>
            </div>
          </div>
        </section>

        {/* ── Tracks ── */}
        <section className={styles.section} id="tracks">
          <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
            <p className={styles.label}>Pipeline tracks</p>
            <h2 className={styles.sectionTitle}>Three tracks based on what you are building.</h2>
            <p className={styles.sectionDesc}>
              Every submission gets evaluated and routed to the track that fits its maturity
              and goals. You do not choose a track — the review process determines where your
              idea fits best.
            </p>
          </div>

          <div className={styles.trackGrid}>
            {tracks.map((track, idx) => (
              <article
                key={track.title}
                className={`${styles.trackCard} ${styles.reveal}`}
                data-reveal
                style={getRevealStyle(idx + 1)}
              >
                <h3 className={styles.trackTitle}>{track.title}</h3>
                <p className={styles.trackBody}>{track.body}</p>
                <div className={styles.trackSignals}>
                  {track.signals.map((s) => (
                    <span key={s} className={styles.trackSignal}>{s}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Process ── */}
        <div className={styles.altBg} id="process">
          <section className={styles.sectionInner}>
            <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
              <p className={styles.label}>How it works</p>
              <h2 className={styles.sectionTitle}>From submission to outcome.</h2>
              <p className={styles.sectionDesc}>
                The process is designed to be straightforward. You submit, you get reviewed,
                you get assigned, you work through milestones, you ship.
              </p>
            </div>

            <div className={styles.stepGrid}>
              {steps.map((step, idx) => (
                <article
                  key={step.step}
                  className={`${styles.stepCard} ${styles.reveal}`}
                  data-reveal
                  style={getRevealStyle(idx + 1)}
                >
                  <span className={styles.stepNumber}>{step.step}</span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* ── Review Criteria ── */}
        <section className={styles.section} id="criteria">
          <div className={`${styles.sectionTop} ${styles.reveal}`} data-reveal>
            <p className={styles.label}>Evaluation criteria</p>
            <h2 className={styles.sectionTitle}>What the review board looks for.</h2>
            <p className={styles.sectionDesc}>
              Not every idea gets accepted. The review process filters for concepts that are
              well-defined, technically feasible, and have a clear path to a meaningful outcome.
              Here is what matters.
            </p>
          </div>

          <ul className={styles.criteriaList}>
            {reviewCriteria.map((item, idx) => (
              <li
                key={item}
                className={`${styles.criteriaItem} ${styles.reveal}`}
                data-reveal
                style={getRevealStyle(idx + 1)}
              >
                {item}
              </li>
            ))}
          </ul>
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

        {/* ── Bottom CTA ── */}
        <section className={`${styles.bottomCta} ${styles.reveal}`} data-reveal>
          <h2 className={styles.ctaHeading}>Have an idea worth building?</h2>
          <p className={styles.ctaText}>
            Open the intake form, describe your concept, and submit. The review board will
            evaluate it and route it to the right track. You keep full ownership of everything
            you build.
          </p>
          <div className={styles.ctaButtons}>
            <TransitionLink href="/labs/submit" className={styles.primaryAction}>
              Submit your idea
            </TransitionLink>
            {appUser ? (
              <TransitionLink href="/dashboard" className={styles.ghostAction}>
                Go to dashboard
              </TransitionLink>
            ) : (
              <TransitionLink href="/signin?next=/labs/submit" className={styles.ghostAction}>
                Sign in to dashboard
              </TransitionLink>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
