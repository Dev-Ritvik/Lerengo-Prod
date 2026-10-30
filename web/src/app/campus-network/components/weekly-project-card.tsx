import { TransitionLink } from "@/components/transition-link";
import type { WeeklyProjectData } from "../analytics";
import styles from "../page.module.css";

type Props = {
  data: WeeklyProjectData;
};

export function WeeklyProjectCard({ data }: Props) {
  return (
    <article className={styles.weeklyCard}>
      <header className={styles.weeklyCardHeader}>
        <p className={styles.weeklyCardTitle}>Project Spotlight</p>
      </header>

      <div className={styles.weeklyCardBody}>
        <div aria-hidden="true" className={styles.projectMedia} />
        <h3 className={styles.weeklyMainText}>{data.title}</h3>
        <p className={styles.projectBody}>{data.description}</p>
        <div className={styles.projectMetaRow}>
          <span className={styles.metaPill}>{data.teamSizeLabel}</span>
          <span className={styles.tagPill}>{data.domainTag}</span>
        </div>
      </div>

      <footer className={styles.weeklyCardFooter}>
        <TransitionLink className={styles.cardActionBtn} href={data.ctaHref}>
          {data.ctaLabel}
        </TransitionLink>
      </footer>
    </article>
  );
}
