import styles from "./info-page-loading.module.css";

export default function InfoPageLoading() {
  return (
    <div className={styles.viewport} role="status" aria-live="polite" aria-label="Loading page">
      <main className={styles.canvas}>
        <div className={styles.container}>
          <div className={styles.topBar} />
          <div className={styles.heroLine} />
          <div className={styles.heroBlock} />
          <div className={styles.grid}>
            <div className={styles.card} />
            <div className={styles.card} />
          </div>
          <div className={styles.buttonRow}>
            <div className={styles.button} />
          </div>
        </div>
      </main>
    </div>
  );
}
