import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { resolveAppUrl } from "@/lib/app-url";
import styles from "./page.module.css";

const platformAreas = [
  {
    title: "CampusGO",
    description:
      "Verified notes, mentorship, and community workflows stay university-scoped so trust never collapses into a generic public feed.",
    signals: ["Notes access", "Mentorship", "Community moderation"],
  },
  {
    title: "Verification Layer",
    description:
      "Identity, university affiliation, and approval states are part of the product itself, not an afterthought handled somewhere else.",
    signals: ["Email OTP", "ID review", "Approval history"],
  },
  {
    title: "Operations Control",
    description:
      "Admins manage campuses from one control plane covering uploads, reports, user verification pressure, and growing platform health.",
    signals: ["Moderation", "Analytics", "Payments review"],
  },
] as const;

const adminModules = [
  "Notes publishing and archive control",
  "Verification review and manual decision queues",
  "Community reports, weekly highlights, and moderation state",
  "Mentor approval, roster control, and operations visibility",
] as const;

const guardrails = [
  "Admin access stays separate from student sign in.",
  "Only verified admin accounts can open the operations workspace.",
  "Campus actions are scoped by university and tracked through the same platform model.",
] as const;

function getRevealStyle(index: number): CSSProperties {
  return {
    "--reveal-delay": `${index * 110}ms`,
  } as CSSProperties;
}

export default function AdminPortalPage() {
  const mainSiteHref = resolveAppUrl();
  const footerLinks = [
    { href: "/admin/login", label: "Admin sign in" },
    { href: `${mainSiteHref}/about`, label: "About" },
    { href: `${mainSiteHref}/contact`, label: "Contact" },
    { href: mainSiteHref, label: "Main site" },
  ] as const;

  return (
    <div className={styles.viewport}>
      <ScrollRevealController />
      <main className={styles.canvas}>
        <header className={`${styles.header} ${styles.reveal}`} data-reveal>
          <Link href="/" aria-label="LerenGO admin portal" className={styles.brand}>
            <Image
              src="/logo.lerengo.embedded.svg"
              alt="LerenGO"
              width={562}
              height={303}
              className={styles.logo}
              priority
            />
          </Link>

          <nav className={styles.nav} aria-label="Admin portal sections">
            <Link href="#company" className={styles.navLink}>
              Company
            </Link>
            <Link href="#operations" className={styles.navLink}>
              Operations
            </Link>
            <Link href="#security" className={styles.navLink}>
              Security
            </Link>
          </nav>

          <div className={styles.headerActions}>
            <TransitionLink href={mainSiteHref} className={styles.ghostButton}>
              Main site
            </TransitionLink>
            <TransitionLink href="/admin/login" className={styles.primaryButton}>
              Admin sign in
            </TransitionLink>
          </div>
        </header>

        <section className={styles.heroSection}>
          <div className={`${styles.heroCopy} ${styles.reveal}`} data-reveal>
            <span className={styles.eyebrow}>LerenGO Operations</span>
            <h1 className={styles.heroTitle}>
              The admin lane for a verified campus platform.
            </h1>
            <p className={styles.heroBody}>
              LerenGO runs student-facing products for notes, mentorship, community,
              verification, and campus growth. This portal exists so operations teams and
              campus admins can govern that system from a separate, controlled surface.
            </p>

            <div className={styles.heroActions}>
              <TransitionLink href="/admin/login" className={styles.primaryButton}>
                Sign in to admin workspace
              </TransitionLink>
              <TransitionLink href="/admin/request-access" className={styles.secondaryButton}>
                Request admin access
              </TransitionLink>
            </div>
          </div>

          <aside
            className={`${styles.heroPanel} ${styles.reveal}`}
            data-reveal
            style={getRevealStyle(1)}
          >
            <span className={styles.panelEyebrow}>Control Surface</span>
            <h2 className={styles.panelTitle}>One company, one system, separate admin entry.</h2>
            <p className={styles.panelBody}>
              The public product and the admin control plane should feel related, but never
              identical. Operations has different risk, different permissions, and different
              responsibilities.
            </p>

            <div className={styles.signalStack}>
              {guardrails.map((item) => (
                <div className={styles.signalRow} key={item}>
                  <span className={styles.signalDot} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className={styles.section} id="company">
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionEyebrow}>What LerenGO Runs</span>
            <h2 className={styles.sectionTitle}>
              The company layer behind the student product.
            </h2>
            <p className={styles.sectionBody}>
              LerenGO is not just a login screen and a campus feed. It is a verified campus
              system with student workflows, approvals, moderation, and admin operations
              running on the same platform model.
            </p>
          </div>

          <div className={styles.areaGrid}>
            {platformAreas.map((area, index) => (
              <article
                key={area.title}
                className={`${styles.areaCard} ${styles.reveal}`}
                data-reveal
                style={getRevealStyle(index + 1)}
              >
                <h3 className={styles.areaTitle}>{area.title}</h3>
                <p className={styles.areaBody}>{area.description}</p>
                <div className={styles.pillRow}>
                  {area.signals.map((signal) => (
                    <span key={signal} className={styles.pill}>
                      {signal}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="operations">
          <div className={`${styles.operationsCard} ${styles.reveal}`} data-reveal>
            <div className={styles.operationsCopy}>
              <span className={styles.sectionEyebrow}>Admin Scope</span>
              <h2 className={styles.sectionTitle}>What the admin workspace actually controls.</h2>
              <p className={styles.sectionBody}>
                Admin access is for publishing, moderation, verification, and campus-level
                operations. It should never feel like a thin copy of the student auth flow.
              </p>
            </div>

            <div className={styles.moduleList}>
              {adminModules.map((module) => (
                <div className={styles.moduleItem} key={module}>
                  <span className={styles.moduleMark}>01</span>
                  <span>{module}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="security">
          <div className={`${styles.ctaPanel} ${styles.reveal}`} data-reveal>
            <div className={styles.ctaCopy}>
              <span className={styles.sectionEyebrow}>Admin Entry</span>
              <h2 className={styles.sectionTitle}>Open the control plane only when you have issued access.</h2>
              <p className={styles.sectionBody}>
                Verified admins can continue into moderation, verification, analytics,
                payments, and campus operations. Everyone else should stay on the public
                product lanes.
              </p>
            </div>

            <div className={styles.ctaActions}>
              <TransitionLink href="/admin/login" className={styles.primaryButton}>
                Admin sign in
              </TransitionLink>
              <TransitionLink href="/admin/request-access" className={styles.secondaryButton}>
                Need approval?
              </TransitionLink>
            </div>
          </div>
        </section>

        <footer className={`${styles.footer} ${styles.reveal}`} data-reveal>
          <div className={styles.footerBrand}>
            <p className={styles.footerTitle}>LerenGO Admin Portal</p>
            <p className={styles.footerText}>
              Separate access for moderation, verification, notes, community, and campus operations.
            </p>
          </div>

          <nav className={styles.footerNav} aria-label="Admin footer links">
            {footerLinks.map((link) => (
              <TransitionLink key={link.href} href={link.href} className={styles.footerLink}>
                {link.label}
              </TransitionLink>
            ))}
          </nav>
        </footer>
      </main>
    </div>
  );
}
