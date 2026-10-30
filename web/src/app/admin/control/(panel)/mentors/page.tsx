import { requireSuperAdminUser } from "@/lib/superadmin";
import { MENTOR_VERIFICATION_STATUSES } from "@/lib/mentorgo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import styles from "../../control.module.css";
import { createMentor, deleteMentor, reviewMentor, setMentorPublished } from "./actions";

type MentorRow = Database["public"]["Tables"]["mentor_profiles"]["Row"];

type Props = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

const MENTOR_TYPES = [
  "industry_expert",
  "faculty",
  "alumni",
  "senior_student",
  "founder",
  "operator",
  "other",
];

const SUCCESS_MESSAGES: Record<string, string> = {
  mentor_reviewed: "Mentor status updated.",
  mentor_published: "Mentor published to the directory.",
  mentor_unpublished: "Mentor removed from the directory.",
  mentor_deleted: "Mentor deleted.",
  mentor_created: "Mentor profile created.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_review: "Invalid mentor status.",
  invalid_target: "Invalid mentor.",
  publish_requires_approval: "Only approved mentors can be published.",
  update_failed: "The update could not be saved.",
  delete_failed: "The mentor could not be deleted.",
  missing_fields: "Fill in email, display name, headline, and short bio.",
  user_not_found: "No user found with that email. They must sign up first.",
  mentor_exists: "That user already has a mentor profile.",
  create_failed: "The mentor profile could not be created.",
};

function statusBadgeClass(status: string) {
  if (status === "approved") return styles.badgeGood;
  if (status === "rejected" || status === "suspended") return styles.badgeDanger;
  return styles.badgeWarn;
}

export const dynamic = "force-dynamic";

export default async function ControlMentorsPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireSuperAdminUser();
  const admin = createSupabaseAdminClient();

  const { data: mentorsData, error: mentorsError } = await admin
    .from("mentor_profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (mentorsError) {
    throw new Error(mentorsError.message);
  }

  const mentors = (mentorsData ?? []) as MentorRow[];
  const userIds = Array.from(new Set(mentors.map((m) => m.user_id)));
  const emailByUserId = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: mentorUsers } = await admin
      .from("users")
      .select("id, email")
      .in("id", userIds);
    for (const u of mentorUsers ?? []) {
      emailByUserId.set(u.id as string, u.email as string);
    }
  }

  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] : null;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>Surface 2 · Mentors</p>
        <h1 className={styles.heroTitle}>Mentor management</h1>
        <p className={styles.heroSubtitle}>
          Approve, reject, suspend, publish, or delete any MentorGO profile across the platform.
          Add a new mentor by promoting an existing user.
        </p>
      </section>

      {successMessage ? (
        <p className={`${styles.notice} ${styles.noticeSuccess}`}>{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className={`${styles.notice} ${styles.noticeError}`}>{errorMessage}</p>
      ) : null}

      <div className={styles.panel}>
        <details className="disclosure">
          <summary>Add a mentor (promote an existing user)</summary>
          <form action={createMentor}>
            <div className={styles.createGrid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="mentor-email">
                  User email (must already exist)
                </label>
                <input className={styles.input} id="mentor-email" name="email" type="email" required />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="mentor-name">
                  Display name
                </label>
                <input className={styles.input} id="mentor-name" name="displayName" required />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="mentor-type">
                  Mentor type
                </label>
                <select className={styles.select} id="mentor-type" name="mentorType" defaultValue="other">
                  {MENTOR_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.fieldLabel} htmlFor="mentor-headline">
                  Headline
                </label>
                <input className={styles.input} id="mentor-headline" name="headline" required />
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.fieldLabel} htmlFor="mentor-short">
                  Short bio
                </label>
                <textarea className={styles.textarea} id="mentor-short" name="shortBio" required />
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.fieldLabel} htmlFor="mentor-long">
                  Long bio (optional)
                </label>
                <textarea className={styles.textarea} id="mentor-long" name="longBio" />
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className={styles.fieldLabel} htmlFor="mentor-expertise">
                  Expertise tags (comma or newline separated)
                </label>
                <input className={styles.input} id="mentor-expertise" name="expertise" />
              </div>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
              Create mentor profile
            </button>
          </form>
        </details>
      </div>

      <div className={styles.panel} style={{ marginTop: "1rem" }}>
        {mentors.length === 0 ? (
          <div className={styles.emptyState}>No mentor profiles yet.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Directory</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mentors.map((mentor) => (
                  <tr key={mentor.id}>
                    <td>
                      <div className={styles.primaryText}>{mentor.display_name}</div>
                      <div className={styles.mutedText}>{mentor.headline}</div>
                      <div className={styles.mutedText}>
                        {emailByUserId.get(mentor.user_id) ?? "unknown user"}
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge}>{mentor.mentor_type}</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(mentor.verification_status)}`}>
                        {mentor.verification_status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          mentor.is_published ? styles.badgeGood : styles.badgeWarn
                        }`}
                      >
                        {mentor.is_published ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <form className={styles.inlineForm} action={reviewMentor}>
                          <input type="hidden" name="profileId" value={mentor.id} />
                          <select
                            className={styles.selectInline}
                            name="verificationStatus"
                            defaultValue={mentor.verification_status}
                            aria-label="Mentor status"
                          >
                            {MENTOR_VERIFICATION_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button className={styles.btn} type="submit">
                            Save
                          </button>
                        </form>

                        <form className={styles.inlineForm} action={setMentorPublished}>
                          <input type="hidden" name="profileId" value={mentor.id} />
                          <input
                            type="hidden"
                            name="publish"
                            value={mentor.is_published ? "false" : "true"}
                          />
                          <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
                            {mentor.is_published ? "Unpublish" : "Publish"}
                          </button>
                        </form>

                        <form className={styles.inlineForm} action={deleteMentor}>
                          <input type="hidden" name="profileId" value={mentor.id} />
                          <button className={`${styles.btn} ${styles.btnDanger}`} type="submit">
                            Delete
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
      </div>
    </>
  );
}
