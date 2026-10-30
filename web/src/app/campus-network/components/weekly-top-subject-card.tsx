import { TransitionLink } from "@/components/transition-link";
import type { WeeklyTopSubjectData } from "../analytics";
import styles from "../page.module.css";

type Props = {
  data: WeeklyTopSubjectData;
};

export function WeeklyTopSubjectCard({ data }: Props) {
  return (
    <article className={styles.weeklyCard}>
      <header className={styles.weeklyCardHeader}>
        <p className={styles.weeklyCardTitle}>Top Updated Subject</p>
      </header>

      <div className={styles.weeklyCardBody}>
        <h3 className={styles.weeklyMainText}>{data.subjectName}</h3>
        <ul className={styles.topicList}>
          {data.topics.slice(0, 3).map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </div>

      <footer className={styles.weeklyCardFooter}>
        <span className={styles.metaPill}>{data.newNotes} New Notes</span>
        <TransitionLink className={styles.cardActionBtn} href={data.ctaHref}>
          {data.ctaLabel}
        </TransitionLink>
      </footer>
    </article>
  );
}
