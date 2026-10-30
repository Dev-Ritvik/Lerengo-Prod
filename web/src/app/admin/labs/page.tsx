import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { resolveLabsAppUrl } from "@/lib/app-url";
import {
  LABS_SCHEMA_HINT,
  LAB_IDEA_STAGES,
  LAB_PRIORITIES,
  LAB_SUBMISSION_STATUSES,
  formatLabValue,
  isMissingLabsBackend,
  type LabSubmissionRow,
} from "@/lib/labs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { reviewLabSubmission } from "./actions";
import shared from "../workspace.module.css";
import styles from "./labs.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "The selected ForgeGO review values are invalid.",
  save_failed: "Could not save the ForgeGO review update.",
  schema_missing: LABS_SCHEMA_HINT,
};

const SUCCESS_MESSAGES: Record<string, string> = {
  review_saved: "ForgeGO submission review saved.",
};

function getStatusClassName(status: LabSubmissionRow["status"]) {
  if (status === "rejected") {
    return `${shared.statusPill} ${shared.statusNegative}`;
  }

  if (status === "showcase") {
    return `${shared.statusPill} ${shared.statusPositive}`;
  }

  if (status === "accepted" || status === "active_build" || status.endsWith("_track")) {
    return `${shared.statusPill} ${shared.statusPositive}`;
  }

  return `${shared.statusPill} ${shared.statusWarning}`;
}

export const dynamic = "force-dynamic";

export default async function AdminLabsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();
  const labsUrl = resolveLabsAppUrl();

  const submissionsResult = await admin
    .from("lab_submissions")
    .select("*")
    .eq("university_id", appUser.university_id)
    .order("updated_at", { ascending: false });

  const schemaMissing = isMissingLabsBackend(submissionsResult.error);
  if (submissionsResult.error && !schemaMissing) {
    throw new Error(submissionsResult.error.message);
  }

  const submissions = schemaMissing ? [] : ((submissionsResult.data ?? []) as LabSubmissionRow[]);
  const submitterIds = [...new Set(submissions.map((item) => item.user_id))];

  const submittersResult =
    submitterIds.length > 0
      ? await admin
          .from("users")
          .select("id, full_name, email, department, program_domain, batch")
          .in("id", submitterIds)
      : { data: [], error: null };

  if (submittersResult.error && !schemaMissing) {
    throw new Error(submittersResult.error.message);
  }

  const submitterMap = new Map<string, Pick<UserRow, "id" | "full_name" | "email" | "department" | "program_domain" | "batch">>();
  for (const row of (submittersResult.data ?? []) as Pick<UserRow, "id" | "full_name" | "email" | "department" | "program_domain" | "batch">[]) {
    submitterMap.set(row.id, row);
  }

  const submittedCount = submissions.filter((item) => item.status === "submitted").length;
  const reviewCount = submissions.filter((item) => item.status === "under_review").length;
  const activeCount = submissions.filter((item) =>
    item.status === "accepted" || item.status === "active_build" || item.status.endsWith("_track"),
  ).length;
  const showcaseCount = submissions.filter((item) => item.status === "showcase").length;

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "ForgeGO review failed." : null;
  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] ?? "ForgeGO queue updated." : null;

  return (
    <main className={`shell ${shared.page}`}>
      <section className={shared.topbar}>
        <div className={shared.titleWrap}>
          <p className={shared.eyebrow}>Admin Workspace</p>
          <h1 className={shared.title}>ForgeGO Management</h1>
          <p className={shared.subtitle}>
            Review incoming ideas, classify serious submissions, and move accepted work into research,
            prototype, publication, patent, or showcase tracks for {appUser.campus_name ?? "your campus"}.
          </p>
        </div>
        <div className={shared.actions}>
          <Link className="button secondary small" href="/admin/surfaces">
            Switch lane
          </Link>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <a className="button secondary small" href={`${labsUrl}/labs`}>
            Live ForgeGO
          </a>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      {schemaMissing ? (
        <section className={shared.panel}>
          <div className={shared.emptyState}>
            <h3 className={shared.emptyStateTitle}>ForgeGO schema not applied yet</h3>
            <p className={shared.emptyStateBody}>{LABS_SCHEMA_HINT}</p>
          </div>
        </section>
      ) : (
        <>
          <section className={shared.statsGrid}>
            <article className={shared.statCard}>
              <span className={shared.statValue}>{submissions.length}</span>
              <span className={shared.statLabel}>Total submissions</span>
            </article>
            <article className={shared.statCard}>
              <span className={shared.statValue}>{submittedCount + reviewCount}</span>
              <span className={shared.statLabel}>Open review queue</span>
            </article>
            <article className={shared.statCard}>
              <span className={shared.statValue}>{activeCount}</span>
              <span className={shared.statLabel}>Active tracks</span>
            </article>
            <article className={shared.statCard}>
              <span className={shared.statValue}>{showcaseCount}</span>
              <span className={shared.statLabel}>Showcase ready</span>
            </article>
          </section>

          <section className={styles.layout}>
            <div className={styles.queueColumn}>
              <article className={shared.panel}>
                <div className={shared.sectionHeader}>
                  <h2 className={shared.sectionTitle}>ForgeGO review queue</h2>
                  <p className={shared.sectionSubtitle}>
                    Every card below is a real intake entry. Update status, priority, stage, assignment,
                    notes, and next step directly from this queue.
                  </p>
                </div>

                {submissions.length === 0 ? (
                  <div className={shared.emptyState}>
                    <h3 className={shared.emptyStateTitle}>No ForgeGO submissions yet</h3>
                    <p className={shared.emptyStateBody}>
                      Once verified users submit ideas from the ForgeGO intake flow, the queue appears here.
                    </p>
                  </div>
                ) : (
                  <div className={styles.queueStack}>
                    {submissions.map((submission) => {
                      const submitter = submitterMap.get(submission.user_id);

                      return (
                        <article className={styles.submissionCard} key={submission.id}>
                          <div className={styles.cardHeader}>
                            <div className={styles.cardTitleBlock}>
                              <h3 className={styles.cardTitle}>{submission.title}</h3>
                              <p className={styles.cardMeta}>
                                {submission.domain} / {submitter?.full_name ?? submitter?.email ?? "Unknown submitter"}
                              </p>
                            </div>
                            <span className={getStatusClassName(submission.status)}>
                              {formatLabValue(submission.status)}
                            </span>
                          </div>

                          <p className={styles.summary}>{submission.submission_summary}</p>
                          <p className={styles.problem}>{submission.problem_statement}</p>

                          <div className={shared.pillRow}>
                            <span className={shared.pill}>{formatLabValue(submission.idea_stage)}</span>
                            <span className={shared.pill}>{formatLabValue(submission.priority)}</span>
                            {submission.support_tracks.map((track) => (
                              <span className={shared.pill} key={`${submission.id}-${track}`}>
                                {formatLabValue(track)}
                              </span>
                            ))}
                            {submission.publication_interest ? <span className={shared.pill}>Publication interest</span> : null}
                            {submission.patent_interest ? <span className={shared.pill}>Patent interest</span> : null}
                          </div>

                          <div className={styles.metaGrid}>
                            <div className={styles.metaCard}>
                              <span className={styles.metaLabel}>Submitter</span>
                              <p className={styles.metaValue}>{submitter?.full_name ?? "Unnamed user"}</p>
                              <p className={styles.metaSubvalue}>{submitter?.email ?? "No email found"}</p>
                            </div>
                            <div className={styles.metaCard}>
                              <span className={styles.metaLabel}>Academic context</span>
                              <p className={styles.metaValue}>{submitter?.department ?? "Department not set"}</p>
                              <p className={styles.metaSubvalue}>
                                {[submitter?.program_domain, submitter?.batch].filter(Boolean).join(" / ") || "Program details not set"}
                              </p>
                            </div>
                            <div className={styles.metaCard}>
                              <span className={styles.metaLabel}>Links</span>
                              {submission.links.length > 0 ? (
                                <div className={styles.linkList}>
                                  {submission.links.map((link) => (
                                    <a className={styles.linkItem} href={link} key={link} rel="noreferrer" target="_blank">
                                      {link}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className={styles.metaSubvalue}>No links attached.</p>
                              )}
                            </div>
                          </div>

                          <form action={reviewLabSubmission}>
                            <input name="submissionId" type="hidden" value={submission.id} />
                            <div className={shared.formGrid}>
                              <label className={shared.formField}>
                                <span className={shared.formLabel}>Status</span>
                                <select className={shared.select} defaultValue={submission.status} name="status">
                                  {LAB_SUBMISSION_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {formatLabValue(status)}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className={shared.formField}>
                                <span className={shared.formLabel}>Priority</span>
                                <select className={shared.select} defaultValue={submission.priority} name="priority">
                                  {LAB_PRIORITIES.map((priority) => (
                                    <option key={priority} value={priority}>
                                      {formatLabValue(priority)}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className={shared.formField}>
                                <span className={shared.formLabel}>Idea stage</span>
                                <select className={shared.select} defaultValue={submission.idea_stage} name="ideaStage">
                                  {LAB_IDEA_STAGES.map((stage) => (
                                    <option key={stage} value={stage}>
                                      {formatLabValue(stage)}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className={shared.formField}>
                                <span className={shared.formLabel}>Assigned to</span>
                                <input className={shared.input} defaultValue={submission.assigned_to ?? ""} name="assignedTo" placeholder="Reviewer or mentor name" type="text" />
                              </label>

                              <label className={shared.formFieldFull}>
                                <span className={shared.formLabel}>Next step</span>
                                <input className={shared.input} defaultValue={submission.next_step ?? ""} name="nextStep" placeholder="Set the next concrete move for this idea." type="text" />
                              </label>

                              <label className={shared.formFieldFull}>
                                <span className={shared.formLabel}>Review notes</span>
                                <textarea className={shared.textarea} defaultValue={submission.review_notes ?? ""} name="reviewNotes" placeholder="Explain the decision, requested changes, or why the idea belongs in a specific track." />
                              </label>
                            </div>

                            <div className={shared.formFooter}>
                              <button className="button" type="submit">
                                Save review
                              </button>
                              <span className={shared.notice}>
                                Updated {new Date(submission.updated_at).toLocaleDateString("en-IN")}
                              </span>
                            </div>
                          </form>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>
            </div>

            <aside className={styles.sidebarColumn}>
              <article className={shared.surfaceCard}>
                <div className={shared.sectionHeader}>
                  <h2 className={shared.sectionTitle}>How to route ForgeGO work</h2>
                  <p className={shared.sectionSubtitle}>
                    ForgeGO should not become a generic suggestion box. Route work according to the strongest real outcome.
                  </p>
                </div>
                <div className={styles.guidanceList}>
                  <div className={styles.guidanceCard}>
                    <p className={styles.guidanceTitle}>Research track</p>
                    <p className={styles.guidanceBody}>Use when the novelty or problem framing is stronger than the build readiness.</p>
                  </div>
                  <div className={styles.guidanceCard}>
                    <p className={styles.guidanceTitle}>Active build</p>
                    <p className={styles.guidanceBody}>Use when the problem is clear, the team is capable, and execution can start now.</p>
                  </div>
                  <div className={styles.guidanceCard}>
                    <p className={styles.guidanceTitle}>Publication or patent</p>
                    <p className={styles.guidanceBody}>Use when the work has genuine paper or filing potential and needs structured support.</p>
                  </div>
                </div>
              </article>

              <article className={shared.surfaceCard}>
                <div className={shared.sectionHeader}>
                  <h2 className={shared.sectionTitle}>Queue signals</h2>
                  <p className={shared.sectionSubtitle}>
                    The strongest submissions usually show clarity, evidence, and a believable next step.
                  </p>
                </div>
                <div className={shared.pillRow}>
                  <span className={shared.pill}>Problem strength</span>
                  <span className={shared.pill}>Research potential</span>
                  <span className={shared.pill}>Prototype viability</span>
                  <span className={shared.pill}>Publication angle</span>
                  <span className={shared.pill}>Patent potential</span>
                  <span className={shared.pill}>Team readiness</span>
                </div>
              </article>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
