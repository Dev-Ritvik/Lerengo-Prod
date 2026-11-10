import Image from "next/image";
import Link from "next/link";
import styles from "./info-page-shell.module.css";

type InfoPageKey = "about" | "terms" | "refund-policy" | "privacy" | "contact" | "shipping-policy" | "none";

type InfoSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type InfoPageShellProps = {
  activePage: InfoPageKey;
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: InfoSection[];
  updatedAt?: string;
};

const topLinks: Array<{ href: string; key: InfoPageKey; label: string }> = [
  { href: "/about", key: "about", label: "About" },
  { href: "/terms", key: "terms", label: "Terms" },
  { href: "/refund-policy", key: "refund-policy", label: "Refund Policy" },
  { href: "/privacy", key: "privacy", label: "Privacy Policy" },
  { href: "/contact", key: "contact", label: "Contact" },
  { href: "/shipping-policy", key: "shipping-policy", label: "Shipping & Delivery" },
];

export function InfoPageShell({
  activePage,
  eyebrow,
  title,
  subtitle,
  sections,
  updatedAt,
}: InfoPageShellProps) {
  return (
    <div className={styles.viewport}>
      <main className={styles.canvas}>
        <div className={styles.container}>
          <header className={styles.topBar}>
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

            <nav className={styles.topNav} aria-label="Policy navigation">
              {topLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${
                    link.key === activePage ? styles.navLinkActive : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </header>

          <section className={styles.hero}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
            {updatedAt ? <p className={styles.meta}>Last updated: {updatedAt}</p> : null}
          </section>

          <section className={styles.cardGrid}>
            {sections.map((section) => (
              <article key={section.title} className={styles.card}>
                <h2 className={styles.cardTitle}>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className={styles.cardBody}>
                    {paragraph}
                  </p>
                ))}
                {section.items?.length ? (
                  <ul className={styles.list}>
                    {section.items.map((item) => (
                      <li key={item} className={styles.listItem}>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </section>

          <div className={styles.actionRow}>
            <Link href="/" className={styles.homeButton}>
              Return to LerenGO
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
