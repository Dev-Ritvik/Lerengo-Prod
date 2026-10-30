import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import styles from "../workspace.module.css";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const { appUser, supabase } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const now = new Date();
  const lastThirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const lastSevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: university, error: universityError },
    { data: users, error: usersError },
    { data: notes, error: notesError },
    { data: noteAccess, error: noteAccessError },
    { data: verifications, error: verificationsError },
    { data: reports, error: reportsError },
    { data: posts, error: postsError },
    { data: comments, error: commentsError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase.from("universities").select("name").eq("id", appUser.university_id).maybeSingle(),
    admin
      .from("users")
      .select("id, full_name, role, mentor_active, mentor_approved, created_at")
      .eq("university_id", appUser.university_id)
      .eq("verified", true),
    admin
      .from("notes")
      .select("id, department, program_domain, created_at")
      .eq("university_id", appUser.university_id),
    admin.from("note_access").select("id, granted_at, note_id").gte("granted_at", lastThirtyDays),
    admin
      .from("verification_requests")
      .select("id, status, created_at")
      .eq("university_id", appUser.university_id),
    admin
      .from("community_reports")
      .select("id, status, created_at")
      .eq("university_id", appUser.university_id),
    admin
      .from("community_posts")
      .select("id, channel, user_id, created_at, helpful_count")
      .eq("university_id", appUser.university_id),
    admin
      .from("community_comments")
      .select("id, user_id, created_at")
      .eq("university_id", appUser.university_id),
    admin.from("payments").select("id, amount_paise, status, created_at, note_id"),
  ]);

  if (
    universityError ||
    usersError ||
    notesError ||
    noteAccessError ||
    verificationsError ||
    reportsError ||
    postsError ||
    commentsError ||
    paymentsError
  ) {
    throw new Error(
      universityError?.message ||
        usersError?.message ||
        notesError?.message ||
        noteAccessError?.message ||
        verificationsError?.message ||
        reportsError?.message ||
        postsError?.message ||
        commentsError?.message ||
        paymentsError?.message ||
        "Failed to load analytics.",
    );
  }

  const notesById = new Set((notes ?? []).map((item: any) => item.id));
  const scopedAccessRows = (noteAccess ?? []).filter((item: any) => notesById.has(item.note_id));
  const scopedPayments = (payments ?? []).filter(
    (payment: any) => payment.status === "success" && notesById.has(payment.note_id),
  );

  const adoption = {
    verifiedUsers: users?.length ?? 0,
    activeMentors:
      users?.filter((user: any) => user.mentor_active && user.mentor_approved).length ?? 0,
    notesPublished: notes?.length ?? 0,
    noteAccessLast30Days: scopedAccessRows.length,
  };

  const verificationSummary = {
    pending: verifications?.filter((item: any) => item.status === "pending").length ?? 0,
    approved: verifications?.filter((item: any) => item.status === "approved").length ?? 0,
    rejected: verifications?.filter((item: any) => item.status === "rejected").length ?? 0,
  };

  const moderationSummary = {
    open: reports?.filter((item: any) => item.status === "open").length ?? 0,
    reviewed: reports?.filter((item: any) => item.status === "reviewed").length ?? 0,
    dismissed: reports?.filter((item: any) => item.status === "dismissed").length ?? 0,
  };

  const revenueTotal = scopedPayments.reduce((sum: number, payment: any) => sum + payment.amount_paise, 0);
  const channelCounts = Object.entries(
    ((posts ?? []) as any[]).reduce<Record<string, number>>((accumulator: Record<string, number>, post: any) => {
      accumulator[post.channel] = (accumulator[post.channel] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((left: any, right: any) => right[1] - left[1]);

  const topContributors = Object.values(
    ([
      ...(posts ?? []).map((post: any) => ({
        helpful: post.helpful_count,
        posts: 1,
        replies: 0,
        userId: post.user_id,
      })),
      ...(comments ?? []).map((comment: any) => ({
        helpful: 0,
        posts: 0,
        replies: 1,
        userId: comment.user_id,
      })),
    ] as any[]).reduce<Record<string, { helpful: number; posts: number; replies: number; userId: string }>>(
      (accumulator: any, item: any) => {
        const existing = accumulator[item.userId] ?? {
          helpful: 0,
          posts: 0,
          replies: 0,
          userId: item.userId,
        };
        existing.helpful += item.helpful;
        existing.posts += item.posts;
        existing.replies += item.replies;
        accumulator[item.userId] = existing;
        return accumulator;
      },
      {},
    ),
  )
    .map((entry: any) => {
      const user = users?.find((item: any) => item.id === entry.userId);
      return {
        helpful: entry.helpful,
        name: user?.full_name?.trim() || "Campus Member",
        posts: entry.posts,
        replies: entry.replies,
        score: entry.helpful + entry.posts * 3 + entry.replies * 2,
      };
    })
    .sort((left: any, right: any) => right.score - left.score)
    .slice(0, 5);

  const recentPulse = {
    newPosts: posts?.filter((item: any) => item.created_at >= lastSevenDays).length ?? 0,
    newReplies: comments?.filter((item: any) => item.created_at >= lastSevenDays).length ?? 0,
    newReports: reports?.filter((item: any) => item.created_at >= lastSevenDays).length ?? 0,
    newUsers: users?.filter((item: any) => item.created_at >= lastSevenDays).length ?? 0,
  };

  return (
    <main className={`shell ${styles.page}`}>
      <section className={styles.topbar}>
        <div className={styles.titleWrap}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>
            Operational analytics for {university?.name ?? "your university"} across adoption,
            moderation, verification, notes, and contributor activity.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin">
            Admin Dashboard
          </Link>
          <Link className="button secondary small" href="/campus-network">
            CampusGO
          </Link>
          <Link className="button secondary small" href="/admin/payments">
            Payments
          </Link>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{formatCount(adoption.verifiedUsers)}</span>
          <span className={styles.statLabel}>Verified users</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{formatCount(adoption.notesPublished)}</span>
          <span className={styles.statLabel}>Published notes</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{formatCount(adoption.noteAccessLast30Days)}</span>
          <span className={styles.statLabel}>Note accesses in 30 days</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{formatCurrency(revenueTotal)}</span>
          <span className={styles.statLabel}>Recorded payment revenue</span>
        </article>
      </section>

      <section className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Verification and Moderation</h2>
            <p className={styles.sectionSubtitle}>Track approval volume and report load before they become bottlenecks.</p>
          </div>
          <div className={styles.surfaceGrid}>
            <article className={styles.surfaceCard}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Verification queue</span>
                <span className={`${styles.statusPill} ${styles.statusWarning}`}>{verificationSummary.pending} pending</span>
              </div>
              <div className={styles.pillRow}>
                <span className={styles.pill}>{verificationSummary.approved} approved</span>
                <span className={styles.pill}>{verificationSummary.rejected} rejected</span>
              </div>
            </article>
            <article className={styles.surfaceCard}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>Community reports</span>
                <span className={`${styles.statusPill} ${styles.statusWarning}`}>{moderationSummary.open} open</span>
              </div>
              <div className={styles.pillRow}>
                <span className={styles.pill}>{moderationSummary.reviewed} reviewed</span>
                <span className={styles.pill}>{moderationSummary.dismissed} dismissed</span>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>7-Day Pulse</h2>
            <p className={styles.sectionSubtitle}>Short horizon indicators for whether CampusGO is moving.</p>
          </div>
          <div className={styles.list}>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>New posts</span>
                <span className={styles.pill}>{recentPulse.newPosts}</span>
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>New replies</span>
                <span className={styles.pill}>{recentPulse.newReplies}</span>
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>New verified users</span>
                <span className={styles.pill}>{recentPulse.newUsers}</span>
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>New reports</span>
                <span className={styles.pill}>{recentPulse.newReports}</span>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Discussion Channel Mix</h2>
            <p className={styles.sectionSubtitle}>Channel distribution across community posts.</p>
          </div>
          <div className={styles.list}>
            {channelCounts.length === 0 ? (
              <div className={styles.listItem}>
                <p className={styles.primaryText}>No channel activity yet</p>
                <p className={styles.mutedText}>Community posts will appear here when users begin posting.</p>
              </div>
            ) : (
              channelCounts.map(([channel, count]) => (
                <div className={styles.listItem} key={channel}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{channel}</span>
                    <span className={styles.pill}>{count} posts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Top Contributors</h2>
            <p className={styles.sectionSubtitle}>Weighted by helpful actions, posts, and replies.</p>
          </div>
          <div className={styles.list}>
            {topContributors.length === 0 ? (
              <div className={styles.listItem}>
                <p className={styles.primaryText}>No contributor data yet</p>
                <p className={styles.mutedText}>Once community activity grows, high-signal contributors will rank here.</p>
              </div>
            ) : (
              topContributors.map((entry) => (
                <div className={styles.listItem} key={entry.name}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{entry.name}</span>
                    <span className={styles.pill}>Score {entry.score}</span>
                  </div>
                  <div className={styles.pillRow}>
                    <span className={styles.pill}>{entry.posts} posts</span>
                    <span className={styles.pill}>{entry.replies} replies</span>
                    <span className={styles.pill}>{entry.helpful} helpful</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
