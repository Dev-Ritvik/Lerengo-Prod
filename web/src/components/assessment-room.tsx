"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { AssessmentReport } from "@/lib/assessment-reporting";
import styles from "./assessment-room.module.css";

type AssessmentRoomQuestion = {
  id: string;
  options: Array<{
    id: string;
    label: string;
  }>;
  prompt: string;
};

type CertificateState = {
  certificateNumber: string;
  href: string;
  issuedAt: string;
  title: string;
};

type AssessmentResponse = {
  certificate?: CertificateState | null;
  error?: string;
  passed?: boolean;
  report?: AssessmentReport;
  scorePercent?: number;
  success?: boolean;
};

type Props = {
  backHref: string;
  backLabel: string;
  certificate: CertificateState | null;
  eyebrow: string;
  initialAttemptCount: number;
  initialLatestPassed: boolean | null;
  initialLatestScorePercent: number | null;
  initialReport: AssessmentReport | null;
  lockedBody?: string;
  lockedTitle?: string;
  maxAttempts: number;
  passPercent: number;
  questions: AssessmentRoomQuestion[];
  submitEndpoint: string;
  submitLabel: string;
  subtitle: string;
  timerMinutes: number;
  title: string;
};

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(Math.max(totalSeconds, 0) / 60);
  const seconds = Math.max(totalSeconds, 0) % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCertificateDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AssessmentRoom({
  backHref,
  backLabel,
  certificate,
  eyebrow,
  initialAttemptCount,
  initialLatestPassed,
  initialLatestScorePercent,
  initialReport,
  lockedBody,
  lockedTitle,
  maxAttempts,
  passPercent,
  questions,
  submitEndpoint,
  submitLabel,
  subtitle,
  timerMinutes,
  title,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [latestPassed, setLatestPassed] = useState(initialLatestPassed);
  const [latestScorePercent, setLatestScorePercent] = useState(initialLatestScorePercent);
  const [report, setReport] = useState<AssessmentReport | null>(initialReport);
  const [certificateState, setCertificateState] = useState<CertificateState | null>(certificate);
  const [error, setError] = useState<string | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [hasSubmittedCurrentAttempt, setHasSubmittedCurrentAttempt] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(timerMinutes * 60);
  const [isPending, startTransition] = useTransition();

  const answersComplete = questions.every((question) => answers[question.id]);
  const attemptsExhausted = attemptCount >= maxAttempts && !certificateState && !hasSubmittedCurrentAttempt;
  const isLocked = Boolean(lockedTitle || lockedBody || attemptsExhausted);
  const canSubmit =
    !isLocked &&
    !certificateState &&
    !hasSubmittedCurrentAttempt &&
    !isPending &&
    attemptCount < maxAttempts &&
    (answersComplete || timeExpired);

  useEffect(() => {
    if (isLocked || certificateState || hasSubmittedCurrentAttempt || attemptCount >= maxAttempts) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setTimeExpired(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [attemptCount, certificateState, hasSubmittedCurrentAttempt, isLocked, maxAttempts]);

  const statusLabel = useMemo(() => {
    if (certificateState) {
      return "Certificate issued";
    }

    if (hasSubmittedCurrentAttempt) {
      return latestPassed ? "Passed" : "Submitted";
    }

    if (attemptCount >= maxAttempts) {
      return "Attempts exhausted";
    }

    if (timeExpired) {
      return "Time expired";
    }

    return "Exam room live";
  }, [attemptCount, certificateState, hasSubmittedCurrentAttempt, latestPassed, maxAttempts, timeExpired]);

  function resetAttempt() {
    setAnswers({});
    setError(null);
    setHasSubmittedCurrentAttempt(false);
    setTimeExpired(false);
    setSecondsRemaining(timerMinutes * 60);
  }

  function handleSubmit() {
    setError(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch(submitEndpoint, {
          body: JSON.stringify({ answers }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = (await response.json().catch(() => null)) as AssessmentResponse | null;
        if (!response.ok || !payload?.success) {
          setError(payload?.error ?? "Could not submit this test.");
          return;
        }

        setAttemptCount((current) => current + 1);
        setLatestPassed(payload.passed ?? false);
        setLatestScorePercent(payload.scorePercent ?? 0);
        setReport(payload.report ?? null);
        setCertificateState(payload.certificate ?? null);
        setHasSubmittedCurrentAttempt(true);
      })();
    });
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <div className={styles.pillRow}>
            <span className={styles.pill}>{timerMinutes} min</span>
            <span className={styles.pill}>Pass at {passPercent}%</span>
            <span className={styles.pill}>
              {attemptCount}/{maxAttempts} attempts used
            </span>
            <span className={styles.pill}>{statusLabel}</span>
          </div>
        </div>

        <div className={styles.heroActions}>
          <Link className={styles.backLink} href={backHref}>
            {backLabel}
          </Link>
        </div>
      </section>

      <section className={styles.layout}>
        <section className={styles.examPanel}>
          {isLocked ? (
            <div className={styles.lockedCard}>
              <h2>{lockedTitle ?? (attemptsExhausted ? "Attempts exhausted" : "Test unavailable")}</h2>
              <p>
                {lockedBody ??
                  (attemptsExhausted
                    ? "You have used every allowed attempt for this test. The latest report is still visible in the sidebar."
                    : "This test is not available for this account yet.")}
              </p>
            </div>
          ) : certificateState ? (
            <div className={styles.lockedCard}>
              <h2>{certificateState.title}</h2>
              <p>
                Certificate {certificateState.certificateNumber} was issued on{" "}
                {formatCertificateDate(certificateState.issuedAt)}.
              </p>
              <Link className={styles.primaryAction} href={certificateState.href}>
                Open certificate
              </Link>
            </div>
          ) : (
            <div className={styles.questionList}>
              {questions.map((question, questionIndex) => (
                <article className={styles.questionCard} key={question.id}>
                  <div className={styles.questionTopRow}>
                    <span className={styles.questionIndex}>Question {questionIndex + 1}</span>
                  </div>
                  <h2 className={styles.questionPrompt}>{question.prompt}</h2>
                  <div className={styles.optionList}>
                    {question.options.map((option) => (
                      <label className={styles.optionCard} key={option.id}>
                        <input
                          checked={answers[question.id] === option.id}
                          disabled={hasSubmittedCurrentAttempt || isPending}
                          name={question.id}
                          onChange={() =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: option.id,
                            }))
                          }
                          type="radio"
                          value={option.id}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.reportPanel}>
          <article className={styles.sidebarCard}>
            <span className={styles.sidebarEyebrow}>Timer</span>
            <strong className={styles.timerValue}>{formatTimer(secondsRemaining)}</strong>
            <p className={styles.sidebarCopy}>
              {timeExpired
                ? "Time is up. You can still submit the current answers as an expired attempt."
                : "Stay in this room until the attempt is submitted."}
            </p>
          </article>

          <article className={styles.sidebarCard}>
            <span className={styles.sidebarEyebrow}>Latest result</span>
            <strong className={styles.scoreValue}>
              {latestScorePercent !== null ? `${latestScorePercent}%` : "No score yet"}
            </strong>
            <p className={styles.sidebarCopy}>
              {latestPassed === null
                ? "No attempt submitted yet."
                : latestPassed
                  ? "The last attempt cleared the pass threshold."
                  : "The last attempt did not clear the pass threshold yet."}
            </p>
            {report ? (
              <div className={styles.reportBlock}>
                <span className={styles.reportBadge}>{report.badgeLabel}</span>
                <p className={styles.reportSummary}>{report.summary}</p>
                {report.rank ? (
                  <p className={styles.reportMeta}>
                    Rank #{report.rank} among {report.participantCount} learners
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>

          {!isLocked && !certificateState ? (
            <article className={styles.sidebarCard}>
              <span className={styles.sidebarEyebrow}>Submit</span>
              <button
                className={styles.primaryAction}
                disabled={!canSubmit}
                onClick={handleSubmit}
                type="button"
              >
                {isPending ? "Submitting..." : submitLabel}
              </button>
              {!answersComplete && !timeExpired ? (
                <p className={styles.sidebarCopy}>Answer every question before the main submit button unlocks.</p>
              ) : null}
              {hasSubmittedCurrentAttempt && attemptCount < maxAttempts && !certificateState ? (
                <button className={styles.secondaryAction} onClick={resetAttempt} type="button">
                  Start another attempt
                </button>
              ) : null}
              {error ? <p className={styles.errorText}>{error}</p> : null}
            </article>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
