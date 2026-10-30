import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  MentorCategory,
  MentorshipRequestStatus,
  MentorshipRequestType,
} from "@/lib/supabase/types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type DoubtRow = Database["public"]["Tables"]["doubts"]["Row"];
type DoubtReplyRow = Database["public"]["Tables"]["doubt_replies"]["Row"];
type MentorshipRequestRow = Database["public"]["Tables"]["mentorship_requests"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export type MentorUser = Pick<
  UserRow,
  | "id"
  | "full_name"
  | "email"
  | "role"
  | "department"
  | "program_domain"
  | "mentor_category"
  | "mentor_approved"
  | "mentor_active"
  | "mentor_headline"
  | "mentor_expertise"
>;

type UniversityUser = Pick<
  UserRow,
  "id" | "full_name" | "email" | "role" | "department" | "program_domain" | "mentor_approved"
>;

export type MentorshipMentor = {
  id: string;
  name: string;
  category: "Faculty" | "Seniors" | "Career";
  role: string;
  description: string;
  approvalLabel: string;
  availabilityLabel: string;
  contactEmail: string;
  expertise: string[];
  department: string | null;
  primarySkill: string;
  secondarySkill: string;
  statusLabel: string;
  statusTone: "live" | "neutral";
  pricingLabel: string;
  secondaryCta: string;
  sessionType: string;
  program: string;
  initials: string;
  primaryRequestType: MentorshipRequestType;
  secondaryRequestType: MentorshipRequestType;
};

export type MentorshipLeaderboardEntry = {
  id: string;
  name: string;
  subtitle: string;
  initials: string;
};

export type MentorshipReply = {
  id: string;
  author: string;
  authorInitials: string;
  role: string;
  timeLabel: string;
  body: string;
};

export type MentorshipDoubt = {
  id: string;
  author: string;
  authorInitials: string;
  role: string;
  subject: string;
  timeLabel: string;
  question: string;
  tags: string[];
  statusLabel: string;
  statusTone: "pending" | "positive" | "neutral";
  assignmentLabel: string;
  replyAccessHint: string;
  canReply: boolean;
  replies: MentorshipReply[];
};

export type MentorshipRequest = {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyInitials: string;
  direction: "incoming" | "outgoing";
  requestTypeLabel: string;
  status: MentorshipRequestStatus;
  statusLabel: string;
  statusTone: "pending" | "positive" | "neutral" | "negative";
  message: string | null;
  responseNote: string | null;
  scheduledLabel: string | null;
  timeLabel: string;
};

export type MentorshipNotification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  timeLabel: string;
  unread: boolean;
};

export type MentorshipMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  body: string;
  timeLabel: string;
  isCurrentUser: boolean;
};

export type MentorshipData = {
  mentors: MentorshipMentor[];
  doubts: MentorshipDoubt[];
  topPerformers: MentorshipLeaderboardEntry[];
  doubtSolvers: MentorshipLeaderboardEntry[];
  programOptions: string[];
  subjectOptions: string[];
  incomingRequests: MentorshipRequest[];
  outgoingRequests: MentorshipRequest[];
  notifications: MentorshipNotification[];
};

export const emptyMentorshipData: MentorshipData = {
  mentors: [],
  doubts: [],
  topPerformers: [],
  doubtSolvers: [],
  programOptions: [],
  subjectOptions: [],
  incomingRequests: [],
  outgoingRequests: [],
  notifications: [],
};

function isMissingColumnError(message: string | null | undefined, columnName: string) {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes(`column`) && message.toLowerCase().includes(columnName.toLowerCase());
}

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
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatScheduleLabel(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRequestType(value: MentorshipRequestType) {
  switch (value) {
    case "session":
      return "Book session";
    case "roadmap":
      return "Roadmap help";
    case "office_hour":
      return "Office hour";
    case "boost":
      return "Boost session";
    case "portfolio":
      return "Portfolio audit";
    case "blocker":
      return "Solve blocker";
    default:
      return "Mentorship request";
  }
}

function formatRequestStatus(value: MentorshipRequestStatus) {
  switch (value) {
    case "accepted":
      return { label: "Accepted", tone: "positive" as const };
    case "declined":
      return { label: "Declined", tone: "negative" as const };
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" as const };
    case "completed":
      return { label: "Completed", tone: "positive" as const };
    default:
      return { label: "Pending", tone: "pending" as const };
  }
}

export function buildCampusRoleLabel(user: Pick<UserRow, "program_domain" | "department" | "role"> | undefined) {
  if (!user) {
    return "Campus Member";
  }

  const parts = [user.program_domain, user.department].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (user.role === "admin") {
    return "Campus Admin";
  }

  if (user.role === "senior") {
    return "Senior Member";
  }

  return "Campus Member";
}

export function createMentorshipDoubtPayload(params: {
  doubtId: string;
  author: Pick<UserRow, "full_name" | "email" | "program_domain" | "department" | "role">;
  subject: string | null | undefined;
  question: string;
  createdAt: string;
}): MentorshipDoubt {
  const subject = params.subject?.trim() || "General doubt";
  const tags = [params.author.department, subject, params.author.program_domain]
    .filter(Boolean)
    .slice(0, 3) as string[];

  return {
    id: params.doubtId,
    author: params.author.full_name?.trim() || params.author.email,
    authorInitials: getInitials(params.author.full_name ?? params.author.email),
    role: buildCampusRoleLabel(params.author),
    subject,
    timeLabel: formatRelativeTime(params.createdAt),
    question: params.question,
    tags,
    statusLabel: "Awaiting assignment",
    statusTone: "pending",
    assignmentLabel: "Admin assignment pending",
    replyAccessHint: "An admin will assign a senior responder.",
    canReply: false,
    replies: [],
  };
}

export function createMentorshipReplyPayload(params: {
  replyId: string;
  author: Pick<UserRow, "full_name" | "email" | "program_domain" | "department" | "role">;
  body: string;
  createdAt: string;
}): MentorshipReply {
  return {
    id: params.replyId,
    author: params.author.full_name?.trim() || params.author.email,
    authorInitials: getInitials(params.author.full_name ?? params.author.email),
    role: buildCampusRoleLabel(params.author),
    timeLabel: formatRelativeTime(params.createdAt),
    body: params.body,
  };
}

export function createMentorshipMessagePayload(params: {
  messageId: string;
  sender: Pick<UserRow, "id" | "full_name" | "email">;
  body: string;
  createdAt: string;
  currentUserId: string;
}): MentorshipMessage {
  const senderName = params.sender.full_name?.trim() || params.sender.email;

  return {
    id: params.messageId,
    senderId: params.sender.id,
    senderName,
    senderInitials: getInitials(senderName),
    body: params.body,
    timeLabel: formatRelativeTime(params.createdAt),
    isCurrentUser: params.sender.id === params.currentUserId,
  };
}

function mapMentorCategory(value: MentorCategory | null): MentorshipMentor["category"] {
  if (value === "faculty") return "Faculty";
  if (value === "career") return "Career";
  return "Seniors";
}

function buildMentorActions(category: MentorCategory | null, active: boolean) {
  if (category === "faculty") {
    return {
      pricingLabel: active ? "Free - Book Session" : "Book Office Hour",
      secondaryCta: "Department Hours",
      sessionType: "Faculty",
      statusLabel: active ? "Available Now" : "Faculty Mentor",
      statusTone: active ? ("live" as const) : ("neutral" as const),
      primaryRequestType: "session" as const,
      secondaryRequestType: "office_hour" as const,
    };
  }

  if (category === "career") {
    return {
      pricingLabel: "INR 299 - Book Boost",
      secondaryCta: "Portfolio Audit",
      sessionType: "Career",
      statusLabel: active ? "Active this week" : "Career Mentor",
      statusTone: active ? ("live" as const) : ("neutral" as const),
      primaryRequestType: "boost" as const,
      secondaryRequestType: "portfolio" as const,
    };
  }

  return {
    pricingLabel: active ? "Free - Ask for Roadmap" : "Book 30 min",
    secondaryCta: "Share your blocker",
    sessionType: "Senior",
    statusLabel: active ? "Available Now" : "Approved Mentor",
    statusTone: active ? ("live" as const) : ("neutral" as const),
    primaryRequestType: "roadmap" as const,
    secondaryRequestType: "blocker" as const,
  };
}

function buildMentorRoleLabel(user: MentorUser) {
  if (user.mentor_headline?.trim()) {
    return user.mentor_headline.trim();
  }

  if (user.mentor_category === "faculty") {
    return `Faculty Mentor${user.department ? `, ${user.department}` : ""}`;
  }

  if (user.mentor_category === "career") {
    return "Career Strategy Mentor";
  }

  if (user.role === "senior") {
    return "Senior Student Mentor";
  }

  return "Campus Mentor";
}

function buildMentorDescription(user: MentorUser, expertise: string[]) {
  if (user.mentor_headline?.trim()) {
    return user.mentor_headline.trim();
  }

  if (expertise.length >= 2) {
    return `Focused on ${expertise[0]} and ${expertise[1]} for ${user.program_domain ?? "campus-wide"} learners.`;
  }

  if (expertise[0]) {
    return `Focused on ${expertise[0]} with support tailored to ${user.program_domain ?? "your campus"}.`;
  }

  if (user.department) {
    return `Guides students around ${user.department} workflows, academic decisions, and next-step planning.`;
  }

  return "Approved mentor profile for structured campus guidance and follow-up support.";
}

function buildMentorAvailabilityLabel(user: MentorUser) {
  if (user.mentor_category === "faculty") {
    return "Office-hour or scheduled academic session";
  }

  if (user.mentor_category === "career") {
    return "Career review, portfolio, and placement prep";
  }

  return "Roadmap help, blocker support, and senior guidance";
}

function buildMentorApprovalLabel(user: MentorUser) {
  if (user.mentor_active) {
    return "Approved and taking mentorship requests";
  }

  return "Approved mentor profile";
}

export function createMentorshipMentor(user: MentorUser): MentorshipMentor {
  const expertise = (user.mentor_expertise || []).filter(Boolean);
  const actions = buildMentorActions(user.mentor_category, user.mentor_active);

  return {
    id: user.id,
    name: user.full_name?.trim() || user.email,
    category: mapMentorCategory(user.mentor_category),
    role: buildMentorRoleLabel(user),
    description: buildMentorDescription(user, expertise),
    approvalLabel: buildMentorApprovalLabel(user),
    availabilityLabel: buildMentorAvailabilityLabel(user),
    contactEmail: user.email,
    expertise: expertise.length ? expertise : [user.department ?? "Academic Guidance", user.program_domain ?? "Campus Support"].filter(Boolean),
    department: user.department,
    primarySkill: expertise[0] ?? user.department ?? "Academic Guidance",
    secondarySkill: expertise[1] ?? user.program_domain ?? "Campus Support",
    statusLabel: actions.statusLabel,
    statusTone: actions.statusTone,
    pricingLabel: actions.pricingLabel,
    secondaryCta: actions.secondaryCta,
    sessionType: actions.sessionType,
    program: user.program_domain ?? "All Programs",
    initials: getInitials(user.full_name ?? user.email),
    primaryRequestType: actions.primaryRequestType,
    secondaryRequestType: actions.secondaryRequestType,
  };
}

function buildLeaderboardEntries(
  usersById: Map<string, UniversityUser>,
  counts: Map<string, number>,
  options?: { mentorsOnly?: boolean; emptySubtitle?: string },
) {
  return Array.from(counts.entries())
    .filter(([userId]) => {
      if (!options?.mentorsOnly) {
        return true;
      }

      const user = usersById.get(userId);
      return Boolean(user?.mentor_approved);
    })
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([userId, count]) => {
      const user = usersById.get(userId);
      const name = user?.full_name?.trim() || user?.email || "Campus Member";
      return {
        id: userId,
        name,
        initials: getInitials(name),
        subtitle:
          count > 0
            ? `Solved ${count} mentorship ${count === 1 ? "request" : "requests"}`
            : options?.emptySubtitle ?? "Approved mentor",
      } satisfies MentorshipLeaderboardEntry;
    });
}

function buildSubjectOptions(mentors: MentorUser[], doubts: DoubtRow[]) {
  const fromMentors = mentors.flatMap((mentor) => mentor.mentor_expertise);
  const fromDoubts = doubts.map((doubt) => doubt.title);
  return [
    "All Subjects",
    ...Array.from(new Set([...fromMentors, ...fromDoubts].filter(Boolean))).slice(0, 16),
  ];
}

function getDoubtStatusTone(status: DoubtRow["status"], isAssigned: boolean): MentorshipDoubt["statusTone"] {
  if (status === "resolved") {
    return "positive";
  }

  if (isAssigned) {
    return "neutral";
  }

  return "pending";
}

function getDoubtStatusLabel(status: DoubtRow["status"], isAssigned: boolean) {
  if (status === "resolved") {
    return "Resolved";
  }

  if (isAssigned) {
    return "Senior assigned";
  }

  return "Awaiting assignment";
}

function mapMentorshipRequest(
  request: MentorshipRequestRow,
  usersById: Map<string, UniversityUser>,
  currentUserId: string,
): MentorshipRequest {
  const incoming = request.mentor_id === currentUserId;
  const counterparty = usersById.get(incoming ? request.requester_id : request.mentor_id);
  const status = formatRequestStatus(request.status);
  const counterpartyName = counterparty?.full_name?.trim() || counterparty?.email || "Campus Member";

  return {
    id: request.id,
    counterpartyId: incoming ? request.requester_id : request.mentor_id,
    counterpartyName,
    counterpartyInitials: getInitials(counterpartyName),
    direction: incoming ? "incoming" : "outgoing",
    requestTypeLabel: formatRequestType(request.request_type),
    status: request.status,
    statusLabel: status.label,
    statusTone: status.tone,
    message: request.message,
    responseNote: request.response_note,
    scheduledLabel: formatScheduleLabel(request.scheduled_for),
    timeLabel: formatRelativeTime(request.created_at),
  };
}

function mapNotification(notification: NotificationRow): MentorshipNotification {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    timeLabel: formatRelativeTime(notification.created_at),
    unread: !notification.read_at,
  };
}

export async function buildMentorshipData(
  universityId: string,
  currentUserId: string,
): Promise<MentorshipData> {
  const admin = createSupabaseAdminClient();

  const [usersResponse, rawDoubtsResponse, rawRepliesResponse, requestsResponse, notificationsResponse] =
    await Promise.all([
      admin
        .from("users")
        .select(
          "id, full_name, email, role, department, program_domain, mentor_category, mentor_approved, mentor_active, mentor_headline, mentor_expertise",
        )
        .eq("university_id", universityId)
        .eq("verified", true)
        .order("mentor_active", { ascending: false })
        .order("mentor_approved", { ascending: false })
        .order("full_name", { ascending: true }),
      admin
        .from("doubts")
        .select("*")
        .eq("university_id", universityId)
        .neq("moderation_state", "hidden")
        .order("created_at", { ascending: false })
        .limit(24),
      admin
        .from("doubt_replies")
        .select("*")
        .eq("university_id", universityId)
        .neq("moderation_state", "hidden")
        .order("created_at", { ascending: true }),
      admin
        .from("mentorship_requests")
        .select("*")
        .eq("university_id", universityId)
        .or(`requester_id.eq.${currentUserId},mentor_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
        .limit(16),
      admin
        .from("notifications")
        .select("*")
        .eq("university_id", universityId)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const doubtsResponse =
    rawDoubtsResponse.error && isMissingColumnError(rawDoubtsResponse.error.message, "moderation_state")
      ? await admin
          .from("doubts")
          .select("*")
          .eq("university_id", universityId)
          .order("created_at", { ascending: false })
          .limit(24)
      : rawDoubtsResponse;

  const repliesResponse =
    rawRepliesResponse.error && isMissingColumnError(rawRepliesResponse.error.message, "moderation_state")
      ? await admin
          .from("doubt_replies")
          .select("*")
          .eq("university_id", universityId)
          .order("created_at", { ascending: true })
      : rawRepliesResponse;

  if (usersResponse.error || doubtsResponse.error || requestsResponse.error || notificationsResponse.error) {
    throw new Error(
      usersResponse.error?.message ||
        doubtsResponse.error?.message ||
        requestsResponse.error?.message ||
        notificationsResponse.error?.message ||
        "Failed to load mentorship data.",
    );
  }

  const users = (usersResponse.data ?? []) as MentorUser[];
  const doubts = (doubtsResponse.data ?? []) as DoubtRow[];
  const replies = repliesResponse.error ? ([] as DoubtReplyRow[]) : ((repliesResponse.data ?? []) as DoubtReplyRow[]);
  const requests = (requestsResponse.data ?? []) as MentorshipRequestRow[];
  const notifications = (notificationsResponse.data ?? []) as NotificationRow[];
  const currentUser = users.find((user) => user.id === currentUserId) ?? null;

  const usersById = new Map<string, UniversityUser>(
    users.map((user) => [
      user.id,
      {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        program_domain: user.program_domain,
        mentor_approved: user.mentor_approved,
      },
    ]),
  );

  const mentors = users
    .filter((user) => user.id !== currentUserId && user.mentor_approved && user.mentor_category)
    .map(createMentorshipMentor);

  const repliesByDoubt = new Map<string, DoubtReplyRow[]>();
  const replyCountByUser = new Map<string, number>();

  for (const reply of replies) {
    const bucket = repliesByDoubt.get(reply.doubt_id) ?? [];
    bucket.push(reply);
    repliesByDoubt.set(reply.doubt_id, bucket);
    replyCountByUser.set(reply.user_id, (replyCountByUser.get(reply.user_id) ?? 0) + 1);
  }

  const doubtThreads = doubts.map((doubt) => {
    const author = usersById.get(doubt.user_id);
    const assignedSenior = doubt.assigned_to ? usersById.get(doubt.assigned_to) : null;
    const mappedReplies = (repliesByDoubt.get(doubt.id) ?? []).map((reply) =>
      createMentorshipReplyPayload({
        replyId: reply.id,
        author:
          usersById.get(reply.user_id) ?? {
            full_name: null,
            email: "campus@member",
            program_domain: null,
            department: null,
            role: "user",
          },
        body: reply.body,
        createdAt: reply.created_at,
      }),
    );

    const subject = doubt.title?.trim() || "General doubt";
    const tags = [author?.department, subject, author?.program_domain].filter(Boolean).slice(0, 3) as string[];
    const isAssigned = Boolean(doubt.assigned_to);
    const canReply =
      doubt.assigned_to === currentUserId &&
      doubt.status !== "resolved" &&
      ((currentUser?.role === "senior" &&
        currentUser.mentor_approved &&
        currentUser.mentor_active &&
        currentUser.mentor_category === "senior") ||
        currentUser?.role === "admin" ||
        currentUser?.role === "superadmin");
    const replyAccessHint =
      doubt.status === "resolved"
        ? "This doubt has already been marked as resolved."
        : canReply
          ? "You are the assigned senior for this doubt."
          : assignedSenior
            ? `${assignedSenior.full_name?.trim() || assignedSenior.email || "The assigned senior"} is assigned to respond.`
            : "An admin will assign a senior responder.";

    return {
      id: doubt.id,
      author: author?.full_name?.trim() || author?.email || "Campus Member",
      authorInitials: getInitials(author?.full_name ?? author?.email),
      role: buildCampusRoleLabel(author),
      subject,
      timeLabel: formatRelativeTime(doubt.created_at),
      question: doubt.description,
      tags,
      statusLabel: getDoubtStatusLabel(doubt.status, isAssigned),
      statusTone: getDoubtStatusTone(doubt.status, isAssigned),
      assignmentLabel: assignedSenior
        ? `Assigned to ${assignedSenior.full_name?.trim() || assignedSenior.email || "Senior responder"}`
        : "Admin assignment pending",
      replyAccessHint,
      canReply,
      replies: mappedReplies,
    } satisfies MentorshipDoubt;
  });

  const topPerformers = buildLeaderboardEntries(usersById, replyCountByUser, {
    mentorsOnly: true,
    emptySubtitle: "Approved mentor",
  });

  const doubtSolvers = buildLeaderboardEntries(usersById, replyCountByUser, {
    emptySubtitle: "Campus responder",
  });

  const programOptions = [
    "All Programs",
    ...(Array.from(new Set(users.map((user) => user.program_domain).filter(Boolean))) as string[]),
  ];
  const subjectOptions = buildSubjectOptions(users, doubts);
  const mappedRequests = requests.map((request) => mapMentorshipRequest(request, usersById, currentUserId));

  return {
    mentors,
    doubts: doubtThreads,
    topPerformers,
    doubtSolvers,
    programOptions,
    subjectOptions,
    incomingRequests: mappedRequests.filter((request) => request.direction === "incoming"),
    outgoingRequests: mappedRequests.filter((request) => request.direction === "outgoing"),
    notifications: notifications.map(mapNotification),
  };
}
