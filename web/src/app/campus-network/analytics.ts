import type { SupabaseClient } from "@supabase/supabase-js";
import {
  filterActiveCampusWeeklyItems,
  formatCampusWeeklyCategoryLabel,
  listCampusWeeklyItemsForUniversity,
} from "@/lib/campus-weekly";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type AppSupabaseClient = SupabaseClient<Database>;

type NoteLite = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type DoubtLite = {
  assigned_to: string | null;
  created_at: string;
  description: string;
  id: string;
  status: Database["public"]["Tables"]["doubts"]["Row"]["status"];
  title: string;
  updated_at: string;
  user_id: string;
};

type CommunityPostLite = Pick<
  Database["public"]["Tables"]["community_posts"]["Row"],
  "id" | "title" | "summary" | "channel" | "created_at" | "status_label"
>;

export type WeeklyTopSubjectData = {
  subjectName: string;
  topics: string[];
  newNotes: number;
  ctaHref: string;
  ctaLabel: string;
};

export type WeeklyExamData = {
  examLabel: string;
  countdownLabel: string;
  revisionHighlights: string[];
  ctaHref: string;
  ctaLabel: string;
};

export type WeeklyDiscussionData = {
  discussionTitle: string;
  subjectTag: string;
  replies: number;
  contributorName: string;
  contributorInitials: string;
  ctaHref: string;
  ctaLabel: string;
};

export type WeeklyProjectData = {
  title: string;
  description: string;
  teamSizeLabel: string;
  domainTag: string;
  ctaHref: string;
  ctaLabel: string;
};

export type CampusUpdateBanner = {
  id: string;
  kind: "Achievement" | "Event" | "Discussion" | "Project" | "Bulletin";
  eyebrow: string;
  headline: string;
  body: string;
  meta: string;
  pill: string;
  ctaHref: string;
  ctaLabel: string;
};

export type CampusWeeklyBanner = {
  id: string;
  headline: string;
  body: string;
  eyebrow: string;
  meta: string;
  pill: string;
  href: string;
  ctaLabel: string;
  external: boolean;
};

export type CampusWeeklyAnnouncement = {
  id: string;
  title: string;
  subtitle: string;
  channelLabel: string;
  timeLabel: string;
  href: string;
  badge: string;
};

export type CampusAnalyticsData = {
  liveStats: {
    verifiedStudents: number;
    notesUpdatedMonth: number;
    activeMentors: number;
  };
  campusUpdates: CampusUpdateBanner[];
  thisWeek: {
    announcements: CampusWeeklyAnnouncement[];
    banners: CampusWeeklyBanner[];
    periodLabel: string;
  };
  weekly: {
    periodLabel: string;
    topSubject: WeeklyTopSubjectData;
    examPrep: WeeklyExamData;
    discussion: WeeklyDiscussionData;
    project: WeeklyProjectData;
  };
};

type BuildCampusAnalyticsOptions = {
  profileDomain: string | null;
  supabase: AppSupabaseClient;
  universityId: string;
  universityName: string;
};

const DEFAULT_TOP_SUBJECT: WeeklyTopSubjectData = {
  subjectName: "Operating Systems",
  topics: ["Memory Management", "Deadlock Handling", "Process Scheduling"],
  newNotes: 0,
  ctaHref: "/browse-notes",
  ctaLabel: "Browse notes",
};

const DEFAULT_EXAM: WeeklyExamData = {
  examLabel: "MTE",
  countdownLabel: "Exam in 11 days",
  revisionHighlights: ["Key MTE Topics", "Revision Notes", "Mock Questions"],
  ctaHref: "/browse-notes",
  ctaLabel: "Browse revision notes",
};

const DEFAULT_DISCUSSION: WeeklyDiscussionData = {
  discussionTitle: "How can we improve preparation this week?",
  subjectTag: "General",
  replies: 0,
  contributorName: "Campus Mentor",
  contributorInitials: "CM",
  ctaHref: "/community",
  ctaLabel: "Open discussion",
};

const DEFAULT_PROJECT: WeeklyProjectData = {
  title: "AI-Powered Chatbot",
  description: "Student-built assistant for campus notes and doubt routing.",
  teamSizeLabel: "4 Members",
  domainTag: "CSE / IT",
  ctaHref: "/community",
  ctaLabel: "View project",
};

const PROJECT_KEYWORD_FILTER =
  "title.ilike.%project%,description.ilike.%project%,title.ilike.%build%,description.ilike.%build%,title.ilike.%hackathon%,description.ilike.%hackathon%,title.ilike.%prototype%,description.ilike.%prototype%";
const EXAM_KEYWORD_FILTER =
  "title.ilike.%exam%,description.ilike.%exam%,title.ilike.%mte%,description.ilike.%mte%,title.ilike.%ete%,description.ilike.%ete%,title.ilike.%revision%,description.ilike.%revision%";
const EVENT_KEYWORD_FILTER =
  "title.ilike.%event%,description.ilike.%event%,title.ilike.%workshop%,description.ilike.%workshop%,title.ilike.%seminar%,description.ilike.%seminar%,title.ilike.%hackathon%,description.ilike.%hackathon%,title.ilike.%drive%,description.ilike.%drive%,title.ilike.%fest%,description.ilike.%fest%";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function subtractDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() - days);
  return next;
}

function formatPeriodLabel(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Active now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffHours = Math.max(1, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "CM";
  }

  const chunks = value
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (chunks.length === 0) {
    return "CM";
  }

  if (chunks.length === 1) {
    return chunks[0].slice(0, 2).toUpperCase();
  }

  return `${chunks[0].slice(0, 1)}${chunks[1].slice(0, 1)}`.toUpperCase();
}

function uniqueTake(values: string[], limit: number) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) {
      continue;
    }
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function normalizeSubject(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "General";
  }

  return compact
    .split(" ")
    .slice(0, 6)
    .map((word) => {
      if (word.length <= 3) {
        return word.toUpperCase();
      }
      return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function extractSubjectAndTopic(title: string) {
  const compact = title.replace(/\s+/g, " ").trim();
  if (!compact) {
    return { subject: "General", topic: "Updated topics" };
  }

  const separatorMatch = compact.match(/^(.+?)\s(?:-|:|\|)\s(.+)$/);
  if (separatorMatch) {
    return {
      subject: normalizeSubject(separatorMatch[1]),
      topic: separatorMatch[2].trim(),
    };
  }

  const words = compact.split(" ");
  if (words.length >= 4) {
    return {
      subject: normalizeSubject(words.slice(0, 2).join(" ")),
      topic: words.slice(2).join(" "),
    };
  }

  return {
    subject: normalizeSubject(compact),
    topic: compact,
  };
}

function findDateCandidates(text: string) {
  const candidates: Date[] = [];

  const isoMatches = text.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g);
  for (const match of isoMatches) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) {
      candidates.push(date);
    }
  }

  const dmyMatches = text.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/g);
  for (const match of dmyMatches) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) {
      candidates.push(date);
    }
  }

  return candidates;
}

function getExamTypeFromText(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("ete")) {
    return "ETE";
  }
  if (lower.includes("mte")) {
    return "MTE";
  }
  if (lower.includes("mid sem") || lower.includes("midterm")) {
    return "MTE";
  }
  return "Exam";
}

function deterministicTeamSize(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return 3 + (hash % 4);
}

function shorten(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

async function getContributorsById(
  adminClient: AppSupabaseClient | null,
  contributorIds: string[],
) {
  if (!adminClient || contributorIds.length === 0) {
    return new Map<string, { full_name: string | null; program_domain: string | null }>();
  }

  const { data } = await adminClient
    .from("users")
    .select("id, full_name, program_domain")
    .in("id", contributorIds);

  const map = new Map<string, { full_name: string | null; program_domain: string | null }>();
  for (const row of data ?? []) {
    map.set(row.id, {
      full_name: row.full_name,
      program_domain: row.program_domain,
    });
  }

  return map;
}

function buildTopSubjectCard(
  weeklyNotes: NoteLite[],
  fallbackNotes: NoteLite[],
): WeeklyTopSubjectData {
  const sourceNotes = weeklyNotes.length > 0 ? weeklyNotes : fallbackNotes;
  if (sourceNotes.length === 0) {
    return DEFAULT_TOP_SUBJECT;
  }

  const buckets = new Map<string, { count: number; topics: string[] }>();
  for (const note of sourceNotes) {
    const parsed = extractSubjectAndTopic(note.title);
    const bucket = buckets.get(parsed.subject) ?? { count: 0, topics: [] };
    bucket.count += 1;
    bucket.topics.push(parsed.topic);
    buckets.set(parsed.subject, bucket);
  }

  const topBucket = [...buckets.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (!topBucket) {
    return DEFAULT_TOP_SUBJECT;
  }

  const [subjectName, summary] = topBucket;
  return {
    subjectName,
    topics: uniqueTake(summary.topics, 3),
    newNotes: summary.count,
    ctaHref: "/browse-notes",
    ctaLabel: "Browse notes",
  };
}

function buildExamCard(now: Date, examNotes: NoteLite[]): WeeklyExamData {
  if (examNotes.length === 0) {
    return DEFAULT_EXAM;
  }

  const textBlob = examNotes
    .map((note) => `${note.title} ${note.description ?? ""}`)
    .join(" ");
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dateCandidates = findDateCandidates(textBlob)
    .filter((candidate) => candidate.getTime() >= nowStart.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  const nextDate = dateCandidates[0] ?? new Date(now.getTime() + 11 * MS_PER_DAY);
  const countdownDays = Math.max(1, Math.ceil((nextDate.getTime() - now.getTime()) / MS_PER_DAY));
  const examLabel = getExamTypeFromText(textBlob);

  return {
    examLabel,
    countdownLabel: `${examLabel} in ${countdownDays} ${countdownDays === 1 ? "day" : "days"}`,
    revisionHighlights: uniqueTake(
      examNotes.map((note) => note.title).slice(0, 4),
      3,
    ),
    ctaHref: "/browse-notes",
    ctaLabel: "Browse revision notes",
  };
}

function buildDiscussionCard(
  weeklyDoubts: DoubtLite[],
  fallbackDoubts: DoubtLite[],
  contributors: Map<string, { full_name: string | null; program_domain: string | null }>,
): WeeklyDiscussionData {
  const source = weeklyDoubts.length > 0 ? weeklyDoubts : fallbackDoubts;
  if (source.length === 0) {
    return DEFAULT_DISCUSSION;
  }

  const sortedByActivity = [...source].sort((a, b) => {
    const repliesA =
      1 + (a.assigned_to ? 2 : 0) + (a.status === "resolved" ? 3 : a.status === "assigned" ? 1 : 0);
    const repliesB =
      1 + (b.assigned_to ? 2 : 0) + (b.status === "resolved" ? 3 : b.status === "assigned" ? 1 : 0);
    return repliesB - repliesA;
  });

  const best = sortedByActivity[0];
  const replies =
    1 +
    (best.assigned_to ? 2 : 0) +
    (best.status === "resolved" ? 3 : best.status === "assigned" ? 1 : 0);
  const contributorId = best.assigned_to ?? best.user_id;
  const contributorName = contributors.get(contributorId)?.full_name ?? "Campus Mentor";
  const parsed = extractSubjectAndTopic(best.title);

  return {
    discussionTitle: shorten(best.title, 72),
    subjectTag: parsed.subject,
    replies,
    contributorName,
    contributorInitials: getInitials(contributorName),
    ctaHref: "/community",
    ctaLabel: "Open discussion",
  };
}

function buildProjectCard(
  projectDoubts: DoubtLite[],
  contributors: Map<string, { full_name: string | null; program_domain: string | null }>,
  fallbackDomain: string | null,
): WeeklyProjectData {
  if (projectDoubts.length === 0) {
    return {
      ...DEFAULT_PROJECT,
      domainTag: fallbackDomain ? fallbackDomain.toUpperCase() : DEFAULT_PROJECT.domainTag,
    };
  }

  const featured = projectDoubts[0];
  const owner = contributors.get(featured.user_id);
  const teamSize = deterministicTeamSize(featured.id);
  const domainTag = owner?.program_domain ?? fallbackDomain ?? "Campus Innovation";

  return {
    title: shorten(featured.title, 54),
    description: shorten(featured.description, 100),
    teamSizeLabel: `${teamSize} Members`,
    domainTag: domainTag.toUpperCase(),
    ctaHref: "/community",
    ctaLabel: "View project",
  };
}

function buildCampusUpdates({
  eventNotes,
  examPrep,
  fallbackDomain,
  liveStats,
  project,
  topSubject,
  discussion,
  universityName,
}: {
  eventNotes: NoteLite[];
  examPrep: WeeklyExamData;
  fallbackDomain: string;
  liveStats: CampusAnalyticsData["liveStats"];
  project: WeeklyProjectData;
  topSubject: WeeklyTopSubjectData;
  discussion: WeeklyDiscussionData;
  universityName: string;
}): CampusUpdateBanner[] {
  const campusShortName = universityName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const eventSource = eventNotes[0];

  const eventBanner: CampusUpdateBanner = eventSource
    ? {
        id: "event",
        kind: "Event",
        eyebrow: "Campus event",
        headline: shorten(eventSource.title, 56),
        body: shorten(
          eventSource.description ??
            `${campusShortName} has a live event update this week. Open the banner to review timing and access details.`,
          110,
        ),
        meta: "Registration or details are live now",
        pill: "Event",
        ctaHref: "/community",
        ctaLabel: "Open update",
      }
    : {
        id: "event",
        kind: "Event",
        eyebrow: "Upcoming event",
        headline: `${examPrep.examLabel} preparation window is live`,
        body: `${examPrep.countdownLabel}. Focus this week on ${examPrep.revisionHighlights
          .slice(0, 2)
          .join(" and ")} before the pace spikes.`,
        meta: "Academic timeline",
        pill: "Prep",
        ctaHref: examPrep.ctaHref,
        ctaLabel: examPrep.ctaLabel,
      };

  return [
    {
      id: "achievement",
      kind: "Achievement",
      eyebrow: "Campus achievement",
      headline:
        topSubject.newNotes > 0
          ? `${topSubject.newNotes} new uploads just landed in ${topSubject.subjectName}`
          : `${topSubject.subjectName} is setting the study pace this week`,
      body:
        topSubject.topics.length > 0
          ? `The sharpest movement came from ${topSubject.topics.slice(0, 2).join(" and ")}.`
          : "Fresh note activity is keeping the campus study board alive this week.",
      meta: "Rolling 7-day academic pulse",
      pill: topSubject.subjectName,
      ctaHref: topSubject.ctaHref,
      ctaLabel: "Browse updates",
    },
    eventBanner,
    {
      id: "discussion",
      kind: "Discussion",
      eyebrow: "Live discussion",
      headline: shorten(discussion.discussionTitle, 58),
      body: `${discussion.replies} replies this week. ${discussion.contributorName} is currently pushing this thread forward.`,
      meta: `#${discussion.subjectTag}`,
      pill: "Discussion",
      ctaHref: discussion.ctaHref,
      ctaLabel: "Join thread",
    },
    {
      id: "project",
      kind: "Project",
      eyebrow: "Builder spotlight",
      headline: project.title,
      body: `${project.description} ${project.teamSizeLabel} are already inside the current build loop.`,
      meta: project.domainTag,
      pill: "Project",
      ctaHref: project.ctaHref,
      ctaLabel: "View project",
    },
    {
      id: "bulletin",
      kind: "Bulletin",
      eyebrow: "Campus bulletin",
      headline: `${liveStats.verifiedStudents} verified students are active inside ${campusShortName}`,
      body: `${liveStats.activeMentors} active mentors and ${liveStats.notesUpdatedMonth} monthly note updates keep the ${fallbackDomain.toLowerCase()} network moving.`,
    meta: "CampusGO footprint",
      pill: "Network",
      ctaHref: "/community",
      ctaLabel: "Open board",
    },
  ];
}

async function buildThisWeekPayload(params: {
  discussion: WeeklyDiscussionData;
  eventNotes: NoteLite[];
  periodLabel: string;
  project: WeeklyProjectData;
  readClient: AppSupabaseClient;
  topSubject: WeeklyTopSubjectData;
  universityId: string;
  universityName: string;
  weeklyDoubts: DoubtLite[];
}) {
  const weeklySource = await listCampusWeeklyItemsForUniversity(params.universityId);
  const scopedItems = filterActiveCampusWeeklyItems(weeklySource.items);
  const bannerRows = scopedItems.filter((item) => item.item_type === "banner");
  const announcementRows = scopedItems.filter((item) => item.item_type === "announcement");
  const announcementPostIds = announcementRows
    .map((item) => item.community_post_id)
    .filter((value): value is string => Boolean(value));

  let announcementPostsById = new Map<string, CommunityPostLite>();
  if (announcementPostIds.length > 0) {
    const { data: posts, error } = await params.readClient
      .from("community_posts")
      .select("id, title, summary, channel, created_at, status_label")
      .in("id", announcementPostIds);

    if (!error) {
      announcementPostsById = new Map(
        ((posts ?? []) as CommunityPostLite[]).map((item) => [item.id, item]),
      );
    }
  }

  const liveBanners: CampusWeeklyBanner[] = bannerRows.map((item) => ({
    id: item.id,
    headline: shorten(item.title, 64),
    body: shorten(
      item.description ??
        item.subtitle ??
        "Campus registration is open. Review the brief and complete the next step from the registration page.",
      132,
    ),
    eyebrow: item.eyebrow?.trim() || `${formatCampusWeeklyCategoryLabel(item.category)} signal`,
    meta:
      item.meta_label?.trim() ||
      (item.ends_at ? `Active until ${formatShortDate(item.ends_at)}` : "Campus registration link"),
    pill: item.pill_label?.trim() || formatCampusWeeklyCategoryLabel(item.category),
    href: item.target_url ?? "/community",
    ctaLabel: item.cta_label?.trim() || "Register now",
    external: item.target_type === "external",
  }));

  const liveAnnouncements: CampusWeeklyAnnouncement[] = announcementRows
    .map((item) => {
      const linkedPost = item.community_post_id
        ? announcementPostsById.get(item.community_post_id)
        : undefined;

      return {
        id: item.id,
        title: shorten(item.title || linkedPost?.title || "Campus announcement", 80),
        subtitle: shorten(
          item.description ??
            item.subtitle ??
            linkedPost?.summary ??
            "Open the campus discussion thread to read the full update and replies.",
          140,
        ),
        channelLabel: linkedPost?.channel ?? formatCampusWeeklyCategoryLabel(item.category),
        timeLabel: item.meta_label?.trim() || formatRelativeTime(linkedPost?.created_at ?? item.created_at),
        href: item.community_post_id ? `/community/${item.community_post_id}` : "/community",
        badge: item.pill_label?.trim() || linkedPost?.status_label || "Announcement",
      } satisfies CampusWeeklyAnnouncement;
    })
    .filter(Boolean);

  if (liveBanners.length > 0 || liveAnnouncements.length > 0) {
    return {
      announcements: liveAnnouncements,
      banners: liveBanners,
      periodLabel: params.periodLabel,
    };
  }

  const fallbackBanners = buildCampusUpdates({
    eventNotes: params.eventNotes,
    examPrep: {
      ...DEFAULT_EXAM,
      countdownLabel: params.periodLabel,
    },
    fallbackDomain: params.topSubject.subjectName,
    liveStats: {
      activeMentors: 0,
      notesUpdatedMonth: params.topSubject.newNotes,
      verifiedStudents: 0,
    },
    project: params.project,
    topSubject: params.topSubject,
    discussion: params.discussion,
    universityName: params.universityName,
  })
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      headline: item.headline,
      body: item.body,
      eyebrow: item.eyebrow,
      meta: item.meta,
      pill: item.pill,
      href: item.ctaHref,
      ctaLabel: item.ctaLabel,
      external: false,
    }));

  const fallbackAnnouncements = params.weeklyDoubts.slice(0, 4).map((item) => ({
    id: item.id,
    title: shorten(item.title, 82),
    subtitle: shorten(item.description, 140),
    channelLabel: "Campus discussion",
    timeLabel: formatRelativeTime(item.updated_at),
    href: "/community",
    badge: item.status === "resolved" ? "Resolved" : item.status === "assigned" ? "Assigned" : "Open",
  }));

  if (fallbackAnnouncements.length === 0) {
    fallbackAnnouncements.push({
      id: "discussion-fallback",
      title: shorten(params.discussion.discussionTitle, 82),
      subtitle: `${params.discussion.replies} replies are currently building momentum inside the campus board.`,
      channelLabel: params.discussion.subjectTag,
      timeLabel: "This week",
      href: params.discussion.ctaHref,
      badge: "Campus discussion",
    });
  }

  return {
    announcements: fallbackAnnouncements,
    banners: fallbackBanners,
    periodLabel: params.periodLabel,
  };
}

export async function buildCampusAnalytics({
  profileDomain,
  supabase,
  universityId,
  universityName,
}: BuildCampusAnalyticsOptions): Promise<CampusAnalyticsData> {
  const now = new Date();
  const weekStart = subtractDays(now, 7);
  const monthStart = subtractDays(now, 30);
  const weekStartIso = weekStart.toISOString();
  const monthStartIso = monthStart.toISOString();
  const fallbackDomainFromUniversity = universityName
    .split(" ")
    .slice(0, 2)
    .join(" ")
    .toUpperCase();

  let adminClient: AppSupabaseClient | null = null;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    adminClient = null;
  }

  const readClient = adminClient ?? supabase;

  const [
    verifiedStudentsResult,
    notesMonthResult,
    mentorsResult,
    weeklyNotesResult,
    fallbackNotesResult,
    examNotesResult,
    eventNotesResult,
    weeklyDoubtsResult,
    fallbackDoubtsResult,
    projectDoubtsResult,
  ] = await Promise.all([
    readClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("university_id", universityId)
      .eq("verified", true),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("university_id", universityId)
      .gte("updated_at", monthStartIso),
    readClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("university_id", universityId)
      .eq("verified", true)
      .in("role", ["senior", "admin"]),
    supabase
      .from("notes")
      .select("id, title, description, created_at, updated_at")
      .eq("university_id", universityId)
      .gte("updated_at", weekStartIso)
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase
      .from("notes")
      .select("id, title, description, created_at, updated_at")
      .eq("university_id", universityId)
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase
      .from("notes")
      .select("id, title, description, created_at, updated_at")
      .eq("university_id", universityId)
      .or(EXAM_KEYWORD_FILTER)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("notes")
      .select("id, title, description, created_at, updated_at")
      .eq("university_id", universityId)
      .or(EVENT_KEYWORD_FILTER)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("doubts")
      .select("id, title, description, user_id, assigned_to, status, created_at, updated_at")
      .eq("university_id", universityId)
      .gte("updated_at", weekStartIso)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("doubts")
      .select("id, title, description, user_id, assigned_to, status, created_at, updated_at")
      .eq("university_id", universityId)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("doubts")
      .select("id, title, description, user_id, assigned_to, status, created_at, updated_at")
      .eq("university_id", universityId)
      .or(PROJECT_KEYWORD_FILTER)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  const weeklyNotes = (weeklyNotesResult.data ?? []) as NoteLite[];
  const fallbackNotes = (fallbackNotesResult.data ?? []) as NoteLite[];
  const examNotes = (examNotesResult.data ?? []) as NoteLite[];
  const eventNotes = (eventNotesResult.data ?? []) as NoteLite[];
  const weeklyDoubts = (weeklyDoubtsResult.data ?? []) as DoubtLite[];
  const fallbackDoubts = (fallbackDoubtsResult.data ?? []) as DoubtLite[];
  const projectDoubts = (projectDoubtsResult.data ?? []) as DoubtLite[];

  const contributorIds = uniqueTake(
    [
      ...weeklyDoubts.map((item) => item.user_id),
      ...weeklyDoubts.map((item) => item.assigned_to ?? ""),
      ...fallbackDoubts.map((item) => item.user_id),
      ...projectDoubts.map((item) => item.user_id),
    ],
    80,
  );
  const contributors = await getContributorsById(adminClient, contributorIds);

  const liveStats = {
    verifiedStudents: Math.max(0, verifiedStudentsResult.count ?? 0),
    notesUpdatedMonth: Math.max(0, notesMonthResult.count ?? 0),
    activeMentors: Math.max(0, mentorsResult.count ?? 0),
  };
  const topSubject = buildTopSubjectCard(weeklyNotes, fallbackNotes);
  const examPrep = buildExamCard(now, examNotes);
  const discussion = buildDiscussionCard(weeklyDoubts, fallbackDoubts, contributors);
  const project = buildProjectCard(projectDoubts, contributors, profileDomain ?? fallbackDomainFromUniversity);
  const periodLabel = formatPeriodLabel(weekStart, now);
  const campusUpdates = buildCampusUpdates({
    eventNotes,
    examPrep,
    fallbackDomain: profileDomain ?? fallbackDomainFromUniversity,
    liveStats,
    project,
    topSubject,
    discussion,
    universityName,
  });
  const thisWeek = await buildThisWeekPayload({
    discussion,
    eventNotes,
    periodLabel,
    project,
    readClient,
    topSubject,
    universityId,
    universityName,
    weeklyDoubts,
  });

  return {
    liveStats,
    campusUpdates,
    thisWeek,
    weekly: {
      periodLabel,
      topSubject,
      examPrep,
      discussion,
      project,
    },
  };
}
