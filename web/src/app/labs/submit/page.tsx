import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/tenant";
import {
  LABS_SCHEMA_HINT,
  formatLabValue,
  isMissingLabsBackend,
  type LabSubmissionRow,
} from "@/lib/labs";
import type { Database } from "@/lib/supabase/types";
import styles from "./page.module.css";
import { submitLabIdea } from "./actions";
import { LabsSubmitWizard } from "./labs-submit-wizard";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Fill the title, domain, summary, problem statement, and current stage before submitting.",
  schema_missing: LABS_SCHEMA_HINT,
  submit_failed: "Could not submit the idea right now. Please retry.",
  support_required: "Choose at least one support track so the review team knows what help is needed.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  submitted: "Idea submitted. The ForgeGO review queue now has your intake entry.",
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];

function getStatusTone(status: LabSubmissionRow["status"]) {
  if (status === "rejected") {
    return styles.statusNegative;
  }

  if (status === "showcase") {
    return styles.statusPositive;
  }

  if (status === "accepted" || status === "active_build" || status.endsWith("_track")) {
    return styles.statusProgress;
  }

  return styles.statusNeutral;
}

export const dynamic = "force-dynamic";

export default async function LabsSubmitPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSessionUser();

  if (!session) {
    redirect("/signin?next=/labs/submit");
  }

  const profileResult = await session.supabase
    .from("users")
    .select("*")
    .eq("id", session.authUser.id)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  const profile = profileResult.data as UserRow | null;
  if (!profile?.university_id) {
    redirect("/onboarding/university?next=/labs/submit");
  }

  const submissionsResult = await session.supabase
    .from("lab_submissions")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const schemaMissing = isMissingLabsBackend(submissionsResult.error);
  if (submissionsResult.error && !schemaMissing) {
    throw new Error(submissionsResult.error.message);
  }

  const submissions = schemaMissing ? [] : ((submissionsResult.data ?? []) as LabSubmissionRow[]);
  const reviewableCount = submissions.filter((item) =>
    item.status === "submitted" || item.status === "under_review",
  ).length;
  const activeCount = submissions.filter((item) =>
    item.status === "accepted" ||
    item.status === "active_build" ||
    item.status.endsWith("_track"),
  ).length;

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "ForgeGO submission failed." : null;
  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] ?? "ForgeGO submission updated." : null;

  return (
    <div className={styles.viewport} data-page-viewport="true">
      <main className={styles.canvas}>
        <header className={styles.header}>
          <Link href="/labs" className={styles.brand} aria-label="LerenGO ForgeGO">
            <Image
              src="/logo.lerengo.embedded.svg"
              alt="LerenGO logo"
              width={562}
              height={303}
              className={styles.logoImage}
              priority
            />
          </Link>

          <div className={styles.headerActions}>
            <Link href="/labs" className={styles.ghostAction}>
              ForgeGO home
            </Link>
            <Link href="/" className={styles.ghostAction}>
              LerenGO home
            </Link>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>ForgeGO intake</span>
            <h1 className={styles.heroTitle}>Submit the idea once, then make the track visible.</h1>
            <p className={styles.heroBody}>
              This intake is for serious idea review, research support, publication direction,
              patent potential, and guided build work inside {profile.campus_name ?? "your campus"}.
            </p>
          </div>

          <div className={styles.heroStats}>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{submissions.length}</span>
              <span className={styles.statLabel}>Your submissions</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{reviewableCount}</span>
              <span className={styles.statLabel}>Awaiting review</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{activeCount}</span>
              <span className={styles.statLabel}>Active tracks</span>
            </article>
          </div>
        </section>

        {errorMessage ? <p className={`${styles.message} ${styles.error}`}>{errorMessage}</p> : null}
        {successMessage ? <p className={`${styles.message} ${styles.success}`}>{successMessage}</p> : null}

        <section className={styles.contentGrid}>
          <article className={styles.surface}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>Idea intake form</span>
              <h2 className={styles.sectionTitle}>Give the review team enough context to judge it properly.</h2>
              <p className={styles.sectionBody}>
                A clear problem statement is more useful than hype. Explain what the idea is,
                what stage it is in, and what kind of support you actually need.
              </p>
            </div>

            {schemaMissing ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyTitle}>ForgeGO backend not applied yet</h3>
                <p className={styles.emptyBody}>{LABS_SCHEMA_HINT}</p>
              </div>
            ) : (
              <LabsSubmitWizard submitAction={submitLabIdea} />
            )}
          </article>

          <aside className={styles.sidebar}>
            <article className={styles.surface}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionEyebrow}>What gets reviewed well</span>
                <h2 className={styles.sectionTitle}>Specificity beats excitement.</h2>
              </div>
              <div className={styles.infoList}>
                <div className={styles.infoCard}>
                  <h3 className={styles.infoTitle}>Problem clarity</h3>
                  <p className={styles.infoBody}>What exactly is broken, and for whom?</p>
                </div>
                <div className={styles.infoCard}>
                  <h3 className={styles.infoTitle}>Execution honesty</h3>
                  <p className={styles.infoBody}>State what your team can already do and where guidance is still needed.</p>
                </div>
                <div className={styles.infoCard}>
                  <h3 className={styles.infoTitle}>Outcome direction</h3>
                  <p className={styles.infoBody}>Say whether this is headed toward research, prototype, publication, patent, or showcase.</p>
                </div>
              </div>
            </article>

            <article className={styles.surface}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionEyebrow}>Your queue</span>
                <h2 className={styles.sectionTitle}>Track what already moved into ForgeGO.</h2>
              </div>

              {submissions.length === 0 ? (
                <div className={styles.emptyState}>
                  <h3 className={styles.emptyTitle}>No submissions yet</h3>
                  <p className={styles.emptyBody}>Your first intake will appear here with its review status and next step.</p>
                </div>
              ) : (
                <div className={styles.submissionList}>
                  {submissions.map((submission) => (
                    <article className={styles.submissionCard} key={submission.id}>
                      <div className={styles.submissionTop}>
                        <div>
                          <h3 className={styles.submissionTitle}>{submission.title}</h3>
                          <p className={styles.submissionMeta}>{submission.domain}</p>
                        </div>
                        <span className={`${styles.statusPill} ${getStatusTone(submission.status)}`}>
                          {formatLabValue(submission.status)}
                        </span>
                      </div>

                      <p className={styles.submissionSummary}>{submission.submission_summary}</p>

                      <div className={styles.pillRow}>
                        <span className={styles.pill}>{formatLabValue(submission.idea_stage)}</span>
                        {submission.support_tracks.map((track) => (
                          <span className={styles.pill} key={`${submission.id}-${track}`}>
                            {formatLabValue(track)}
                          </span>
                        ))}
                      </div>

                      {submission.next_step ? (
                        <p className={styles.nextStep}>
                          <strong>Next step:</strong> {submission.next_step}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
