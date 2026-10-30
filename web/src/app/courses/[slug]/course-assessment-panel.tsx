"use client";

import Link from "next/link";
import type { CourseAssessmentSummary, CourseCertificateSummary } from "@/lib/courses";
import styles from "./page.module.css";

type Props = {
  assessment: CourseAssessmentSummary | null;
  certificate: CourseCertificateSummary | null;
  courseSlug: string;
  hasAccess: boolean;
};

export function CourseAssessmentPanel({
  assessment,
  certificate,
  courseSlug,
  hasAccess,
}: Props) {
  if (!assessment) {
    return (
      <section className={styles.panel}>
        <div className={styles.sectionHeaderCompact}>
          <span className={styles.sectionEyebrow}>Final assessment</span>
          <h2 className={styles.panelTitle}>Assessment setup is still empty.</h2>
        </div>
        <p className={styles.panelBody}>
          Add questions in the course backend to activate the certificate test for this path.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeaderCompact}>
        <span className={styles.sectionEyebrow}>Final assessment</span>
        <h2 className={styles.panelTitle}>{assessment.title}</h2>
      </div>

      <div className={styles.assessmentMeta}>
        <span className={styles.signalPill}>{assessment.durationMinutes} min</span>
        <span className={styles.signalPill}>Pass at {assessment.passPercent}%</span>
        <span className={styles.signalPill}>
          {assessment.attemptCount}/{assessment.maxAttempts} attempts used
        </span>
        {assessment.latestScorePercent !== null ? (
          <span className={styles.signalPill}>Latest score {assessment.latestScorePercent}%</span>
        ) : null}
        {assessment.report?.rank ? (
          <span className={styles.signalPill}>Rank #{assessment.report.rank}</span>
        ) : null}
        {assessment.report ? (
          <span className={styles.signalPill}>{assessment.report.badgeLabel}</span>
        ) : null}
      </div>

      <p className={styles.panelBody}>
        {assessment.summary ??
          "Move into the isolated test room to complete the graded course check and unlock your certificate."}
      </p>

      {!hasAccess ? (
        <div className={styles.assessmentLocked}>
          <h3>Purchase required before the final test opens</h3>
          <p>
            This assessment stays locked until the paid course purchase is confirmed for your account.
          </p>
        </div>
      ) : certificate ? (
        <div className={styles.assessmentLocked}>
          <h3>{certificate.title}</h3>
          <p>
            Certificate {certificate.certificateNumber} was issued on{" "}
            {new Date(certificate.issuedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            .
          </p>
          <Link className={styles.inlineAction} href={certificate.href}>
            Open certificate
          </Link>
        </div>
      ) : (
        <div className={styles.assessmentRoomCard}>
          <h3>Dedicated test environment</h3>
          <p>
            Start the final assessment in a focused room built for timed answering, score reporting,
            ranking, and badge feedback.
          </p>
          <Link className={styles.inlineAction} href={`/courses/${courseSlug}/test`}>
            Open isolated test mode
          </Link>
        </div>
      )}
    </section>
  );
}
