import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./admin-auth-shell.module.css";

type AdminAuthShellProps = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  spotlightEyebrow: string;
  spotlightTitle: string;
  spotlightBody: string;
  chips: string[];
  checklist: string[];
  children: ReactNode;
};

export function AdminAuthShell({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  spotlightEyebrow,
  spotlightTitle,
  spotlightBody,
  chips,
  checklist,
  children,
}: AdminAuthShellProps) {
  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <header className={styles.topBar}>
          <Link href="/" aria-label="LerenGO home" className={styles.brand}>
            <Image src="/logo.lerengo.embedded.svg" alt="LerenGO" width={562} height={303} priority />
          </Link>
          <Link className={styles.backLink} href={backHref}>
            {backLabel}
          </Link>
        </header>

        <section className={styles.frame}>
          <section className={styles.heroPanel}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>

            <div className={styles.chipRow}>
              {chips.map((chip) => (
                <span className={styles.chip} key={chip}>{chip}</span>
              ))}
            </div>

            <div className={styles.spotlight}>
              <span className={styles.spotlightEyebrow}>{spotlightEyebrow}</span>
              <strong className={styles.spotlightTitle}>{spotlightTitle}</strong>
              <p className={styles.description}>{spotlightBody}</p>
            </div>

            <div className={styles.checklist}>
              {checklist.map((item) => (
                <div className={styles.checkItem} key={item}>{item}</div>
              ))}
            </div>
          </section>

          <section className={styles.formPanel}>{children}</section>
        </section>
      </main>
    </div>
  );
}
