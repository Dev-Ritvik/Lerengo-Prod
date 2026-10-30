import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { DEFAULT_DEPARTMENTS, DEFAULT_DOMAINS, SEMESTER_OPTIONS } from "@/lib/academics";
import {
  formatStructuredNoteAssessmentQuestionsForTextarea,
  normalizeStructuredNoteContent,
  resolveStructuredNoteAssessmentBundle,
} from "@/lib/note-content";
import { getOfferSemesterLabel } from "@/lib/note-offers";
import { resolveAssessmentBadge } from "@/lib/assessment-reporting";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PublishActionArea } from "./publish-action-area";
import { StructuredNoteUnitFields } from "./structured-note-unit-fields";
import {
  archiveNote,
  deleteNote,
  toggleNoteVerification,
  updateNoteMetadata,
  uploadNote,
} from "./actions";
import styles from "../workspace.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  archive_failed: "Could not update the archive state for this note.",
  delete_failed: "Could not delete the note record.",
  file_must_be_pdf: "Only PDF uploads are allowed.",
  invalid_input: "One or more note fields are invalid.",
  invalid_assessment_questions: "Test questions must be valid JSON with prompt, options, and correctOptionId.",
  note_not_found: "The note could not be found in this campus scope.",
  save_failed: "Could not save the note or its metadata.",
  unit_content_required: "Add at least one unit with notes, revision points, mind map branches, or PYQs.",
  upload_failed: "Could not upload the PDF to private storage.",
  verification_failed: "Could not update note verification state.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  archived: "Note archived successfully.",
  deleted: "Note deleted successfully.",
  metadata_saved: "Note metadata updated.",
  restored: "Note restored to the live catalog.",
  uploaded: "Note uploaded and published successfully.",
  verification_saved: "Verification state updated.",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    style: "currency",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminNotesPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [
    { data: university, error: universityError },
    { data: notes, error: notesError },
    { data: noteAttempts, error: noteAttemptsError },
    { data: campusUsers, error: campusUsersError },
  ] =
    await Promise.all([
      supabase.from("universities").select("id, name").eq("id", appUser.university_id).maybeSingle(),
      supabase
        .from("notes")
        .select(
          "id, title, subject, department, program_domain, semester, description, file_path, content_json, video_url, price_inr, is_verified, archived_at, archived_by, created_at, updated_at",
        )
        .eq("university_id", appUser.university_id)
        .order("archived_at", { ascending: true, nullsFirst: true })
        .order("updated_at", { ascending: false }),
      admin
        .from("note_assessment_attempts")
        .select("id, note_id, user_id, score_percent, passed, submitted_at, university_id")
        .eq("university_id", appUser.university_id)
        .order("submitted_at", { ascending: false }),
      admin
        .from("users")
        .select("id, full_name, email")
        .eq("university_id", appUser.university_id)
        .eq("verified", true),
    ]);

  if (universityError || notesError || noteAttemptsError || campusUsersError) {
    throw new Error(
      universityError?.message ||
        notesError?.message ||
        noteAttemptsError?.message ||
        campusUsersError?.message ||
        "Failed to load notes admin.",
    );
  }

  const allNotes = (notes ?? []) as any[];
  const allAttempts = (noteAttempts ?? []) as any[];
  const liveNotes = allNotes.filter((note: any) => !note.archived_at);
  const archivedNotes = allNotes.filter((note: any) => Boolean(note.archived_at));
  const publishedNotes = liveNotes.filter((note: any) => note.is_verified);
  const unpublishedNotes = liveNotes.filter((note: any) => !note.is_verified);
  const usersById = new Map(
    ((campusUsers ?? []) as any[]).map((user: any) => [
      user.id,
      user.full_name?.trim() || user.email,
    ]),
  );
  const attemptsByNoteId = new Map<string, any[]>();
  for (const attempt of allAttempts) {
    const bucket = attemptsByNoteId.get(attempt.note_id) ?? [];
    bucket.push(attempt);
    attemptsByNoteId.set(attempt.note_id, bucket);
  }
  const notesWithAssessments = liveNotes.filter((note: any) =>
    Boolean(resolveStructuredNoteAssessmentBundle(note.content_json, note.title)),
  ).length;
  const notesById = new Map(allNotes.map((note: any) => [note.id, note]));
  const bestAttemptByUser = new Map<string, any>();
  for (const attempt of allAttempts) {
    const current = bestAttemptByUser.get(attempt.user_id);
    if (
      !current ||
      attempt.score_percent > current.score_percent ||
      (attempt.score_percent === current.score_percent &&
        new Date(attempt.submitted_at).getTime() < new Date(current.submitted_at).getTime())
    ) {
      bestAttemptByUser.set(attempt.user_id, attempt);
    }
  }
  const topTestPerformers = Array.from(bestAttemptByUser.values())
    .sort((left, right) => {
      if (right.score_percent !== left.score_percent) {
        return right.score_percent - left.score_percent;
      }

      return new Date(left.submitted_at).getTime() - new Date(right.submitted_at).getTime();
    })
    .slice(0, 5);

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "Note action failed." : null;
  const successMessage = params.success
    ? SUCCESS_MESSAGES[params.success] ?? "Notes updated."
    : null;

  return (
    <main className={`shell ${styles.page}`}>
      <section className={styles.topbar}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.title}>Notes Management</h1>
          <p className={styles.subtitle}>
            Upload verified notes, correct metadata, unpublish weak material, archive old PDFs, and
            delete bad uploads for {university?.name ?? "your campus"}.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/browse-notes">
            Browse Notes
          </Link>
          <Link className="button secondary small" href="/admin/payments">
            Payments
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{liveNotes.length}</span>
          <span className={styles.statLabel}>Live notes</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{publishedNotes.length}</span>
          <span className={styles.statLabel}>Published and visible</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{unpublishedNotes.length}</span>
          <span className={styles.statLabel}>Unpublished notes</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{archivedNotes.length}</span>
          <span className={styles.statLabel}>Archived notes</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{notesWithAssessments}</span>
          <span className={styles.statLabel}>Notes with tests</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{allAttempts.length}</span>
          <span className={styles.statLabel}>Test attempts</span>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Upload and Publish</h2>
          <p className={styles.sectionSubtitle}>
            Publish a unit-wise note reader with detailed notes, revision points, mind maps, PYQs,
            optional video, and an optional reference PDF. Launch offer: paid notes in{" "}
            {getOfferSemesterLabel()} are free to access.
          </p>
        </div>

        <form action={uploadNote} encType="multipart/form-data">
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Note title</span>
              <input className={styles.input} name="title" required type="text" />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Subject</span>
              <input
                className={styles.input}
                name="subject"
                placeholder="Operating Systems"
                required
                type="text"
              />
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Department</span>
              <select className={styles.select} defaultValue={appUser.department ?? ""} name="department" required>
                <option disabled value="">
                  Select department
                </option>
                {DEFAULT_DEPARTMENTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Program / Domain</span>
              <select className={styles.select} defaultValue={appUser.program_domain ?? ""} name="programDomain" required>
                <option disabled value="">
                  Select program
                </option>
                {DEFAULT_DOMAINS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Semester</span>
              <select className={styles.select} name="semester" required>
                <option disabled value="">
                  Select semester
                </option>
                {SEMESTER_OPTIONS.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span className={styles.formLabel}>Price (INR)</span>
              <input className={styles.input} defaultValue={49} min={0} name="priceInr" required step={1} type="number" />
            </label>
            <label className={styles.formFieldFull}>
              <span className={styles.formLabel}>Description</span>
              <textarea
                className={styles.textarea}
                name="description"
                placeholder="Unit-wise summary, teaching source, or revision scope."
              />
            </label>
            <label className={styles.formFieldFull}>
              <span className={styles.formLabel}>Overview</span>
              <textarea
                className={styles.textarea}
                name="overview"
                placeholder="What should the student understand first before reading the note in depth?"
              />
            </label>
            <label className={styles.formFieldFull}>
              <span className={styles.formLabel}>Video URL</span>
              <input
                className={styles.input}
                name="videoUrl"
                placeholder="YouTube, Loom, or Vimeo link"
                type="url"
              />
            </label>
            <div className={styles.formFieldFull}>
              <span className={styles.formLabel}>Unit reader content</span>
              <StructuredNoteUnitFields units={[]} />
            </div>
            <details className={styles.detailsBlock}>
              <summary className={styles.detailsSummary}>Note test setup (optional)</summary>
              <div className={styles.detailsBody}>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Test title</span>
                    <input className={styles.input} name="assessmentTitle" placeholder="Operating Systems Unit Test" type="text" />
                  </label>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Duration minutes</span>
                    <input className={styles.input} defaultValue={18} min={5} name="assessmentDurationMinutes" type="number" />
                  </label>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Pass percent</span>
                    <input className={styles.input} defaultValue={70} min={1} name="assessmentPassPercent" type="number" />
                  </label>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Max attempts</span>
                    <input className={styles.input} defaultValue={3} min={1} name="assessmentMaxAttempts" type="number" />
                  </label>
                  <label className={styles.formFieldFull}>
                    <span className={styles.formLabel}>Test summary</span>
                    <input className={styles.input} name="assessmentSummary" placeholder="Short exam room for checking concept retention after reading the note." type="text" />
                  </label>
                  <label className={styles.formFieldFull}>
                    <span className={styles.formLabel}>Questions JSON</span>
                    <textarea
                      className={styles.textarea}
                      defaultValue="[]"
                      name="assessmentQuestionsJson"
                      placeholder='[{"id":"q1","prompt":"Question text","options":[{"id":"a","label":"Option A"},{"id":"b","label":"Option B"}],"correctOptionId":"a"}]'
                    />
                  </label>
                </div>
              </div>
            </details>
            <label className={styles.formFieldFull}>
              <span className={styles.formLabel}>Reference PDF (optional)</span>
              <input accept="application/pdf" className={styles.input} name="pdfFile" type="file" />
            </label>
          </div>
          <div className={styles.formFooter}>
            <p className={styles.notice}>Only verified campus admins should upload notes here.</p>
            <PublishActionArea />
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Top Test Performers</h2>
          <p className={styles.sectionSubtitle}>
            Use live attempt data to identify strong learners across note-based tests on this campus.
          </p>
        </div>

        {topTestPerformers.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>No test attempts yet</h3>
            <p className={styles.emptyStateBody}>
              Once learners start using note tests, the highest-scoring students will appear here with their note, score, and earned badge.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Note</th>
                  <th>Score</th>
                  <th>Badge</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topTestPerformers.map((attempt: any) => {
                  const note = notesById.get(attempt.note_id);
                  const badge = resolveAssessmentBadge(attempt.score_percent, attempt.passed);

                  return (
                    <tr key={attempt.id}>
                      <td>
                        <p className={styles.primaryText}>{usersById.get(attempt.user_id) ?? "Campus learner"}</p>
                      </td>
                      <td>
                        <p className={styles.primaryText}>{note?.title ?? "Unknown note"}</p>
                        <p className={styles.mutedText}>{note?.subject ?? "No subject"}</p>
                      </td>
                      <td>{attempt.score_percent}%</td>
                      <td>
                        <span className={styles.pill}>{badge.label}</span>
                      </td>
                      <td>
                        <span className={`${styles.statusPill} ${attempt.passed ? styles.statusPositive : styles.statusWarning}`}>
                          {attempt.passed ? "Passed" : "Practice needed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Live Catalog Control</h2>
          <p className={styles.sectionSubtitle}>
            Edit note metadata inline, then publish, unpublish, archive, or permanently delete.
          </p>
        </div>

        {liveNotes.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>No live notes yet</h3>
            <p className={styles.emptyStateBody}>
              Once verified PDFs are uploaded and published, they will appear here for
              metadata control, verification changes, and archive actions.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Note</th>
                  <th>Academic mapping</th>
                  <th>Test</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Metadata</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveNotes.map((note: any) => {
                  const formId = `note-${note.id}`;
                  const assessmentBundle = resolveStructuredNoteAssessmentBundle(note.content_json, note.title);
                  const content = normalizeStructuredNoteContent(note.content_json, {
                    description: note.description,
                    semester: note.semester,
                    subject: note.subject,
                    title: note.title,
                    videoUrl: note.video_url,
                  });
                  const noteAttemptRows = attemptsByNoteId.get(note.id) ?? [];
                  const topScore =
                    noteAttemptRows.length > 0
                      ? Math.max(...noteAttemptRows.map((attempt: any) => attempt.score_percent))
                      : null;
                  return (
                    <tr key={note.id}>
                      <td>
                        <p className={styles.primaryText}>{note.title}</p>
                        <p className={styles.mutedText}>{note.subject ?? "No subject"}</p>
                        <p className={styles.mutedText}>Updated {formatDate(note.updated_at)}</p>
                      </td>
                      <td>
                        <div className={styles.pillRow}>
                          {note.department ? <span className={styles.pill}>{note.department}</span> : null}
                          {note.program_domain ? <span className={styles.pill}>{note.program_domain}</span> : null}
                          {note.semester ? <span className={styles.pill}>Semester {note.semester}</span> : null}
                        </div>
                      </td>
                      <td>
                        {assessmentBundle ? (
                          <div className={styles.stack}>
                            <span className={styles.statusPill}>Configured</span>
                            <span className={styles.notice}>{assessmentBundle.questions.length} questions</span>
                            <span className={styles.notice}>{noteAttemptRows.length} attempts</span>
                            {topScore !== null ? <span className={styles.notice}>Top score {topScore}%</span> : null}
                          </div>
                        ) : (
                          <span className={styles.notice}>No test configured</span>
                        )}
                      </td>
                      <td>{formatCurrency(note.price_inr)}</td>
                      <td>
                        <span className={`${styles.statusPill} ${note.is_verified ? styles.statusPositive : styles.statusWarning}`}>
                          {note.is_verified ? "Published" : "Unpublished"}
                        </span>
                      </td>
                      <td>
                        <form action={updateNoteMetadata} className={styles.stack} id={formId}>
                          <input name="noteId" type="hidden" value={note.id} />
                          <input className={styles.input} defaultValue={note.title} name="title" type="text" />
                          <input className={styles.input} defaultValue={note.subject ?? ""} name="subject" type="text" />
                          <div className={styles.formGrid}>
                            <select className={styles.select} defaultValue={note.department ?? ""} name="department">
                              <option disabled value="">
                                Select department
                              </option>
                              {DEFAULT_DEPARTMENTS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <select className={styles.select} defaultValue={note.program_domain ?? ""} name="programDomain">
                              <option disabled value="">
                                Select program
                              </option>
                              {DEFAULT_DOMAINS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <select className={styles.select} defaultValue={note.semester?.toString() ?? ""} name="semester">
                              <option disabled value="">
                                Select semester
                              </option>
                              {SEMESTER_OPTIONS.map((semester) => (
                                <option key={semester} value={semester}>
                                  Semester {semester}
                                </option>
                              ))}
                            </select>
                            <input className={styles.input} defaultValue={note.price_inr} min={0} name="priceInr" type="number" />
                          </div>
                          <textarea className={styles.textarea} defaultValue={note.description ?? ""} name="description" />
                          <details className={styles.detailsBlock}>
                            <summary className={styles.detailsSummary}>Structured note content</summary>
                            <div className={styles.detailsBody}>
                              <textarea
                                className={styles.textarea}
                                defaultValue={content.overview}
                                name="overview"
                                placeholder="High-level summary"
                              />
                              <input
                                className={styles.input}
                                defaultValue={content.videoUrl ?? note.video_url ?? ""}
                                name="videoUrl"
                                placeholder="YouTube, Loom, or Vimeo URL"
                                type="url"
                              />
                              <StructuredNoteUnitFields units={content.units} />
                              <div className={styles.formGrid}>
                                <label className={styles.formField}>
                                  <span className={styles.formLabel}>Test title</span>
                                  <input
                                    className={styles.input}
                                    defaultValue={assessmentBundle?.title ?? ""}
                                    name="assessmentTitle"
                                    type="text"
                                  />
                                </label>
                                <label className={styles.formField}>
                                  <span className={styles.formLabel}>Duration minutes</span>
                                  <input
                                    className={styles.input}
                                    defaultValue={assessmentBundle?.durationMinutes ?? 18}
                                    min={5}
                                    name="assessmentDurationMinutes"
                                    type="number"
                                  />
                                </label>
                                <label className={styles.formField}>
                                  <span className={styles.formLabel}>Pass percent</span>
                                  <input
                                    className={styles.input}
                                    defaultValue={assessmentBundle?.passPercent ?? 70}
                                    min={1}
                                    name="assessmentPassPercent"
                                    type="number"
                                  />
                                </label>
                                <label className={styles.formField}>
                                  <span className={styles.formLabel}>Max attempts</span>
                                  <input
                                    className={styles.input}
                                    defaultValue={assessmentBundle?.maxAttempts ?? 3}
                                    min={1}
                                    name="assessmentMaxAttempts"
                                    type="number"
                                  />
                                </label>
                                <label className={styles.formFieldFull}>
                                  <span className={styles.formLabel}>Test summary</span>
                                  <input
                                    className={styles.input}
                                    defaultValue={assessmentBundle?.summary ?? ""}
                                    name="assessmentSummary"
                                    type="text"
                                  />
                                </label>
                                <label className={styles.formFieldFull}>
                                  <span className={styles.formLabel}>Questions JSON</span>
                                  <textarea
                                    className={styles.textarea}
                                    defaultValue={formatStructuredNoteAssessmentQuestionsForTextarea(assessmentBundle)}
                                    name="assessmentQuestionsJson"
                                  />
                                </label>
                              </div>
                            </div>
                          </details>
                        </form>
                      </td>
                      <td>
                        <div className={styles.stack}>
                          <button className="button secondary small" form={formId} type="submit">
                            Save metadata
                          </button>
                          {note.file_path ? (
                            <span className={styles.notice}>Reference PDF attached</span>
                          ) : (
                            <span className={styles.notice}>Reader-only note</span>
                          )}
                          <form action={toggleNoteVerification}>
                            <input name="noteId" type="hidden" value={note.id} />
                            <input name="nextState" type="hidden" value={note.is_verified ? "false" : "true"} />
                            <button className="button secondary small" type="submit">
                              {note.is_verified ? "Unpublish" : "Publish"}
                            </button>
                          </form>
                          <form action={archiveNote}>
                            <input name="noteId" type="hidden" value={note.id} />
                            <input name="nextState" type="hidden" value="archive" />
                            <button className="button secondary small" type="submit">
                              Archive
                            </button>
                          </form>
                          <form action={deleteNote}>
                            <input name="noteId" type="hidden" value={note.id} />
                            <button className="button secondary small" type="submit">
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Archived Notes</h2>
          <p className={styles.sectionSubtitle}>Keep old or problematic notes out of the live catalog without losing their record.</p>
        </div>
        {archivedNotes.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>No archived notes</h3>
            <p className={styles.emptyStateBody}>
              Archived uploads will appear here when notes are removed from the live
              catalog but kept for record, audit, or recovery.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Note</th>
                  <th>Catalog mapping</th>
                  <th>Archived</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {archivedNotes.map((note: any) => (
                  <tr key={note.id}>
                    <td>
                      <p className={styles.primaryText}>{note.title}</p>
                      <p className={styles.mutedText}>{note.subject ?? "No subject"}</p>
                    </td>
                    <td>
                      <div className={styles.pillRow}>
                        {note.department ? <span className={styles.pill}>{note.department}</span> : null}
                        {note.program_domain ? <span className={styles.pill}>{note.program_domain}</span> : null}
                        {note.semester ? <span className={styles.pill}>Semester {note.semester}</span> : null}
                      </div>
                    </td>
                    <td>{note.archived_at ? formatDate(note.archived_at) : "Unknown"}</td>
                    <td>
                      <div className={styles.inlineActions}>
                        <form action={archiveNote}>
                          <input name="noteId" type="hidden" value={note.id} />
                          <input name="nextState" type="hidden" value="restore" />
                          <button className="button secondary small" type="submit">
                            Restore
                          </button>
                        </form>
                        <form action={deleteNote}>
                          <input name="noteId" type="hidden" value={note.id} />
                          <button className="button secondary small" type="submit">
                            Delete permanently
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
