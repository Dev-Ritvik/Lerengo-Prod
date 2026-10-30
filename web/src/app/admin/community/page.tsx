import Link from "next/link";
import { isMissingCampusWeeklyBackend } from "@/lib/campus-weekly";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deleteCampusWeeklyItem,
  reviewCommunityReport,
  saveCampusWeeklyItem,
} from "./actions";
import shared from "../workspace.module.css";
import styles from "./community.module.css";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  already_reviewed: "This report has already been reviewed.",
  invalid_input: "Invalid moderation input.",
  report_not_found: "Report not found for this university.",
  review_failed: "Could not update moderation state.",
  campus_weekly_delete_failed: "Could not remove the campus weekly item.",
  campus_weekly_invalid: "Invalid campus weekly item input.",
  campus_weekly_post_not_found: "The linked discussion was not found for this university.",
  campus_weekly_save_failed: "Could not save the campus weekly item.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  dismissed: "Report dismissed successfully.",
  reviewed: "Report reviewed successfully.",
  campus_weekly_created: "Campus weekly item created.",
  campus_weekly_deleted: "Campus weekly item removed.",
  campus_weekly_updated: "Campus weekly item updated.",
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

export const dynamic = "force-dynamic";

export default async function AdminCommunityPage({ searchParams }: Props) {
  const params = await searchParams;
  const { appUser, supabase } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const [
    { data: university, error: universityError },
    { data: reports, error: reportsError },
    { data: moderationStates, error: moderationStatesError },
    { data: recentPosts, error: recentPostsError },
  ] = await Promise.all([
    supabase.from("universities").select("name").eq("id", appUser.university_id).maybeSingle(),
    admin
      .from("community_reports")
      .select("id, post_id, user_id, reason, status, created_at, updated_at, review_note")
      .eq("university_id", appUser.university_id)
      .order("created_at", { ascending: false })
      .limit(80),
    admin
      .from("community_posts")
      .select("id, moderation_state")
      .eq("university_id", appUser.university_id),
    admin
      .from("community_posts")
      .select("id, title, summary, channel, created_at, helpful_count, reply_count, status_label")
      .eq("university_id", appUser.university_id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (universityError || reportsError || moderationStatesError || recentPostsError) {
    throw new Error(
      universityError?.message ||
        reportsError?.message ||
        moderationStatesError?.message ||
        recentPostsError?.message ||
        "Failed to load community moderation.",
    );
  }

  const { data: campusWeeklyItems, error: campusWeeklyItemsError } = await admin
    .from("campus_weekly_items")
    .select(
      "id, item_type, category, title, subtitle, description, meta_label, pill_label, target_type, target_url, community_post_id, starts_at, ends_at, sort_order, is_active, created_at",
    )
    .eq("university_id", appUser.university_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const missingCampusWeeklyBackend = campusWeeklyItemsError
    ? isMissingCampusWeeklyBackend(campusWeeklyItemsError)
    : false;

  if (campusWeeklyItemsError && !missingCampusWeeklyBackend) {
    throw new Error(campusWeeklyItemsError.message || "Failed to load campus weekly items.");
  }

  const postIds = Array.from(new Set(((reports ?? []) as any[]).map((item: any) => item.post_id)));
  const reporterIds = Array.from(new Set(((reports ?? []) as any[]).map((item: any) => item.user_id)));
 
  const [{ data: posts, error: postsError }, { data: reporters, error: reportersError }] =
    await Promise.all([
      postIds.length
        ? admin
            .from("community_posts")
            .select("id, title, channel, moderation_state, status_label, helpful_count, reply_count")
            .in("id", postIds)
        : Promise.resolve({ data: [], error: null }),
      reporterIds.length
        ? admin.from("users").select("id, full_name, email").in("id", reporterIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
 
  if (postsError || reportersError) {
    throw new Error(postsError?.message || reportersError?.message || "Failed to load moderation details.");
  }
 
  const postsById = new Map(((posts ?? []) as any[]).map((item: any) => [item.id, item]));
  const reportersById = new Map(((reporters ?? []) as any[]).map((item: any) => [item.id, item]));
  const pendingReports = ((reports ?? []) as any[]).filter((item: any) => item.status === "open");
  const reviewedReports = ((reports ?? []) as any[]).filter((item: any) => item.status !== "open").slice(0, 30);
  const dismissedCount = ((reports ?? []) as any[]).filter((item: any) => item.status === "dismissed").length;
  const reviewedCount = ((reports ?? []) as any[]).filter((item: any) => item.status === "reviewed").length;
  const flaggedPostsCount = ((moderationStates ?? []) as any[]).filter((post: any) => post.moderation_state === "flagged").length;
  const pinnedPostsCount = ((moderationStates ?? []) as any[]).filter((post: any) => post.moderation_state === "pinned").length;
  const weeklyItems = campusWeeklyItems ?? [];
  const bannerCount = (weeklyItems as any[]).filter((item: any) => item.item_type === "banner").length;
  const announcementCount = (weeklyItems as any[]).filter((item: any) => item.item_type === "announcement").length;
  const discussionOptions = recentPosts ?? [];

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "Moderation action failed." : null;
  const successMessage = params.success ? SUCCESS_MESSAGES[params.success] ?? "Moderation updated successfully." : null;

  return (
    <main className={`shell ${shared.page}`}>
      <section className={shared.topbar}>
        <div className={shared.titleWrap}>
          <p className={shared.eyebrow}>Admin Workspace</p>
          <h1 className={shared.title}>Community Moderation</h1>
          <p className={shared.subtitle}>
            Review reported discussions, flag or verify posts, and keep{" "}
            {university?.name ?? "your campus"} academically useful and high-signal.
          </p>
        </div>
        <div className={shared.actions}>
          <Link className="button secondary small" href="/admin">Admin Dashboard</Link>
          <Link className="button secondary small" href="/community">Campus Community</Link>
          <Link className="button secondary small" href="/admin/verification">Verification Management</Link>
        </div>
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {successMessage ? <p className="success">{successMessage}</p> : null}

      <section className={shared.statsGrid}>
        <article className={shared.statCard}><span className={shared.statValue}>{pendingReports.length}</span><span className={shared.statLabel}>Open reports</span></article>
        <article className={shared.statCard}><span className={shared.statValue}>{reviewedCount}</span><span className={shared.statLabel}>Reviewed reports</span></article>
        <article className={shared.statCard}><span className={shared.statValue}>{flaggedPostsCount}</span><span className={shared.statLabel}>Flagged posts</span></article>
        <article className={shared.statCard}><span className={shared.statValue}>{pinnedPostsCount + dismissedCount}</span><span className={shared.statLabel}>Pinned + dismissed outcomes</span></article>
      </section>

      <section className={`${shared.panel} ${styles.queuePanel}`}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>This Week on Campus</h2>
          <p className={shared.sectionSubtitle}>
            Publish external registration banners first, then attach campus announcements to their exact discussion threads.
          </p>
        </div>
        <div className={styles.highlightGrid}>
          <div className={styles.highlightColumn}>
            <div className={styles.highlightColumnHeader}>
              <h3 className={shared.sectionTitle}>Live weekly items</h3>
              <span className={shared.pill}>{weeklyItems.length} total</span>
            </div>

            {missingCampusWeeklyBackend ? (
              <div className={shared.emptyState}>
                <h3 className={shared.emptyStateTitle}>Weekly backend not applied yet</h3>
                <p className={shared.emptyStateBody}>
                  Apply <code>web/supabase/campus_weekly_schema.sql</code> so the CampusGO homepage can use real banners and announcement cards.
                </p>
              </div>
            ) : weeklyItems.length === 0 ? (
              <div className={shared.emptyState}>
                <h3 className={shared.emptyStateTitle}>No weekly items yet</h3>
                <p className={shared.emptyStateBody}>
                  Start with one registration banner and one announcement thread so the homepage stops feeling empty.
                </p>
              </div>
            ) : (
              <div className={styles.highlightList}>
                {weeklyItems.map((item: any) => (
                  <article className={shared.listItem} key={item.id}>
                    <div className={shared.itemTitleRow}>
                      <div>
                        <p className={shared.primaryText}>{item.title}</p>
                        <p className={shared.mutedText}>
                          {item.item_type} / {item.category} / {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <span className={`${shared.statusPill} ${shared.statusPositive}`}>
                        {item.is_active ? "Live" : "Inactive"}
                      </span>
                    </div>

                    <p className={shared.mutedText}>
                      {item.description?.trim() ||
                        item.subtitle?.trim() ||
                        (item.item_type === "banner" ? "External registration banner" : "Announcement thread card")}
                    </p>

                    <div className={shared.pillRow}>
                      <span className={shared.pill}>{item.item_type}</span>
                      <span className={shared.pill}>{item.category}</span>
                      <span className={shared.pill}>{item.item_type === "banner" ? "External" : "Discussion"}</span>
                    </div>

                    <div className={styles.highlightActions}>
                      {item.target_type === "external" && item.target_url ? (
                        <a className="button secondary small" href={item.target_url} rel="noreferrer" target="_blank">
                          Open target
                        </a>
                      ) : item.community_post_id ? (
                        <Link className="button secondary small" href={`/community/${item.community_post_id}`}>
                          Open thread
                        </Link>
                      ) : (
                        <span className={shared.notice}>No target attached</span>
                      )}

                      <form action={deleteCampusWeeklyItem}>
                        <input name="itemId" type="hidden" value={item.id} />
                        <button className="button secondary small" type="submit">
                          Delete item
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className={`${styles.highlightColumn} ${styles.editorStack}`}>
            <article className={shared.surfaceCard}>
              <div className={shared.sectionHeader}>
                <h3 className={shared.sectionTitle}>Registration banner</h3>
                <p className={shared.sectionSubtitle}>
                  Use this for hackathons, workshops, drives, and any external registration link.
                </p>
              </div>

              <div className={shared.pillRow}>
                <span className={shared.pill}>{bannerCount} banners</span>
                <span className={shared.pill}>External registration</span>
              </div>

              <form action={saveCampusWeeklyItem} className={styles.highlightForm}>
                <input name="itemType" type="hidden" value="banner" />
                <input name="targetType" type="hidden" value="external" />
                <input name="isActive" type="hidden" value="true" />

                <div className={styles.highlightFields}>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Category</span>
                    <select className={shared.select} defaultValue="hackathon" name="category">
                      <option value="hackathon">Hackathon</option>
                      <option value="event">Event</option>
                      <option value="workshop">Workshop</option>
                      <option value="opportunity">Opportunity</option>
                      <option value="bulletin">Bulletin</option>
                    </select>
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Sort order</span>
                    <input className={shared.input} defaultValue={100} name="sortOrder" type="number" />
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Headline</span>
                    <input className={shared.input} maxLength={120} name="title" required type="text" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Eyebrow</span>
                    <input className={shared.input} maxLength={60} name="eyebrow" placeholder="Campus registration" type="text" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Pill label</span>
                    <input className={shared.input} maxLength={40} name="pillLabel" placeholder="Hackathon" type="text" />
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Subtitle</span>
                    <input className={shared.input} maxLength={160} name="subtitle" placeholder="One short supporting line" type="text" />
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Description</span>
                    <textarea className={shared.textarea} maxLength={240} name="description" placeholder="Short recents-strip copy." />
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Registration URL</span>
                    <input className={shared.input} name="targetUrl" placeholder="https://..." required type="url" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>CTA label</span>
                    <input className={shared.input} maxLength={40} name="ctaLabel" placeholder="Register now" type="text" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Meta line</span>
                    <input className={shared.input} maxLength={70} name="metaLabel" placeholder="Registrations open now" type="text" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Starts at</span>
                    <input className={shared.input} name="startsAt" type="datetime-local" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Ends at</span>
                    <input className={shared.input} name="endsAt" type="datetime-local" />
                  </label>
                </div>

                <div className={styles.highlightActions}>
                  <p className={shared.notice}>These open in a new tab from the CampusGO recents strip.</p>
                  <button className="button small" type="submit">Publish banner</button>
                </div>
              </form>
            </article>

            <article className={shared.surfaceCard}>
              <div className={shared.sectionHeader}>
                <h3 className={shared.sectionTitle}>Announcement thread</h3>
                <p className={shared.sectionSubtitle}>
                  Link an update to a real community discussion so students can read context and replies.
                </p>
              </div>

              <div className={shared.pillRow}>
                <span className={shared.pill}>{announcementCount} announcements</span>
                <span className={shared.pill}>Thread-linked</span>
              </div>

              <form action={saveCampusWeeklyItem} className={styles.highlightForm}>
                <input name="itemType" type="hidden" value="announcement" />
                <input name="targetType" type="hidden" value="community_post" />
                <input name="isActive" type="hidden" value="true" />

                <div className={styles.highlightFields}>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Category</span>
                    <select className={shared.select} defaultValue="announcement" name="category">
                      <option value="announcement">Announcement</option>
                      <option value="bulletin">Bulletin</option>
                      <option value="event">Event</option>
                    </select>
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Sort order</span>
                    <input className={shared.input} defaultValue={140} name="sortOrder" type="number" />
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Announcement title</span>
                    <input className={shared.input} maxLength={120} name="title" required type="text" />
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Linked discussion</span>
                    <select className={shared.select} defaultValue="" name="communityPostId" required>
                      <option disabled value="">Select a campus discussion</option>
                      {discussionOptions.map((post: any) => (
                        <option key={post.id} value={post.id}>
                          {post.channel} - {post.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Subtitle</span>
                    <input className={shared.input} maxLength={160} name="subtitle" placeholder="Short list-row summary" type="text" />
                  </label>
                  <label className={shared.formFieldFull}>
                    <span className={shared.formLabel}>Description</span>
                    <textarea className={shared.textarea} maxLength={240} name="description" placeholder="Optional custom copy for the announcement list." />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Pill label</span>
                    <input className={shared.input} maxLength={40} name="pillLabel" placeholder="Announcement" type="text" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Meta line</span>
                    <input className={shared.input} maxLength={70} name="metaLabel" placeholder="Posted today" type="text" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Starts at</span>
                    <input className={shared.input} name="startsAt" type="datetime-local" />
                  </label>
                  <label className={shared.formField}>
                    <span className={shared.formLabel}>Ends at</span>
                    <input className={shared.input} name="endsAt" type="datetime-local" />
                  </label>
                </div>

                <div className={styles.highlightActions}>
                  <p className={shared.notice}>These cards open the exact discussion page in Campus Community.</p>
                  <button className="button small" type="submit">Publish announcement</button>
                </div>
              </form>
            </article>
          </div>
        </div>
      </section>

      <section className={`${shared.panel} ${styles.queuePanel}`}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>Recent discussion source</h2>
          <p className={shared.sectionSubtitle}>
            Use these posts as the target when an announcement card needs to open a real thread.
          </p>
        </div>

        {discussionOptions.length === 0 ? (
          <div className={shared.emptyState}>
            <h3 className={shared.emptyStateTitle}>No recent posts available</h3>
            <p className={shared.emptyStateBody}>
              Once your campus starts posting, those discussions can be attached to the homepage announcement list.
            </p>
          </div>
        ) : (
          <div className={styles.highlightList}>
            {discussionOptions.map((post: any) => (
              <article className={shared.listItem} key={post.id}>
                <div className={shared.itemTitleRow}>
                  <div>
                    <p className={shared.primaryText}>{post.title}</p>
                    <p className={shared.mutedText}>{post.channel} / {formatDateTime(post.created_at)}</p>
                  </div>
                  <span className={shared.statusPill}>{post.status_label}</span>
                </div>

                <p className={shared.mutedText}>{post.summary}</p>

                <div className={shared.pillRow}>
                  <span className={shared.pill}>{post.helpful_count} helpful</span>
                  <span className={shared.pill}>{post.reply_count} replies</span>
                </div>

                <Link className="button secondary small" href={`/community/${post.id}`}>
                  Open discussion
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={`${shared.panel} ${styles.queuePanel}`}>
        <div className={shared.sectionHeader}>
          <h2 className={shared.sectionTitle}>Open Reports</h2>
          <p className={shared.sectionSubtitle}>
            Review flagged discussions and set the next moderation state for each post.
          </p>
        </div>

        {pendingReports.length === 0 ? (
          <div className={shared.emptyState}>
            <h3 className={shared.emptyStateTitle}>No open community reports</h3>
            <p className={shared.emptyStateBody}>
              Reported discussions will surface here when moderation review is needed for your campus community.
            </p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Reporter</th>
                  <th>Reason</th>
                  <th>Signals</th>
                  <th>Submitted</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map((report: any) => {
                  const post = postsById.get(report.post_id);
                  const reporter = reportersById.get(report.user_id);
 
                  return (
                    <tr key={report.id}>
                      <td>
                        <p className={shared.primaryText}>{post?.title ?? "Unknown post"}</p>
                        <p className={shared.mutedText}>{post?.channel ?? "Unknown channel"}</p>
                        <div className={shared.pillRow}>
                          <span className={shared.pill}>{post?.status_label ?? "Open"}</span>
                          <span className={shared.pill}>{post?.moderation_state ?? "reviewed"}</span>
                        </div>
                      </td>
                      <td>
                        <p className={shared.primaryText}>{reporter?.full_name?.trim() || "Campus Member"}</p>
                        <p className={shared.mutedText}>{reporter?.email ?? "No email"}</p>
                      </td>
                      <td className={styles.reasonCell}>
                        <p className={shared.mutedText}>{report.reason}</p>
                      </td>
                      <td>
                        <div className={shared.pillRow}>
                          <span className={shared.pill}>{post?.helpful_count ?? 0} helpful</span>
                          <span className={shared.pill}>{post?.reply_count ?? 0} replies</span>
                        </div>
                      </td>
                      <td>{formatDateTime(report.created_at)}</td>
                      <td>
                        <form action={reviewCommunityReport} className={styles.reviewForm}>
                          <input name="reportId" type="hidden" value={report.id} />
                          <div className={styles.reviewFormRow}>
                            <select className={shared.select} defaultValue="reviewed" name="reportStatus">
                              <option value="reviewed">Reviewed</option>
                              <option value="dismissed">Dismiss</option>
                            </select>
                            <select className={shared.select} defaultValue="flagged" name="moderationState">
                              <option value="flagged">Flagged</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="verified">Verified</option>
                              <option value="pinned">Pinned</option>
                            </select>
                          </div>
                          <input className={shared.input} maxLength={220} name="reviewNote" placeholder="Optional review note" type="text" />
                          <div className={styles.reviewActions}>
                            <button className="button small" type="submit">Save Decision</button>
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
            Latest reviewed and dismissed reports for this campus, including review notes.
          </p>
        </div>

        {reviewedReports.length === 0 ? (
          <div className={shared.emptyState}>
            <h3 className={shared.emptyStateTitle}>No completed moderation decisions</h3>
            <p className={shared.emptyStateBody}>
              Once reports are reviewed or dismissed, the full decision history will appear here for audit and follow-up.
            </p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Reporter</th>
                  <th>Status</th>
                  <th>Moderation</th>
                  <th>Review note</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {reviewedReports.map((report: any) => {
                  const post = postsById.get(report.post_id);
                  const reporter = reportersById.get(report.user_id);
                  const statusClass =
                    report.status === "dismissed" ? shared.statusWarning : shared.statusPositive;

                  return (
                    <tr key={report.id}>
                      <td>
                        <p className={shared.primaryText}>{post?.title ?? "Unknown post"}</p>
                        <p className={shared.mutedText}>{post?.channel ?? "Unknown channel"}</p>
                      </td>
                      <td>
                        <p className={shared.primaryText}>{reporter?.full_name?.trim() || "Campus Member"}</p>
                        <p className={shared.mutedText}>{reporter?.email ?? "No email"}</p>
                      </td>
                      <td>
                        <span className={`${shared.statusPill} ${statusClass}`}>{report.status}</span>
                      </td>
                      <td>
                        <span className={shared.pill}>{post?.moderation_state ?? "reviewed"}</span>
                      </td>
                      <td>
                        <p className={shared.mutedText}>{report.review_note ?? "No note"}</p>
                      </td>
                      <td>{formatDateTime(report.updated_at)}</td>
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
