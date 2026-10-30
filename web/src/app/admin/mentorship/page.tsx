import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assignDoubtResponder, saveMentorSettings } from "./actions";
import styles from "../workspace.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  assignment_failed: "Could not update the doubt assignment.",
  doubt_not_found: "Doubt not found for this campus.",
  invalid_input: "Invalid mentorship settings.",
  invalid_doubt_assignment: "Invalid doubt assignment input.",
  save_failed: "Could not save mentor settings.",
  senior_not_found: "Assigned responder must be an active approved senior mentor.",
  user_not_found: "User not found for this campus.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  assigned: "Senior responder assigned.",
  saved: "Mentor settings updated.",
  unassigned: "Senior responder removed from the doubt.",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function summarizeText(value: string, maxLength = 140) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

export const dynamic = "force-dynamic";

export default async function AdminMentorshipPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser, supabase } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [
    { data: university, error: universityError },
    { data: users, error: usersError },
    { data: doubts, error: doubtsError },
  ] =
    await Promise.all([
      supabase.from("universities").select("name").eq("id", appUser.university_id).maybeSingle(),
      admin
        .from("users")
        .select(
          "id, email, full_name, role, verified, department, program_domain, mentor_category, mentor_approved, mentor_active, mentor_headline, mentor_expertise",
        )
        .eq("university_id", appUser.university_id)
        .eq("verified", true)
        .order("mentor_active", { ascending: false })
        .order("mentor_approved", { ascending: false })
        .order("full_name", { ascending: true }),
      admin
        .from("doubts")
        .select("id, title, description, status, created_at, user_id, assigned_to")
        .eq("university_id", appUser.university_id)
        .neq("moderation_state", "hidden")
        .neq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

  if (universityError || usersError || doubtsError) {
    throw new Error(universityError?.message || usersError?.message || doubtsError?.message || "Failed to load mentorship admin.");
  }

  const roster = (users ?? []) as any[];
  const rosterById = new Map(roster.map((user: any) => [user.id, user]));
  const approvedMentors = roster.filter((user: any) => user.mentor_approved);
  const activeMentors = roster.filter((user: any) => user.mentor_active);
  const pendingMentors = roster.filter((user: any) => user.mentor_category && !user.mentor_approved);
  const seniorResponders = roster.filter(
    (user: any) =>
      (user.role === "senior" &&
        user.mentor_category === "senior" &&
        user.mentor_approved &&
        user.mentor_active) ||
      user.role === "admin" ||
      user.role === "superadmin",
  );
  const doubtQueue = (doubts ?? []) as any[];
  const unassignedDoubts = doubtQueue.filter((doubt: any) => !doubt.assigned_to);
  const roleBreakdown = {
    faculty: approvedMentors.filter((user: any) => user.mentor_category === "faculty").length,
    senior: approvedMentors.filter((user: any) => user.mentor_category === "senior").length,
    career: approvedMentors.filter((user: any) => user.mentor_category === "career").length,
  };

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "Mentorship action failed." : null;
  const successMessage = params.success
    ? SUCCESS_MESSAGES[params.success] ?? "Mentorship settings updated."
    : null;

  return (
    <main className={`shell ${styles.page}`}>
      <section className={styles.topbar}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.title}>Mentorship Management</h1>
          <p className={styles.subtitle}>
            Approve campus mentors, assign faculty or senior tracks, and disable inactive mentor
            presence for {university?.name ?? "your campus"}.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/mentorship">
            Mentorship
          </Link>
          <Link className="button secondary small" href="/admin/analytics">
            Analytics
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{roster.length}</span>
          <span className={styles.statLabel}>Verified campus users</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{approvedMentors.length}</span>
          <span className={styles.statLabel}>Approved mentors</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{activeMentors.length}</span>
          <span className={styles.statLabel}>Active mentors</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{pendingMentors.length}</span>
          <span className={styles.statLabel}>Pending approval</span>
        </article>
      </section>

      <section className={styles.gridTwo}>
        <article className={styles.surfaceCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Mentor Track Coverage</h2>
            <p className={styles.sectionSubtitle}>
              Role balance across faculty, senior, and career mentor categories.
            </p>
          </div>
          <div className={styles.pillRow}>
            <span className={`${styles.statusPill} ${styles.statusPositive}`}>Faculty {roleBreakdown.faculty}</span>
            <span className={`${styles.statusPill} ${styles.statusPositive}`}>Senior {roleBreakdown.senior}</span>
            <span className={`${styles.statusPill} ${styles.statusPositive}`}>Career {roleBreakdown.career}</span>
          </div>
          <div className={styles.bulletList}>
            <div className={styles.listItem}>
              <p className={styles.primaryText}>Current operating model</p>
              <p className={styles.mutedText}>
                Mentors are managed from verified campus users. Senior mentor role can also promote a user from
                user to senior.
              </p>
            </div>
            <div className={styles.listItem}>
              <p className={styles.primaryText}>Operational rule</p>
              <p className={styles.mutedText}>
                Unapproved mentors cannot be active. Disable inactive profiles before removing approval if you want
                them off the mentorship page cleanly.
              </p>
            </div>
          </div>
        </article>

        <article className={styles.surfaceCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Approval Queue</h2>
            <p className={styles.sectionSubtitle}>Users already assigned a mentor category but still waiting for approval.</p>
          </div>
          <div className={styles.list}>
            {pendingMentors.length === 0 ? (
              <div className={styles.listItem}>
                <p className={styles.primaryText}>No pending mentor approvals</p>
                <p className={styles.mutedText}>Assign a mentor category below and approve when ready.</p>
              </div>
            ) : (
              pendingMentors.map((user: any) => (
                <div className={styles.listItem} key={user.id}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{user.full_name?.trim() || user.email}</span>
                    <span className={`${styles.statusPill} ${styles.statusWarning}`}>{user.mentor_category}</span>
                  </div>
                  <p className={styles.mutedText}>{user.email}</p>
                  <div className={styles.pillRow}>
                    {user.department ? <span className={styles.pill}>{user.department}</span> : null}
                    {user.program_domain ? <span className={styles.pill}>{user.program_domain}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={styles.surfaceCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Doubt Assignment Queue</h2>
            <p className={styles.sectionSubtitle}>Open campus doubts should move from admin triage to an assigned senior responder.</p>
          </div>
          <div className={styles.list}>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Open queue</span>
                <span className={`${styles.statusPill} ${styles.statusWarning}`}>{doubtQueue.length}</span>
              </div>
              <p className={styles.mutedText}>Visible, unresolved doubts currently in the campus queue.</p>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Awaiting senior</span>
                <span className={`${styles.statusPill} ${styles.statusWarning}`}>{unassignedDoubts.length}</span>
              </div>
              <p className={styles.mutedText}>These doubts still need an active approved senior assigned.</p>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Responder pool</span>
                <span className={`${styles.statusPill} ${styles.statusPositive}`}>{seniorResponders.length}</span>
              </div>
              <p className={styles.mutedText}>Only active approved senior mentors are eligible to reply.</p>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Mentor Roster Control</h2>
          <p className={styles.sectionSubtitle}>
            Configure mentor category, approval state, activity flag, and expertise for any verified campus member.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Campus Role</th>
                <th>Mentor Track</th>
                <th>Profile</th>
                <th>Status</th>
                <th>Save</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((user: any) => {
                const formId = `mentor-settings-${user.id}`;

                return (
                  <tr key={user.id}>
                    <td>
                      <p className={styles.primaryText}>{user.full_name?.trim() || "Unnamed user"}</p>
                      <p className={styles.mutedText}>{user.email}</p>
                      <div className={styles.pillRow}>
                        {user.department ? <span className={styles.pill}>{user.department}</span> : null}
                        {user.program_domain ? <span className={styles.pill}>{user.program_domain}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className={styles.statusPill}>{user.role}</span>
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        defaultValue={user.mentor_category ?? ""}
                        form={formId}
                        name="mentorCategory"
                      >
                        <option value="">No mentor track</option>
                        <option value="faculty">Faculty</option>
                        <option value="senior">Senior</option>
                        <option value="career">Career</option>
                      </select>
                    </td>
                    <td>
                      <div className={styles.stack}>
                        <input
                          className={styles.input}
                          defaultValue={user.mentor_headline ?? ""}
                          form={formId}
                          name="mentorHeadline"
                          placeholder="Headline: DBMS mentor, interview prep..."
                          type="text"
                        />
                        <input
                          className={styles.input}
                          defaultValue={user.mentor_expertise.join(", ")}
                          form={formId}
                          name="mentorExpertise"
                          placeholder="React, DBMS, OS, Research"
                          type="text"
                        />
                      </div>
                    </td>
                    <td>
                      <div className={styles.stack}>
                        <label className={styles.compactRow}>
                          <input
                            defaultChecked={Boolean(user.mentor_approved)}
                            form={formId}
                            name="mentorApproved"
                            type="checkbox"
                            value="true"
                          />
                          <span className={styles.mutedText}>Approved</span>
                        </label>
                        <label className={styles.compactRow}>
                          <input
                            defaultChecked={Boolean(user.mentor_active)}
                            form={formId}
                            name="mentorActive"
                            type="checkbox"
                            value="true"
                          />
                          <span className={styles.mutedText}>Active</span>
                        </label>
                      </div>
                    </td>
                    <td>
                      <form action={saveMentorSettings} className={styles.stack} id={formId}>
                        <input name="userId" type="hidden" value={user.id} />
                        <button className="button small" type="submit">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Senior Doubt Assignment</h2>
          <p className={styles.sectionSubtitle}>
            Route each visible doubt to one approved senior. Only the assigned senior can reply from the mentorship workspace.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Doubt</th>
                <th>Author</th>
                <th>Status</th>
                <th>Assigned Senior</th>
                <th>Save</th>
              </tr>
            </thead>
            <tbody>
              {doubtQueue.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className={styles.mutedText}>No open campus doubts are waiting for assignment.</p>
                  </td>
                </tr>
              ) : (
                doubtQueue.map((doubt: any) => {
                  const formId = `doubt-assignment-${doubt.id}`;
                  const author = rosterById.get(doubt.user_id);
                  const assignee = doubt.assigned_to ? rosterById.get(doubt.assigned_to) : null;
                  const statusClass = doubt.assigned_to ? styles.statusPositive : styles.statusWarning;

                  return (
                    <tr key={doubt.id}>
                      <td>
                        <p className={styles.primaryText}>{doubt.title?.trim() || "Campus doubt"}</p>
                        <p className={styles.mutedText}>{summarizeText(doubt.description)}</p>
                        <div className={styles.pillRow}>
                          <span className={styles.pill}>{formatDateTime(doubt.created_at)}</span>
                        </div>
                      </td>
                      <td>
                        <p className={styles.primaryText}>{author?.full_name?.trim() || "Campus Member"}</p>
                        <p className={styles.mutedText}>{author?.email ?? "No email"}</p>
                        <div className={styles.pillRow}>
                          {author?.department ? <span className={styles.pill}>{author.department}</span> : null}
                          {author?.program_domain ? <span className={styles.pill}>{author.program_domain}</span> : null}
                        </div>
                      </td>
                      <td>
                        <div className={styles.stack}>
                          <span className={`${styles.statusPill} ${statusClass}`}>
                            {doubt.assigned_to ? "Assigned" : "Awaiting assignment"}
                          </span>
                          <span className={styles.mutedText}>{doubt.status}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.stack}>
                          <select
                            className={styles.select}
                            defaultValue={doubt.assigned_to ?? ""}
                            form={formId}
                            name="assignedTo"
                          >
                            <option value="">Awaiting assignment</option>
                            {seniorResponders.map((user: any) => (
                              <option key={user.id} value={user.id}>
                                {user.full_name?.trim() || user.email}
                              </option>
                            ))}
                          </select>
                          <p className={styles.mutedText}>
                            {assignee
                              ? `Current: ${assignee.full_name?.trim() || assignee.email}`
                              : seniorResponders.length
                                ? "Choose one active senior responder."
                                : "No active approved senior mentors available."}
                          </p>
                        </div>
                      </td>
                      <td>
                        <form action={assignDoubtResponder} className={styles.stack} id={formId}>
                          <input name="doubtId" type="hidden" value={doubt.id} />
                          <button className="button small" type="submit">
                            {doubt.assigned_to ? "Update" : "Assign"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
