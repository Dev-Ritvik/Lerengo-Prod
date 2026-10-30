import { TransitionLink } from "@/components/transition-link";
import type { WeeklyDiscussionData } from "../analytics";
import styles from "../page.module.css";

type Props = {
  data: WeeklyDiscussionData;
};

export function WeeklyDiscussionCard({ data }: Props) {
  return (
    <article className={styles.weeklyCard}>
      <header className={styles.weeklyCardHeader}>
        <p className={styles.weeklyCardTitle}>Most Active Discussion</p>
      </header>

      <div className={styles.weeklyCardBody}>
        <span className={styles.tagPill}>#{data.subjectTag}</span>
        <h3 className={styles.weeklyMainText}>{data.discussionTitle}</h3>
        <p className={styles.discussionCount}>{data.replies} replies this week</p>
        <div className={styles.contributorRow}>
          <span aria-hidden="true" className={styles.avatar}>
            {data.contributorInitials}
          </span>
          <p className={styles.contributorName}>{data.contributorName}</p>
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
