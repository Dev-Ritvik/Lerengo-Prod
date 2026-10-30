import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import {
  MENTOR_BOOKING_STATUSES,
  MENTOR_PAYMENT_STATUSES,
  MENTOR_VERIFICATION_STATUSES,
  MENTORGO_SCHEMA_HINT,
  formatMentorGoValue,
  formatMentorPrice,
  isMissingMentorGoBackend,
  type MentorBookingRow,
  type MentorProfileRow,
} from "@/lib/mentorgo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { reviewMentorProfile, updateMentorBookingState } from "./actions";
import styles from "../workspace.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type UserRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "email" | "full_name" | "university_id">;

const ERROR_MESSAGES: Record<string, string> = {
  booking_save_failed: "Could not update the MentorGO booking state.",
  invalid_booking_state: "The selected booking or payment state is invalid.",
  invalid_profile_review: "The selected mentor review values are invalid.",
  profile_save_failed: "Could not save the mentor review.",
  publish_requires_approval: "A mentor can only be published after approval.",
  schema_missing: MENTORGO_SCHEMA_HINT,
};

const SUCCESS_MESSAGES: Record<string, string> = {
  booking_updated: "MentorGO booking state updated.",
  profile_reviewed: "MentorGO mentor review saved.",
};

function getStatusClassName(value: string) {
  if (value === "approved" || value === "confirmed" || value === "paid" || value === "completed") {
    return `${styles.statusPill} ${styles.statusPositive}`;
  }

  if (value === "rejected" || value === "suspended" || value === "payment_failed" || value === "disputed") {
    return `${styles.statusPill} ${styles.statusNegative}`;
  }

  return `${styles.statusPill} ${styles.statusWarning}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function AdminMentorGoPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [profilesResult, bookingsResult] = await Promise.all([
    admin.from("mentor_profiles").select("*").order("updated_at", { ascending: false }),
    admin.from("mentor_bookings").select("*").order("start_at", { ascending: false }).limit(50),
  ]);

  const schemaMissing =
    isMissingMentorGoBackend(profilesResult.error) || isMissingMentorGoBackend(bookingsResult.error);

  if ((profilesResult.error || bookingsResult.error) && !schemaMissing) {
    throw new Error(profilesResult.error?.message || bookingsResult.error?.message || "Failed to load MentorGO admin.");
  }

  const profiles = schemaMissing ? [] : ((profilesResult.data ?? []) as MentorProfileRow[]);
  const bookings = schemaMissing ? [] : ((bookingsResult.data ?? []) as MentorBookingRow[]);
  const userIds = [
    ...new Set([
      ...profiles.map((profile) => profile.user_id),
      ...bookings.map((booking) => booking.student_user_id),
    ]),
  ];

  const usersResult =
    userIds.length > 0
      ? await admin.from("users").select("id, email, full_name, university_id").in("id", userIds)
      : { data: [] as UserRow[], error: null };

  if (usersResult.error && !schemaMissing) {
    throw new Error(usersResult.error.message);
  }

  const usersById = new Map(((usersResult.data ?? []) as UserRow[]).map((user) => [user.id, user]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const pendingProfiles = profiles.filter((profile) => profile.verification_status === "submitted");
  const publishedProfiles = profiles.filter((profile) => profile.verification_status === "approved" && profile.is_published);
  const activeBookings = bookings.filter((booking) =>
    booking.booking_status === "pending_mentor_approval" || booking.booking_status === "confirmed",
  );
  const disputedBookings = bookings.filter((booking) => booking.booking_status === "disputed");
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "MentorGO admin action failed." : null;
  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] ?? "MentorGO admin updated." : null;

  return (
    <main className={`shell ${styles.page}`}>
      <section className={styles.topbar}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.title}>MentorGO Management</h1>
          <p className={styles.subtitle}>
            Review mentor profiles, control publication, and monitor booking/payment states without weakening the trust boundary.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/mentorgo">
            Live MentorGO
          </Link>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      {schemaMissing ? (
        <section className={styles.panel}>
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>MentorGO schema not applied yet</h3>
            <p className={styles.emptyStateBody}>{MENTORGO_SCHEMA_HINT}</p>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{profiles.length}</span>
              <span className={styles.statLabel}>Mentor profiles</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{pendingProfiles.length}</span>
              <span className={styles.statLabel}>Pending review</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{publishedProfiles.length}</span>
              <span className={styles.statLabel}>Published mentors</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{activeBookings.length + disputedBookings.length}</span>
              <span className={styles.statLabel}>Active/disputed bookings</span>
            </article>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Mentor verification queue</h2>
              <p className={styles.sectionSubtitle}>
                Publish only approved mentors. Rejected or suspended mentors are automatically kept out of the public directory.
              </p>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mentor</th>
                    <th>Profile</th>
                    <th>State</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className={styles.emptyState}>
                          <h3 className={styles.emptyStateTitle}>No mentor profiles yet</h3>
                          <p className={styles.emptyStateBody}>Submitted mentor profiles will appear here for approval and publication control.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    profiles.map((profile) => {
                      const owner = usersById.get(profile.user_id);
                      const formId = `mentor-profile-${profile.id}`;

                      return (
                        <tr key={profile.id}>
                          <td>
                            <p className={styles.primaryText}>{profile.display_name}</p>
                            <p className={styles.mutedText}>{owner?.email ?? "No account email found"}</p>
                            <div className={styles.pillRow}>
                              <span className={styles.pill}>{formatMentorGoValue(profile.mentor_type)}</span>
                              <span className={styles.pill}>{profile.timezone}</span>
                            </div>
                          </td>
                          <td>
                            <p className={styles.primaryText}>{profile.headline}</p>
                            <p className={styles.mutedText}>{profile.short_bio}</p>
                            <div className={styles.pillRow}>
                              {profile.expertise_tags.slice(0, 4).map((tag) => (
                                <span className={styles.pill} key={`${profile.id}-${tag}`}>
                                  {tag}
                                </span>
                              ))}
                              <span className={styles.pill}>{formatMentorPrice(profile.starting_price)}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.stack}>
                              <span className={getStatusClassName(profile.verification_status)}>
                                {formatMentorGoValue(profile.verification_status)}
                              </span>
                              <span className={profile.is_published ? `${styles.statusPill} ${styles.statusPositive}` : styles.statusPill}>
                                {profile.is_published ? "Published" : "Not published"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <form action={reviewMentorProfile} className={styles.stack} id={formId}>
                              <input name="profileId" type="hidden" value={profile.id} />
                              <select className={styles.select} defaultValue={profile.verification_status} name="verificationStatus">
                                {MENTOR_VERIFICATION_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {formatMentorGoValue(status)}
                                  </option>
                                ))}
                              </select>
                              <label className={styles.compactRow}>
                                <input
                                  defaultChecked={profile.is_published}
                                  name="isPublished"
                                  type="checkbox"
                                  value="true"
                                />
                                <span className={styles.mutedText}>Publish when approved</span>
                              </label>
                              <textarea
                                className={styles.textarea}
                                defaultValue={profile.admin_notes ?? ""}
                                name="adminNotes"
                                placeholder="Verification notes, credential concerns, or publication reason."
                              />
                              <button className="button small" type="submit">
                                Save review
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

          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Booking state control</h2>
              <p className={styles.sectionSubtitle}>
                This is operational state management, not payment capture. Payment provider integration still needs its webhook boundary.
              </p>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Student</th>
                    <th>Price</th>
                    <th>State</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <p className={styles.mutedText}>No MentorGO bookings exist yet.</p>
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => {
                      const profile = profileById.get(booking.mentor_profile_id);
                      const student = usersById.get(booking.student_user_id);

                      return (
                        <tr key={booking.id}>
                          <td>
                            <p className={styles.primaryText}>{profile?.display_name ?? "Mentor profile"}</p>
                            <p className={styles.mutedText}>{formatDateTime(booking.start_at)} - {formatDateTime(booking.end_at)}</p>
                            <p className={styles.mutedText}>{booking.session_goal}</p>
                          </td>
                          <td>
                            <p className={styles.primaryText}>{student?.full_name ?? "Student"}</p>
                            <p className={styles.mutedText}>{student?.email ?? "No email found"}</p>
                          </td>
                          <td>
                            <p className={styles.primaryText}>{formatMentorPrice(booking.price_amount, booking.currency)}</p>
                            <p className={styles.mutedText}>Provider: {booking.payment_provider}</p>
                          </td>
                          <td>
                            <div className={styles.stack}>
                              <span className={getStatusClassName(booking.booking_status)}>
                                {formatMentorGoValue(booking.booking_status)}
                              </span>
                              <span className={getStatusClassName(booking.payment_status)}>
                                {formatMentorGoValue(booking.payment_status)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <form action={updateMentorBookingState} className={styles.stack}>
                              <input name="bookingId" type="hidden" value={booking.id} />
                              <select className={styles.select} defaultValue={booking.booking_status} name="bookingStatus">
                                {MENTOR_BOOKING_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {formatMentorGoValue(status)}
                                  </option>
                                ))}
                              </select>
                              <select className={styles.select} defaultValue={booking.payment_status} name="paymentStatus">
                                {MENTOR_PAYMENT_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {formatMentorGoValue(status)}
                                  </option>
                                ))}
                              </select>
                              <textarea
                                className={styles.textarea}
                                defaultValue={booking.admin_notes ?? ""}
                                name="adminNotes"
                                placeholder="Refund, dispute, or operational note."
                              />
                              <button className="button small" type="submit">
                                Save state
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
        </>
      )}
    </main>
  );
}
