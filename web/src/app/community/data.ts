import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type CommunityPostRow = Database["public"]["Tables"]["community_posts"]["Row"];
type PartnerRequestRow = Database["public"]["Tables"]["community_partner_requests"]["Row"];
type CommunityReportRow = Database["public"]["Tables"]["community_reports"]["Row"];
type CommunityCommentRow = Database["public"]["Tables"]["community_comments"]["Row"];
type CommunityPostVoteRow = Database["public"]["Tables"]["community_post_votes"]["Row"];
type CommunityCommentVoteRow = Database["public"]["Tables"]["community_comment_votes"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type CommunityChannel = Database["public"]["Tables"]["community_posts"]["Row"]["channel"];

type UniversityUser = Pick<UserRow, "id" | "full_name" | "department" | "program_domain" | "role">;

export type CommunityDiscussion = {
  id: string;
  channel: CommunityChannel;
  title: string;
  author: string;
  authorInitials: string;
  role: string;
  summary: string;
  tags: string[];
  timeLabel: string;
  replies: number;
  helpfulCount: number;
  trustScore: number;
  badge: string;
  status: string;
  moderationState: Database["public"]["Tables"]["community_posts"]["Row"]["moderation_state"];
  viewerHasVoted: boolean;
};

export type WeeklyUpdate = {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
};

export type Contributor = {
  id: string;
  name: string;
  initials: string;
  badge: string;
  reputation: number;
  subtitle: string;
};

export type MatchCard = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  openRoles: string;
  teamSize: string;
  status: Database["public"]["Tables"]["community_partner_requests"]["Row"]["status"];
  canManage: boolean;
  matchedByCurrentUser: boolean;
};

export type CommunityComment = {
  id: string;
  author: string;
  authorInitials: string;
  role: string;
  body: string;
  timeLabel: string;
  helpfulCount: number;
  viewerHasVoted: boolean;
  replies: CommunityComment[];
};

export type CommunityPostDetail = {
  post: CommunityDiscussion & { topic: string | null };
  comments: CommunityComment[];
  relatedPartnerRequests: MatchCard[];
};

export type LeaderboardData = {
  entries: Contributor[];
  totals: {
    contributors: number;
    posts: number;
    comments: number;
  };
};

export type CommunityData = {
  discussions: CommunityDiscussion[];
  weeklyUpdates: WeeklyUpdate[];
  contributors: Contributor[];
  matchCards: MatchCard[];
  openReports: number;
};

type BuildCommunityDataOptions = {
  universityId: string;
  currentUserId?: string;
  currentUserRole?: UserRow["role"];
};

type ContributorStats = {
  posts: number;
  comments: number;
  helpful: number;
  reputation: number;
};

const EMPTY_COMMUNITY_DATA: CommunityData = {
  discussions: [],
  weeklyUpdates: [],
  contributors: [],
  matchCards: [],
  openReports: 0,
};

const WEEKLY_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "U";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function formatRelativeTime(value: string) {
  const now = Date.now();
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffHours = Math.max(1, Math.floor((now - timestamp) / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function isWithinWeeklyWindow(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= WEEKLY_WINDOW_MS;
}

function buildRoleLabel(user: Pick<UserRow, "program_domain" | "department" | "role"> | undefined) {
  if (!user) {
    return "Campus Member";
  }

  const parts = [user.program_domain, user.department].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(", ");
  }

  return user.role === "admin" ? "Campus Admin" : user.role === "senior" ? "Senior Member" : "Campus Member";
}

function buildContributorSubtitle(stats: ContributorStats, reports: number) {
  if (reports > 0) {
    return `Moderated ${reports} reports, ${stats.comments} comments, and ${stats.helpful} helpful actions`;
  }

  if (stats.comments > 0) {
    return `${stats.comments} replies across ${stats.posts} posts`;
  }

  return `${stats.posts} campus contributions`;
}

function buildDiscussion(
  post: CommunityPostRow,
  usersById: Map<string, UniversityUser>,
  votedPostIds: Set<string>,
): CommunityDiscussion {
  const author = usersById.get(post.user_id);
  return {
    id: post.id,
    channel: post.channel,
    title: post.title,
    author: author?.full_name ?? "Campus Member",
    authorInitials: getInitials(author?.full_name),
    role: buildRoleLabel(author),
    summary: post.summary,
    tags: post.tags,
    timeLabel: formatRelativeTime(post.created_at),
    replies: post.reply_count,
    helpfulCount: post.helpful_count,
    trustScore: post.trust_score,
    badge: post.badge_label ?? "Contributor",
    status: post.status_label,
    moderationState: post.moderation_state,
    viewerHasVoted: votedPostIds.has(post.id),
  };
}

function buildMatchCards(
  partners: PartnerRequestRow[],
  currentUserId?: string,
  currentUserRole?: UserRow["role"],
) {
  return partners.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    skills: item.skills,
    openRoles: item.open_roles,
    teamSize: item.team_size_label,
    status: item.status,
    canManage:
      Boolean(currentUserId) &&
      (item.user_id === currentUserId || currentUserRole === "admin"),
    matchedByCurrentUser: item.matched_by === currentUserId,
  } satisfies MatchCard));
}

function buildContributorEntries(
  posts: CommunityPostRow[],
  comments: CommunityCommentRow[],
  reports: CommunityReportRow[],
  usersById: Map<string, UniversityUser>,
) {
  const contributorStats = new Map<string, ContributorStats>();

  for (const post of posts) {
    const current = contributorStats.get(post.user_id) ?? { posts: 0, comments: 0, helpful: 0, reputation: 0 };
    current.posts += 1;
    current.helpful += post.helpful_count;
    current.reputation += post.trust_score + post.helpful_count + post.reply_count;
    contributorStats.set(post.user_id, current);
  }

  for (const comment of comments) {
    const current = contributorStats.get(comment.user_id) ?? { posts: 0, comments: 0, helpful: 0, reputation: 0 };
    current.comments += 1;
    current.helpful += comment.helpful_count;
    current.reputation += 12 + comment.helpful_count * 2;
    contributorStats.set(comment.user_id, current);
  }

  const reportCountsByUser = new Map<string, number>();
  for (const report of reports) {
    reportCountsByUser.set(report.user_id, (reportCountsByUser.get(report.user_id) ?? 0) + 1);
  }

  return Array.from(contributorStats.entries())
    .map(([userId, stats]) => {
      const user = usersById.get(userId);
      return {
        id: userId,
        name: user?.full_name ?? "Campus Member",
        initials: getInitials(user?.full_name),
        badge: stats.reputation >= 140 ? "Academic Lead" : stats.reputation >= 100 ? "Mentor" : "Contributor",
        reputation: stats.reputation,
        subtitle: buildContributorSubtitle(stats, reportCountsByUser.get(userId) ?? 0),
      } satisfies Contributor;
    })
    .sort((left, right) => right.reputation - left.reputation);
}

function buildCommentTree(
  comments: CommunityCommentRow[],
  usersById: Map<string, UniversityUser>,
  votedCommentIds: Set<string>,
) {
  const byParent = new Map<string | null, CommunityCommentRow[]>();
  for (const comment of comments) {
    const parentKey = comment.parent_id ?? null;
    const bucket = byParent.get(parentKey) ?? [];
    bucket.push(comment);
    byParent.set(parentKey, bucket);
  }

  const mapNode = (comment: CommunityCommentRow): CommunityComment => {
    const author = usersById.get(comment.user_id);
    return {
      id: comment.id,
      author: author?.full_name ?? "Campus Member",
      authorInitials: getInitials(author?.full_name),
      role: buildRoleLabel(author),
      body: comment.body,
      timeLabel: formatRelativeTime(comment.created_at),
      helpfulCount: comment.helpful_count,
      viewerHasVoted: votedCommentIds.has(comment.id),
      replies: (byParent.get(comment.id) ?? []).map(mapNode),
    };
  };

  return (byParent.get(null) ?? []).map(mapNode);
}

async function fetchCommunityBase(universityId: string) {
  const admin = createSupabaseAdminClient();
  const [postsResponse, partnerResponse, reportsResponse, commentsResponse, usersResponse] = await Promise.all([
    admin.from("community_posts").select("*").eq("university_id", universityId).order("created_at", { ascending: false }).limit(48),
    admin.from("community_partner_requests").select("*").eq("university_id", universityId).order("created_at", { ascending: false }).limit(20),
    admin.from("community_reports").select("*").eq("university_id", universityId),
    admin.from("community_comments").select("*").eq("university_id", universityId).order("created_at", { ascending: true }),
    admin.from("users").select("id, full_name, department, program_domain, role").eq("university_id", universityId).eq("verified", true),
  ]);

  if (postsResponse.error || partnerResponse.error || reportsResponse.error || commentsResponse.error || usersResponse.error) {
    return null;
  }

  return {
    comments: (commentsResponse.data ?? []) as CommunityCommentRow[],
    partners: (partnerResponse.data ?? []) as PartnerRequestRow[],
    posts: (postsResponse.data ?? []) as CommunityPostRow[],
    reports: (reportsResponse.data ?? []) as CommunityReportRow[],
    users: (usersResponse.data ?? []) as UniversityUser[],
  };
}

async function fetchVoteState(
  universityId: string,
  currentUserId?: string,
): Promise<{
  commentVoteIds: Set<string>;
  postVoteIds: Set<string>;
}> {
  if (!currentUserId) {
    return {
      commentVoteIds: new Set<string>(),
      postVoteIds: new Set<string>(),
    };
  }

  const admin = createSupabaseAdminClient();
  const [postVotesResponse, commentVotesResponse] = await Promise.all([
    admin
      .from("community_post_votes")
      .select("post_id")
      .eq("university_id", universityId)
      .eq("user_id", currentUserId),
    admin
      .from("community_comment_votes")
      .select("comment_id")
      .eq("university_id", universityId)
      .eq("user_id", currentUserId),
  ]);

  return {
    commentVoteIds: new Set(
      ((commentVotesResponse.data ?? []) as Pick<CommunityCommentVoteRow, "comment_id">[]).map(
        (item) => item.comment_id,
      ),
    ),
    postVoteIds: new Set(
      ((postVotesResponse.data ?? []) as Pick<CommunityPostVoteRow, "post_id">[]).map(
        (item) => item.post_id,
      ),
    ),
  };
}

export async function buildCommunityData({
  universityId,
  currentUserId,
  currentUserRole,
}: BuildCommunityDataOptions): Promise<CommunityData> {
  try {
    const base = await fetchCommunityBase(universityId);
    if (!base) {
      return EMPTY_COMMUNITY_DATA;
    }

    const voteState = await fetchVoteState(universityId, currentUserId);
    const usersById = new Map(base.users.map((user) => [user.id, user]));
    const discussions = base.posts.map((post) =>
      buildDiscussion(post, usersById, voteState.postVoteIds),
    );
    const recentWeeklyPosts = base.posts.filter((post) => isWithinWeeklyWindow(post.created_at));
    const weeklyCandidates = recentWeeklyPosts
      .filter((post) => post.is_weekly_highlight)
      .slice(0, 3);
    const weeklySource = weeklyCandidates.length > 0
      ? weeklyCandidates
      : recentWeeklyPosts.slice(0, 3);
    const weeklyUpdates = weeklySource.map((post) => ({
      id: post.id,
      title: post.highlight_title ?? post.title,
      subtitle: post.highlight_subtitle ?? `${post.reply_count} replies and ${post.helpful_count} helpful actions`,
      timeLabel: formatRelativeTime(post.created_at),
    } satisfies WeeklyUpdate));

    const contributors = buildContributorEntries(base.posts, base.comments, base.reports, usersById).slice(0, 3);

    return {
      discussions,
      weeklyUpdates,
      contributors,
      matchCards: buildMatchCards(
        base.partners,
        currentUserId,
        currentUserRole,
      ).slice(0, 3),
      openReports: base.reports.filter((report) => report.status === "open").length,
    };
  } catch {
    return EMPTY_COMMUNITY_DATA;
  }
}

export async function buildCommunityLeaderboardData({ universityId }: BuildCommunityDataOptions): Promise<LeaderboardData> {
  const base = await fetchCommunityBase(universityId);
  if (!base) {
    return {
      entries: [],
      totals: {
        comments: 0,
        contributors: 0,
        posts: 0,
      },
    };
  }

  const usersById = new Map(base.users.map((user) => [user.id, user]));
  const entries = buildContributorEntries(base.posts, base.comments, base.reports, usersById);

  return {
    entries,
    totals: {
      comments: base.comments.length,
      contributors: entries.length,
      posts: base.posts.length,
    },
  };
}

export async function buildCommunityPostDetail({
  postId,
  universityId,
  currentUserId,
  currentUserRole,
}: BuildCommunityDataOptions & { postId: string }): Promise<CommunityPostDetail | null> {
  const base = await fetchCommunityBase(universityId);
  if (!base) {
    return null;
  }

  const targetPost = base.posts.find((post) => post.id === postId);
  if (!targetPost) {
    return null;
  }

  const usersById = new Map(base.users.map((user) => [user.id, user]));
  const postComments = base.comments.filter((comment) => comment.post_id === postId);
  const voteState = await fetchVoteState(universityId, currentUserId);

  return {
    comments: buildCommentTree(postComments, usersById, voteState.commentVoteIds),
    post: {
      ...buildDiscussion(targetPost, usersById, voteState.postVoteIds),
      topic: targetPost.topic,
    },
    relatedPartnerRequests: buildMatchCards(
      base.partners,
      currentUserId,
      currentUserRole,
    ).slice(0, 3),
  };
}
