import { TransitionLink } from "@/components/transition-link";
import type { WeeklyExamData } from "../analytics";
import styles from "../page.module.css";

type Props = {
  data: WeeklyExamData;
};

export function WeeklyExamCard({ data }: Props) {
  return (
    <article className={styles.weeklyCard}>
      <header className={styles.weeklyCardHeader}>
        <p className={styles.weeklyCardTitle}>Upcoming Exam Prep</p>
      </header>

      <div className={styles.weeklyCardBody}>
        <h3 className={styles.weeklyMainText}>{data.countdownLabel}</h3>
        <p className={styles.examLabel}>{data.examLabel} exam pack</p>
        <ul className={styles.topicList}>
          {data.revisionHighlights.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <footer className={styles.weeklyCardFooter}>
        <TransitionLink className={styles.cardActionBtn} href={data.ctaHref}>
          {data.ctaLabel}
        </TransitionLink>
      </footer>
    </article>
  );
}
