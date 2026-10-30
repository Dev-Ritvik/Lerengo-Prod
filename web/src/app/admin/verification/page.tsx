import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanupExpiredVerificationArtifacts } from "@/lib/verification-retention";
import { reviewVerificationRequest } from "./actions";
import shared from "../workspace.module.css";
import styles from "./verification.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  already_reviewed: "This request has already been reviewed.",
  invalid_input: "Invalid review input. Please try again.",
  request_not_found: "Verification request not found.",
  request_update_failed: "Could not update verification request.",
  service_role_missing: "Missing SUPABASE_SERVICE_ROLE_KEY for admin review actions.",
  user_update_failed: "Verification request updated, but user profile update failed.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  approved: "Verification request approved successfully.",
  rejected: "Verification request rejected successfully.",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatReasonLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function summarizeReasons(reasons: Record<string, unknown>) {
  const failedChecks = Object.entries(reasons)
    .filter(([, result]) => result === false)
    .map(([key]) => formatReasonLabel(key))
    .slice(0, 3);

  if (failedChecks.length > 0) {
    return `Needs attention: ${failedChecks.join(", ")}`;
  }

  if (reasons.needs_manual_review === true) {
    return "Auto-check marked this request for manual review.";
  }

  return "No blocking signals in auto-check.";
}

function extractAdminNote(reasons: Record<string, unknown>) {
  const adminReview = reasons.admin_review;
  if (!adminReview || typeof adminReview !== "object" || Array.isArray(adminReview)) {
    return null;
  }

  const note = (adminReview as { note?: unknown }).note;
  return typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
}

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser, supabase } = await requireAdminUser();

  const { data: university, error: universityError } = await supabase
    .from("universities")
    .select("name")
    .eq("id", appUser.university_id)
    .maybeSingle();

  if (universityError) {
    throw new Error(universityError.message);
  }

  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    supabaseAdmin = null;
  }

  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? "Verification review failed.")
    : null;
  const successMessage = params.success
    ? (SUCCESS_MESSAGES[params.success] ?? "Verification request updated.")
    : null;

  if (!supabaseAdmin) {
    return (
      <main className={`shell ${shared.page}`}>
        <section className={shared.topbar}>
          <div className={shared.titleWrap}>
            <p className={shared.eyebrow}>Admin Workspace</p>
            <h1 className={shared.title}>Verification Management</h1>
            <p className={shared.subtitle}>
              Manual review for campus ID verification requests at{" "}
              {university?.name ?? "your campus"}.
            </p>
          </div>
          <div className={shared.actions}>
            <Link className="button secondary small" href="/admin">
              Admin Dashboard
            </Link>
            <Link className="button secondary small" href="/admin/notes">
              Notes Management
            </Link>
            <Link className="button secondary small" href="/admin/community">
              Community Moderation
            </Link>
          </div>
        </section>

        <p className="error">
          Missing `SUPABASE_SERVICE_ROLE_KEY`. Add it in `web/.env.local` to enable
          admin verification review.
        </p>
      </main>
    );
  }

  await cleanupExpiredVerificationArtifacts(supabaseAdmin, { limit: 50 });

  const { data: verificationRequests, error: requestError } = await supabaseAdmin
    .from("verification_requests")
    .select(
      "id, user_id, status, score, attempt_no, created_at, decided_at, id_front_path, reasons",
    )
    .eq("university_id", appUser.university_id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (requestError) {
    throw new Error(requestError.message);
  }

  const userIds = Array.from(
    new Set((verificationRequests ?? []).map((request: any) => request.user_id)),
  );

  const { data: users, error: usersError } = userIds.length
    ? await supabaseAdmin
        .from("users")
        .select("id, full_name, email, verified")
        .in("id", userIds)
    : { data: [], error: null };

  if (usersError) {
    throw new Error(usersError.message);
  }

  const usersById = new Map<string, any>(
    (users ?? []).map((user: any) => [
      user.id,
      {
        email: user.email,
        full_name: user.full_name,
        verified: user.verified,
      },
    ]),
  );

  const previewUrlByRequestId = new Map<string, string | null>();
  await Promise.all(
    (verificationRequests ?? []).map(async (request: any) => {
      if (!request.id_front_path) {
        previewUrlByRequestId.set(request.id, null);
        return;
      }

      const { data, error } = await supabaseAdmin.storage
        .from(env.SUPABASE_ID_CARDS_BUCKET)
        .createSignedUrl(request.id_front_path, 15 * 60);

      previewUrlByRequestId.set(request.id, error ? null : data.signedUrl);
    }),
  );

  const pendingRequests = (verificationRequests ?? []).filter(
    (request: any) => request.status === "pending",
  );
  const approvedRequests = (verificationRequests ?? []).filter(
    (request: any) => request.status === "approved",
  );
  const rejectedRequests = (verificationRequests ?? []).filter(
    (request: any) => request.status === "rejected",
  );
  const reviewedRequests = [...approvedRequests, ...rejectedRequests]
    .sort((left: any, right: any) => {
      const leftTime = left.decided_at ? new Date(left.decided_at).getTime() : 0;
      const rightTime = right.decided_at ? new Date(right.decided_at).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 30);
  const manualReviewCount = pendingRequests.filter(
    (request: any) => request.reasons.needs_manual_review === true,
  ).length;

  return (
    <main className={`shell ${shared.page}`}>
      <section className={shared.topbar}>
        <div className={shared.titleWrap}>
          <p className={shared.eyebrow}>Admin Workspace</p>
          <h1 className={shared.title}>Verification Management</h1>
          <p className={shared.subtitle}>
            Review campus ID submissions, approve verified students into the network, and
            keep a complete decision history for {university?.name ?? "your campus"}.
          </p>
        </div>
        <div className={shared.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/admin/notes">
            Notes Management
          </Link>
          <Link className="button secondary small" href="/admin/community">
            Community Moderation
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      <section className={shared.statsGrid}>
        <article className={shared.statCard}>
          <span className={shared.statValue}>{pendingRequests.length}</span>
          <span className={shared.statLabel}>Pending requests</span>
        </article>
        <article className={shared.statCard}>
          <span className={shared.statValue}>{manualReviewCount}</span>
          <span className={shared.statLabel}>Need manual attention</span>
        </article>
        <article className={shared.statCard}>
          <span className={shared.statValue}>{approvedRequests.length}</span>
          <span className={shared.statLabel}>Approved requests</span>
        </article>
        <article className={shared.statCard}>
          <span className={shared.statValue}>{rejectedRequests.length}</span>
          <span className={shared.statLabel}>Rejected requests</span>
        </article>
      </section>

      <section className={`${shared.panel} ${styles.queuePanel}`}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>Pending Queue</h2>
          <p className={shared.sectionSubtitle}>
            Approve or reject campus ID submissions. Signed previews expire after 15 minutes.
          </p>
        </div>

        {pendingRequests.length === 0 ? (
          <div className={shared.emptyState}>
            <h3 className={shared.emptyStateTitle}>No pending verification requests</h3>
            <p className={shared.emptyStateBody}>
              New campus ID submissions will appear here for manual review as soon as
              users complete the verification pipeline.
            </p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Score</th>
                  <th>Attempt</th>
                  <th>Submitted</th>
                  <th>Auto-check</th>
                  <th>ID image</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request: any) => {
                  const user = usersById.get(request.user_id);
                  const previewUrl = previewUrlByRequestId.get(request.id) ?? null;
                  const scoreClass =
                    request.score >= 85
                      ? shared.statusPositive
                      : request.score >= 65
                        ? shared.statusWarning
                        : shared.statusNegative;

                  return (
                    <tr key={request.id}>
                      <td>
                        <p className={shared.primaryText}>
                          {user?.full_name?.trim() || "Unnamed user"}
                        </p>
                        <p className={shared.mutedText}>{user?.email ?? "No email"}</p>
                      </td>
                      <td>
                        <span className={`${shared.statusPill} ${scoreClass}`}>
                          {request.score}/100
                        </span>
                      </td>
                      <td>#{request.attempt_no}</td>
                      <td>{formatDateTime(request.created_at)}</td>
                      <td className={styles.reasonCell}>
                        <p className={shared.mutedText}>{summarizeReasons(request.reasons)}</p>
                      </td>
                      <td>
                        {previewUrl ? (
                          <a
                            className={styles.previewLink}
                            href={previewUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View ID image
                          </a>
                        ) : (
                          <span className={shared.mutedText}>Unavailable</span>
                        )}
                      </td>
                      <td>
                        <form action={reviewVerificationRequest} className={styles.reviewForm}>
                          <input name="requestId" type="hidden" value={request.id} />
                          <input
                            className={shared.input}
                            maxLength={140}
                            name="reviewNote"
                            placeholder="Optional admin note"
                            type="text"
                          />
                          <div className={styles.reviewActions}>
                            <button
                              className="button small"
                              name="decision"
                              type="submit"
                              value="approved"
                            >
                              Approve
                            </button>
                            <button
                              className="button secondary small"
                              name="decision"
                              type="submit"
                              value="rejected"
                            >
                              Reject
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${shared.panel} ${styles.queuePanel}`}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>Decision History</h2>
          <p className={shared.sectionSubtitle}>
            Review the latest approved and rejected requests, along with the final profile state.
          </p>
        </div>

        {reviewedRequests.length === 0 ? (
          <div className={shared.emptyState}>
            <h3 className={shared.emptyStateTitle}>No completed decisions yet</h3>
            <p className={shared.emptyStateBody}>
              Approved and rejected verification outcomes will appear here once the
              first review cycle is completed.
            </p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Submitted</th>
                  <th>Reviewed</th>
                  <th>Admin note</th>
                  <th>Profile state</th>
                </tr>
              </thead>
              <tbody>
                {reviewedRequests.map((request: any) => {
                  const user = usersById.get(request.user_id);
                  const statusClass =
                    request.status === "approved"
                      ? shared.statusPositive
                      : shared.statusNegative;
                  const adminNote = extractAdminNote(request.reasons);

                  return (
                    <tr key={request.id}>
                      <td>
                        <p className={shared.primaryText}>
                          {user?.full_name?.trim() || "Unnamed user"}
                        </p>
                        <p className={shared.mutedText}>{user?.email ?? "No email"}</p>
                      </td>
                      <td>
                        <span className={`${shared.statusPill} ${statusClass}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>{request.score}/100</td>
                      <td>{formatDateTime(request.created_at)}</td>
                      <td>{formatDateTime(request.decided_at)}</td>
                      <td>
                        <p className={shared.mutedText}>{adminNote ?? "No note"}</p>
                      </td>
                      <td>
                        {user?.verified ? (
                          <span
                            className={`${shared.statusPill} ${shared.statusPositive}`}
                          >
                            Verified
                          </span>
                        ) : (
                          <span
                            className={`${shared.statusPill} ${shared.statusNegative}`}
                          >
                            Not verified
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
