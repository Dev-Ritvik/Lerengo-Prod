"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";
import type {
  MentorshipDoubt,
  MentorshipLeaderboardEntry,
  MentorshipMentor,
  MentorshipMessage,
  MentorshipNotification,
  MentorshipRequest,
} from "@/lib/mentorship";
import type { MentorshipRequestStatus, MentorshipRequestType } from "@/lib/supabase/types";
import styles from "./page.module.css";

type MentorshipShellProps = {
  avatarUrl?: string | null;
  universityName: string;
  displayName: string;
  initials: string;
  showAdminLink?: boolean;
  adminUrl?: string;
  isSuperadmin?: boolean;
  showMentorLink?: boolean;
  mentors: MentorshipMentor[];
  doubts: MentorshipDoubt[];
  topPerformers: MentorshipLeaderboardEntry[];
  doubtSolvers: MentorshipLeaderboardEntry[];
  programOptions: string[];
  subjectOptions: string[];
  incomingRequests: MentorshipRequest[];
  outgoingRequests: MentorshipRequest[];
  notifications: MentorshipNotification[];
  hasUniversity?: boolean;
};

type MentorCategoryFilter = "Faculty" | "Seniors" | "Career";

const WORKSPACE_NAV_ITEMS = [
  { href: "/browse-notes", icon: "/notes.png", label: "Notes" },
  { href: "/mentorship", icon: "/mentorship.png", label: "Mentorship" },
  { href: "/community", icon: "/community.png", label: "Campus Community" },
] as const;

type RequestPanelProps = {
  items: MentorshipRequest[];
  title: string;
  emptyText: string;
  busyRequestId: string | null;
  onUpdate: (requestId: string, status: MentorshipRequestStatus) => void;
};

type MentorThreadState = {
  canChat: boolean;
  lockReason: string | null;
  requestId: string | null;
  requestStatus: MentorshipRequestStatus | null;
  requestStatusLabel: string | null;
  requestTypeLabel: string | null;
  scheduledLabel: string | null;
  messages: MentorshipMessage[];
};

function normalizeFilterOptions(defaultValue: string, values: string[]) {
  const normalizedValues = Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value && value !== defaultValue),
    ),
  );

  return [defaultValue, ...normalizedValues];
}

const EMPTY_THREAD_STATE: MentorThreadState = {
  canChat: false,
  lockReason: "Send a mentorship request or appointment first to unlock mentor chat.",
  requestId: null,
  requestStatus: null,
  requestStatusLabel: null,
  requestTypeLabel: null,
  scheduledLabel: null,
  messages: [],
};

function formatRequestTypeLabel(value: MentorshipRequestType) {
  switch (value) {
    case "session":
      return "Direct session";
    case "roadmap":
      return "Roadmap help";
    case "office_hour":
      return "Office hour";
    case "boost":
      return "Career boost";
    case "portfolio":
      return "Portfolio audit";
    case "blocker":
      return "Blocker help";
    default:
      return "Mentorship";
  }
}

function SearchGlyph() {
  return (
    <svg aria-hidden="true" className={styles.searchGlyph} fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.2 12.2L16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function getRequestToneClassName(statusTone: MentorshipRequest["statusTone"]) {
  if (statusTone === "positive") {
    return styles.statusPositive;
  }

  if (statusTone === "negative") {
    return styles.statusNegative;
  }

  if (statusTone === "pending") {
    return styles.statusPending;
  }

  return styles.statusNeutral;
}

function getThreadToneClassName(status: MentorshipRequestStatus | null) {
  if (status === "accepted" || status === "completed") {
    return styles.statusPositive;
  }

  if (status === "declined") {
    return styles.statusNegative;
  }

  if (status === "pending") {
    return styles.statusPending;
  }

  return styles.statusNeutral;
}

function getDoubtToneClassName(statusTone: MentorshipDoubt["statusTone"]) {
  if (statusTone === "positive") {
    return styles.statusPositive;
  }

  if (statusTone === "pending") {
    return styles.statusPending;
  }

  return styles.statusNeutral;
}

function buildRequestMessage(mentorName: string, requestType: MentorshipRequestType) {
  switch (requestType) {
    case "session":
      return `Need a direct session with ${mentorName}.`;
    case "roadmap":
      return `Need roadmap guidance from ${mentorName}.`;
    case "office_hour":
      return `Requesting an office hour slot with ${mentorName}.`;
    case "boost":
      return `Need a career boost session with ${mentorName}.`;
    case "portfolio":
      return `Need a portfolio review from ${mentorName}.`;
    case "blocker":
      return `Need blocker support from ${mentorName}.`;
    default:
      return `Need mentorship guidance from ${mentorName}.`;
  }
}

function getMentorRequestTypeOptions(mentor: MentorshipMentor | null) {
  if (!mentor) {
    return [] as MentorshipRequestType[];
  }

  return Array.from(new Set([mentor.primaryRequestType, mentor.secondaryRequestType]));
}

async function readJsonError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

function RequestPanel({ items, title, emptyText, busyRequestId, onUpdate }: RequestPanelProps) {
  return (
    <section className={styles.leaderCard}>
      <div className={styles.leaderHeader}>
        <h2 className={styles.subsectionTitle}>{title}</h2>
        <span className={styles.leaderChip}>{items.length}</span>
      </div>

      {items.length ? (
        <div className={styles.stackGrid}>
          {items.map((item) => (
            <article className={styles.stackCard} key={item.id}>
              <div className={styles.stackHeader}>
                <div>
                  <strong className={styles.leaderName}>{item.counterpartyName}</strong>
                  <p className={styles.stackMeta}>{item.requestTypeLabel}</p>
                </div>
                <span className={`${styles.statusPill} ${getRequestToneClassName(item.statusTone)}`}>{item.statusLabel}</span>
              </div>

              {item.message ? <p className={styles.stackMeta}>{item.message}</p> : null}
              <div className={styles.tagRow}>
                {item.scheduledLabel ? <span className={styles.sessionPill}>{item.scheduledLabel}</span> : null}
                <span className={styles.tagPill}>{item.timeLabel}</span>
              </div>

              <div className={styles.stackActions}>
                {item.direction === "incoming" && item.status === "pending" ? (
                  <>
                    <button
                      className={`${styles.actionButton} ${styles.actionPrimary}`}
                      disabled={busyRequestId === item.id}
                      onClick={() => onUpdate(item.id, "accepted")}
                      type="button"
                    >
                      {busyRequestId === item.id ? "Updating..." : "Accept"}
                    </button>
                    <button className={styles.actionButton} disabled={busyRequestId === item.id} onClick={() => onUpdate(item.id, "declined")} type="button">
                      Decline
                    </button>
                  </>
                ) : null}

                {item.direction === "incoming" && item.status === "accepted" ? (
                  <button
                    className={`${styles.actionButton} ${styles.actionPrimary}`}
                    disabled={busyRequestId === item.id}
                    onClick={() => onUpdate(item.id, "completed")}
                    type="button"
                  >
                    {busyRequestId === item.id ? "Updating..." : "Mark Complete"}
                  </button>
                ) : null}

                {item.direction === "outgoing" && (item.status === "pending" || item.status === "accepted") ? (
                  <button className={styles.actionButton} disabled={busyRequestId === item.id} onClick={() => onUpdate(item.id, "cancelled")} type="button">
                    {busyRequestId === item.id ? "Updating..." : "Cancel"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.railEmptyCard}>
          <p className={styles.railEmptyTitle}>Nothing waiting right now</p>
          <p className={styles.railEmpty}>{emptyText}</p>
        </div>
      )}
    </section>
  );
}

export function MentorshipShell({
  avatarUrl = null,
  universityName,
  displayName,
  initials,
  showAdminLink = false,
  adminUrl = "/admin",
  isSuperadmin = false,
  showMentorLink = false,
  mentors,
  doubts,
  topPerformers,
  doubtSolvers,
  programOptions,
  subjectOptions,
  incomingRequests,
  outgoingRequests,
  notifications,
  hasUniversity = true,
}: MentorshipShellProps) {
  const router = useRouter();
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
      return;
    }
    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("mentorship_messages").delete().eq("id", messageId);
      if (error) {
        alert("Failed to delete message: " + error.message);
      } else {
        alert("Message deleted successfully.");
        setThreadState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== messageId),
        }));
      }
    } catch (err: any) {
      alert("Error deleting message: " + err.message);
    }
  };
  const [category, setCategory] = useState<MentorCategoryFilter>("Faculty");
  const [program, setProgram] = useState("All Programs");
  const [subject, setSubject] = useState("All Subjects");
  const [query, setQuery] = useState("");
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(mentors[0]?.id ?? null);
  const [selectedRequestType, setSelectedRequestType] = useState<MentorshipRequestType>("session");
  const [scheduledFor, setScheduledFor] = useState("");
  const [appointmentMessage, setAppointmentMessage] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [threadState, setThreadState] = useState<MentorThreadState>(EMPTY_THREAD_STATE);
  const [threadLoading, setThreadLoading] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [doubtInput, setDoubtInput] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [formNotice, setFormNotice] = useState("Select a mentor card to inspect the profile, schedule a request, or open chat.");
  const [requestBusyKey, setRequestBusyKey] = useState<string | null>(null);
  const [requestUpdateBusyId, setRequestUpdateBusyId] = useState<string | null>(null);
  const [doubtBusy, setDoubtBusy] = useState(false);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [notificationBusyId, setNotificationBusyId] = useState<string | null>(null);
  const unreadNotificationCount = notifications.filter((item) => item.unread).length;
  const programFilterOptions = useMemo(
    () => normalizeFilterOptions("All Programs", programOptions),
    [programOptions],
  );
  const subjectFilterOptions = useMemo(
    () => normalizeFilterOptions("All Subjects", subjectOptions),
    [subjectOptions],
  );
  const hasActiveFilters =
    category !== "Faculty" ||
    program !== "All Programs" ||
    subject !== "All Subjects" ||
    Boolean(query.trim());

  const filteredMentors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mentors.filter((mentor) => {
      if (mentor.category !== category) {
        return false;
      }

      if (program !== "All Programs" && mentor.program !== program) {
        return false;
      }

      if (subject !== "All Subjects") {
        const subjectHaystack = `${mentor.primarySkill} ${mentor.secondarySkill} ${mentor.role} ${mentor.expertise.join(" ")}`.toLowerCase();
        if (!subjectHaystack.includes(subject.toLowerCase())) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      return `${mentor.name} ${mentor.role} ${mentor.primarySkill} ${mentor.secondarySkill} ${mentor.program} ${mentor.description} ${mentor.contactEmail} ${mentor.expertise.join(" ")}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [category, mentors, program, query, subject]);

  const selectedMentor = useMemo(
    () => filteredMentors.find((mentor) => mentor.id === selectedMentorId) ?? filteredMentors[0] ?? null,
    [filteredMentors, selectedMentorId],
  );

  const selectedMentorRequest = useMemo(
    () => [...outgoingRequests, ...incomingRequests].find((request) => request.counterpartyId === selectedMentor?.id) ?? null,
    [incomingRequests, outgoingRequests, selectedMentor?.id],
  );

  const filteredDoubts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return doubts.filter((doubt) => {
      if (subject !== "All Subjects") {
        const topicHaystack = `${doubt.subject} ${doubt.tags.join(" ")}`.toLowerCase();
        if (!topicHaystack.includes(subject.toLowerCase())) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      return `${doubt.subject} ${doubt.question} ${doubt.author} ${doubt.tags.join(" ")} ${doubt.statusLabel} ${doubt.assignmentLabel}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [doubts, query, subject]);

  useEffect(() => {
    if (!filteredMentors.length) {
      setSelectedMentorId(null);
      return;
    }

    if (!selectedMentorId || !filteredMentors.some((mentor) => mentor.id === selectedMentorId)) {
      setSelectedMentorId(filteredMentors[0].id);
    }
  }, [filteredMentors, selectedMentorId]);

  useEffect(() => {
    if (!selectedMentor) {
      setSelectedRequestType("session");
      setScheduledFor("");
      setAppointmentMessage("");
      setChatDraft("");
      setThreadState(EMPTY_THREAD_STATE);
      return;
    }

    setSelectedRequestType(selectedMentor.primaryRequestType);
    setScheduledFor("");
    setAppointmentMessage(buildRequestMessage(selectedMentor.name, selectedMentor.primaryRequestType));
    setChatDraft("");
  }, [selectedMentor]);

  useEffect(() => {
    if (!selectedMentor) {
      return;
    }

    let isCancelled = false;

    async function run() {
      setThreadLoading(true);

      try {
        const response = await fetch(`/api/mentorship/messages?counterpartyId=${encodeURIComponent(selectedMentor.id)}`, {
          cache: "no-store",
        });

        if (isCancelled) {
          return;
        }

        if (!response.ok) {
          setThreadState({
            ...EMPTY_THREAD_STATE,
            lockReason: await readJsonError(response, "Could not load mentor chat."),
          });
          return;
        }

        const payload = (await response.json()) as MentorThreadState;
        setThreadState({
          canChat: payload.canChat,
          lockReason: payload.lockReason,
          requestId: payload.requestId,
          requestStatus: payload.requestStatus,
          requestStatusLabel: payload.requestStatusLabel,
          requestTypeLabel: payload.requestTypeLabel,
          scheduledLabel: payload.scheduledLabel,
          messages: payload.messages ?? [],
        });
      } catch {
        if (!isCancelled) {
          setThreadState({
            ...EMPTY_THREAD_STATE,
            lockReason: "Could not load mentor chat.",
          });
        }
      } finally {
        if (!isCancelled) {
          setThreadLoading(false);
        }
      }
    }

    void run();

    return () => {
      isCancelled = true;
    };
  }, [selectedMentor]);

  async function loadMentorThread(counterpartyId: string) {
    setThreadLoading(true);

    try {
      const response = await fetch(`/api/mentorship/messages?counterpartyId=${encodeURIComponent(counterpartyId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setThreadState({
          ...EMPTY_THREAD_STATE,
          lockReason: await readJsonError(response, "Could not load mentor chat."),
        });
        return;
      }

      const payload = (await response.json()) as MentorThreadState;
      setThreadState({
        canChat: payload.canChat,
        lockReason: payload.lockReason,
        requestId: payload.requestId,
        requestStatus: payload.requestStatus,
        requestStatusLabel: payload.requestStatusLabel,
        requestTypeLabel: payload.requestTypeLabel,
        scheduledLabel: payload.scheduledLabel,
        messages: payload.messages ?? [],
      });
    } catch {
      setThreadState({
        ...EMPTY_THREAD_STATE,
        lockReason: "Could not load mentor chat.",
      });
    } finally {
      setThreadLoading(false);
    }
  }

  async function handleCreateRequest() {
    if (!selectedMentor) {
      return;
    }

    const requestKey = `${selectedMentor.id}:${selectedRequestType}:detail`;
    setRequestBusyKey(requestKey);
    setFormNotice(`Sending ${formatRequestTypeLabel(selectedRequestType).toLowerCase()} request...`);

    try {
      const response = await fetch("/api/mentorship/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentorId: selectedMentor.id,
          requestType: selectedRequestType,
          message: appointmentMessage.trim() || buildRequestMessage(selectedMentor.name, selectedRequestType),
          scheduledFor: scheduledFor || null,
        }),
      });

      if (!response.ok) {
        setFormNotice(await readJsonError(response, "Could not send the mentorship request."));
        return;
      }

      setFormNotice(`Request sent to ${selectedMentor.name}.`);
      setScheduledFor("");
      await loadMentorThread(selectedMentor.id);
      router.refresh();
    } catch {
      setFormNotice("Could not send the mentorship request.");
    } finally {
      setRequestBusyKey(null);
    }
  }

  async function handleSendChat() {
    if (!selectedMentor) {
      return;
    }

    const trimmedMessage = chatDraft.trim();
    if (trimmedMessage.length < 2) {
      setFormNotice("Write a message before sending it.");
      return;
    }

    setChatBusy(true);
    setFormNotice("Sending mentor chat message...");

    try {
      const response = await fetch("/api/mentorship/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          counterpartyId: selectedMentor.id,
          body: trimmedMessage,
        }),
      });

      if (!response.ok) {
        setFormNotice(await readJsonError(response, "Could not send the mentor chat message."));
        return;
      }

      const payload = (await response.json()) as { message?: MentorshipMessage };
      setChatDraft("");
      setFormNotice(`Message sent to ${selectedMentor.name}.`);
      if (payload.message) {
        setThreadState((current) => ({
          ...current,
          canChat: true,
          lockReason: null,
          messages: [...current.messages, payload.message as MentorshipMessage],
        }));
      } else {
        await loadMentorThread(selectedMentor.id);
      }
      router.refresh();
    } catch {
      setFormNotice("Could not send the mentor chat message.");
    } finally {
      setChatBusy(false);
    }
  }

  async function handleUpdateRequest(requestId: string, status: MentorshipRequestStatus) {
    setRequestUpdateBusyId(requestId);
    setFormNotice("Updating request...");

    try {
      const response = await fetch(`/api/mentorship/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setFormNotice(await readJsonError(response, "Could not update the mentorship request."));
        return;
      }

      setFormNotice(`Request marked as ${status}.`);
      if (selectedMentor) {
        await loadMentorThread(selectedMentor.id);
      }
      router.refresh();
    } catch {
      setFormNotice("Could not update the mentorship request.");
    } finally {
      setRequestUpdateBusyId(null);
    }
  }

  async function handleCreateDoubt() {
    const trimmedInput = doubtInput.trim();
    if (trimmedInput.length < 8) {
      setFormNotice("Write a meaningful doubt before posting.");
      return;
    }

    setDoubtBusy(true);
    setFormNotice("Posting doubt...");

    try {
      const response = await fetch("/api/doubts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: trimmedInput }),
      });

      if (!response.ok) {
        setFormNotice(await readJsonError(response, "Could not post the doubt."));
        return;
      }

      setDoubtInput("");
      setFormNotice("Doubt posted.");
      router.refresh();
    } catch {
      setFormNotice("Could not post the doubt.");
    } finally {
      setDoubtBusy(false);
    }
  }

  async function handleCreateReply(doubtId: string) {
    const draft = replyDrafts[doubtId]?.trim() ?? "";
    if (draft.length < 4) {
      setFormNotice("Write a meaningful reply before posting.");
      return;
    }

    setReplyBusyId(doubtId);
    setFormNotice("Posting reply...");

    try {
      const response = await fetch(`/api/doubts/${doubtId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: draft }),
      });

      if (!response.ok) {
        setFormNotice(await readJsonError(response, "Could not post the reply."));
        return;
      }

      setReplyDrafts((current) => ({ ...current, [doubtId]: "" }));
      setFormNotice("Reply posted.");
      router.refresh();
    } catch {
      setFormNotice("Could not post the reply.");
    } finally {
      setReplyBusyId(null);
    }
  }

  async function handleMarkNotificationRead(notificationId: string) {
    setNotificationBusyId(notificationId);
    setFormNotice("Updating notification...");

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        setFormNotice(await readJsonError(response, "Could not update the notification."));
        return;
      }

      setFormNotice("Notification marked as read.");
      router.refresh();
    } catch {
      setFormNotice("Could not update the notification.");
    } finally {
      setNotificationBusyId(null);
    }
  }

  function handleResetFilters() {
    setCategory("Faculty");
    setProgram("All Programs");
    setSubject("All Subjects");
    setQuery("");
  }

  function jumpToDoubtComposer() {
    document.getElementById("mentorship-doubt-studio")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function focusMentor(mentorId: string) {
    setSelectedMentorId(mentorId);
  }

  const mentorRequestOptions = getMentorRequestTypeOptions(selectedMentor);
  const activeRequestKey = selectedMentor ? `${selectedMentor.id}:${selectedRequestType}:detail` : null;

  return (
    <main className={styles.shell} data-workspace-shell="true">
      <section className={styles.mainPanel}>
        <header className={styles.topBar}>
          <div className={styles.topBarFrame}>
            <div className={styles.navBar}>
              <div className={styles.brandCluster}>
                <Link href="/" aria-label="LerenGO home" className={styles.brandLink}>
                  <Image
                    alt="LerenGO logo"
                    className={styles.brandLogo}
                    height={303}
                    priority
                    src="/logo.lerengo.embedded.svg"
                    width={562}
                  />
                </Link>

                <nav aria-label="Workspace navigation" className={styles.workspaceNav}>
                  {WORKSPACE_NAV_ITEMS.map((item) => (
                    <Link
                      aria-current={item.href === "/mentorship" ? "page" : undefined}
                      className={`${styles.workspaceNavItem} ${item.href === "/mentorship" ? styles.workspaceNavItemActive : ""}`}
                      href={item.href}
                      key={item.href}
                    >
                      <Image alt="" className={styles.workspaceNavIcon} height={24} src={item.icon} width={24} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className={styles.utilityCluster}>
                <div className={styles.universityField}>
                  <Image alt="" aria-hidden="true" className={styles.universityLogo} height={30} src="/lpu logo.png" width={30} />
                  <span className={styles.universityName}>{universityName}</span>
                </div>

                <div className={styles.profileDock}>
                  <ProfileMenu
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    initials={initials}
                    showAdminLink={showAdminLink}
                    adminUrl={adminUrl}
                    showMentorLink={showMentorLink}
                  />
                </div>
              </div>
            </div>

            <div className={styles.heroBand}>
              <div className={styles.sectionHeader}>
                <h1 className={styles.pageTitle}>Mentorship</h1>
                <p className={styles.pageDescription}>Connect with verified faculty, senior mentors, and career guides. Ask doubts, request sessions, and keep the mentorship layer campus-scoped.</p>
              </div>

              <aside className={styles.heroAccentCard}>
                <p className={styles.heroAccentEyebrow}>Campus signal</p>
                <h2 className={styles.heroAccentTitle}>Mentors, doubts, and requests in one clean workspace.</h2>
                <div className={styles.heroStatRow}>
                  <span className={styles.heroStatPill}>{mentors.length} mentors</span>
                  <span className={styles.heroStatPill}>{doubts.length} active doubts</span>
                  <span className={styles.heroStatPill}>{unreadNotificationCount} unread</span>
                </div>
              </aside>
            </div>
          </div>
        </header>

        <div className={styles.contentPane}>
          {!hasUniversity ? (
            <div className={styles.emptyStateCard} style={{ gridColumn: "span 12", margin: "40px auto", maxWidth: "600px", textAlign: "center" }}>
              <h2>Select your campus to get started</h2>
              <p style={{ color: "rgba(245, 243, 240, 0.6)", marginTop: "12px", lineHeight: "1.6" }}>
                To book structured sessions with verified mentors, peer advisors, and subject specialists on LerenGO, please select your campus first.
              </p>
              <Link className="button small" href="/onboarding/university" style={{ marginTop: "24px", display: "inline-block" }}>
                Select Campus
              </Link>
            </div>
          ) : (
            <>
              <section className={styles.filtersPanel}>
            <div className={styles.filtersHeading}>
              <div>
                <p className={styles.filtersKicker}>Mentor discovery</p>
                <h2 className={styles.filtersTitle}>One search bar. Role tabs up front. Faster mentoring matches.</h2>
              </div>

              {hasActiveFilters ? (
                <button className={styles.filtersReset} onClick={handleResetFilters} type="button">
                  Reset filters
                </button>
              ) : (
                <p className={styles.filtersHint}>Requests, replies, and notifications stay university-isolated.</p>
              )}
            </div>

            <div className={styles.categoryTabs}>
              {(["Faculty", "Seniors", "Career"] as const).map((item) => (
                <button className={`${styles.tabButton} ${category === item ? styles.tabButtonActive : ""}`} key={item} onClick={() => setCategory(item)} type="button">
                  {item}
                </button>
              ))}
            </div>

            <div className={styles.filtersStrip}>
              <select className={styles.filterControl} onChange={(event) => setProgram(event.target.value)} value={program}>
                {programFilterOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <span className={styles.subjectChip}>{category}</span>

              <select className={styles.filterControl} onChange={(event) => setSubject(event.target.value)} value={subject}>
                {subjectFilterOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <label className={styles.filterSearchField}>
                <span aria-hidden="true" className={styles.searchIcon}>
                  <SearchGlyph />
                </span>
                <input onChange={(event) => setQuery(event.target.value)} placeholder="Search mentors, skills, or doubts..." type="search" value={query} />
              </label>
            </div>
          </section>

          <div className={styles.workspaceGrid}>
            <section className={styles.primaryColumn}>
              <section className={styles.mentorStage}>
                <div className={styles.mentorStageHeader}>
                  <div>
                    <p className={styles.filtersKicker}>Mentor section</p>
                    <h2 className={styles.subsectionTitle}>Every card is a mentor profile. Click one to see approval, contact, appointment, and chat.</h2>
                  </div>
                  {selectedMentor ? (
                    <div className={styles.mentorStageMeta}>
                      <span className={styles.tagPill}>{selectedMentor.category}</span>
                      <span className={styles.tagPill}>{selectedMentor.program}</span>
                      <span className={styles.tagPill}>{selectedMentor.availabilityLabel}</span>
                    </div>
                  ) : null}
                </div>

                {selectedMentor ? (
                  <article className={styles.mentorSpotlight}>
                    <div className={styles.mentorSpotlightHeader}>
                      <div className={styles.mentorSpotlightIdentity}>
                        <div className={`${styles.mentorAvatar} ${styles.mentorAvatarHero}`}>{selectedMentor.initials}</div>
                        <div className={styles.mentorSpotlightIntro}>
                          <strong className={styles.mentorSpotlightName}>{selectedMentor.name}</strong>
                          <span className={styles.mentorSpotlightRole}>{selectedMentor.role}</span>
                          <p className={styles.mentorSpotlightDescription}>{selectedMentor.description}</p>
                        </div>
                      </div>

                      <div className={styles.mentorSpotlightBadges}>
                        <span className={`${styles.statusPill} ${selectedMentor.statusTone === "live" ? styles.statusLive : styles.statusNeutral}`}>{selectedMentor.statusLabel}</span>
                        <span className={styles.sessionPill}>{selectedMentor.sessionType}</span>
                        <span className={styles.tagPill}>{selectedMentor.approvalLabel}</span>
                      </div>
                    </div>

                    <div className={styles.mentorFactGrid}>
                      <div className={styles.mentorFactCard}>
                        <span className={styles.mentorFactLabel}>Contact</span>
                        <strong className={styles.mentorFactValue}>{selectedMentor.contactEmail}</strong>
                      </div>
                      <div className={styles.mentorFactCard}>
                        <span className={styles.mentorFactLabel}>Department</span>
                        <strong className={styles.mentorFactValue}>{selectedMentor.department ?? "Campus-wide"}</strong>
                      </div>
                      <div className={styles.mentorFactCard}>
                        <span className={styles.mentorFactLabel}>Current request</span>
                        <strong className={styles.mentorFactValue}>{threadState.requestStatusLabel ?? selectedMentorRequest?.statusLabel ?? "Not started"}</strong>
                      </div>
                      <div className={styles.mentorFactCard}>
                        <span className={styles.mentorFactLabel}>Preferred slot</span>
                        <strong className={styles.mentorFactValue}>{threadState.scheduledLabel ?? selectedMentorRequest?.scheduledLabel ?? "You choose the time"}</strong>
                      </div>
                    </div>

                    <div className={styles.mentorTagRail}>
                      {selectedMentor.expertise.map((item) => (
                        <span className={styles.tagPill} key={`${selectedMentor.id}-${item}`}>
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className={styles.mentorConversationGrid}>
                      <section className={styles.appointmentStudio}>
                        <div className={styles.panelHeader}>
                          <div>
                            <h3 className={styles.subsectionTitle}>Appointment</h3>
                            <p className={styles.stackMeta}>Choose the mentorship mode, suggest a time, and send the request with the right context.</p>
                          </div>
                          <span className={styles.tagPill}>{selectedMentor.availabilityLabel}</span>
                        </div>

                        <div className={styles.requestTypeTabs}>
                          {mentorRequestOptions.map((requestType) => (
                            <button
                              className={`${styles.requestTypeButton} ${selectedRequestType === requestType ? styles.requestTypeButtonActive : ""}`}
                              key={`${selectedMentor.id}-${requestType}`}
                              onClick={() => {
                                setSelectedRequestType(requestType);
                                setAppointmentMessage(buildRequestMessage(selectedMentor.name, requestType));
                              }}
                              type="button"
                            >
                              {formatRequestTypeLabel(requestType)}
                            </button>
                          ))}
                        </div>

                        <div className={styles.appointmentFields}>
                          <label className={styles.appointmentField}>
                            <span className={styles.formLabel}>Preferred time</span>
                            <input className={styles.appointmentInput} onChange={(event) => setScheduledFor(event.target.value)} type="datetime-local" value={scheduledFor} />
                          </label>

                          <label className={`${styles.appointmentField} ${styles.appointmentFieldWide}`}>
                            <span className={styles.formLabel}>Message for mentor</span>
                            <textarea
                              className={styles.appointmentTextarea}
                              onChange={(event) => setAppointmentMessage(event.target.value)}
                              placeholder={`Tell ${selectedMentor.name} what you need help with.`}
                              value={appointmentMessage}
                            />
                          </label>
                        </div>

                        <div className={styles.appointmentFooter}>
                          <p className={styles.formNotice}>{formNotice}</p>
                          <div className={styles.appointmentActions}>
                            <button
                              className={`${styles.actionButton} ${styles.actionPrimary}`}
                              disabled={requestBusyKey === activeRequestKey}
                              onClick={() => void handleCreateRequest()}
                              type="button"
                            >
                              {requestBusyKey === activeRequestKey ? "Sending..." : "Request Appointment"}
                            </button>
                            <button className={styles.actionButton} onClick={jumpToDoubtComposer} type="button">
                              Ask a doubt first
                            </button>
                          </div>
                        </div>
                      </section>

                      <section className={styles.chatStudio}>
                        <div className={styles.panelHeader}>
                          <div>
                            <h3 className={styles.subsectionTitle}>Mentor Chat</h3>
                            <p className={styles.stackMeta}>Once a request exists, keep follow-ups and scheduling inside one mentorship thread.</p>
                          </div>
                          {threadState.requestStatusLabel ? (
                            <span className={`${styles.statusPill} ${getThreadToneClassName(threadState.requestStatus)}`}>{threadState.requestStatusLabel}</span>
                          ) : (
                            <span className={styles.tagPill}>Locked</span>
                          )}
                        </div>

                        <div className={styles.chatMetaRow}>
                          {threadState.requestTypeLabel ? <span className={styles.tagPill}>{threadState.requestTypeLabel}</span> : null}
                          {threadState.scheduledLabel ? <span className={styles.sessionPill}>{threadState.scheduledLabel}</span> : null}
                          {threadLoading ? <span className={styles.tagPill}>Loading thread...</span> : null}
                        </div>

                        {threadState.canChat ? (
                          <>
                            <div className={styles.chatTimeline}>
                              {threadState.messages.length ? (
                                threadState.messages.map((message) => (
                                  <article
                                    className={`${styles.chatBubble} ${message.isCurrentUser ? styles.chatBubbleSelf : styles.chatBubbleOther}`}
                                    key={message.id}
                                  >
                                    <div className={styles.chatBubbleMeta}>
                                      <span className={styles.chatBubbleAuthor}>{message.senderName}</span>
                                      <span className={styles.timeLabel}>{message.timeLabel}</span>
                                      {isSuperadmin && (
                                        <button
                                          onClick={() => void handleDeleteMessage(message.id)}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#f19393",
                                            cursor: "pointer",
                                            fontSize: "0.68rem",
                                            marginLeft: "6px",
                                            padding: "0 2px",
                                            textDecoration: "underline",
                                          }}
                                          type="button"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                    <p className={styles.chatBubbleBody}>{message.body}</p>
                                  </article>
                                ))
                              ) : (
                                <div className={styles.chatEmptyState}>
                                  <p className={styles.railEmptyTitle}>Thread is open</p>
                                  <p className={styles.railEmpty}>The request is active. Send the first focused message to start the mentor conversation.</p>
                                </div>
                              )}
                            </div>

                            <div className={styles.chatComposer}>
                              <textarea
                                className={styles.chatTextarea}
                                onChange={(event) => setChatDraft(event.target.value)}
                                placeholder={`Message ${selectedMentor.name} about the appointment, blocker, or prep you need.`}
                                value={chatDraft}
                              />
                              <div className={styles.chatActions}>
                                <button className={`${styles.actionButton} ${styles.actionPrimary}`} disabled={chatBusy} onClick={() => void handleSendChat()} type="button">
                                  {chatBusy ? "Sending..." : "Send Message"}
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className={styles.chatLockedCard}>
                            <p className={styles.railEmptyTitle}>Chat unlocks after the request starts</p>
                            <p className={styles.railEmpty}>{threadState.lockReason ?? "Send a mentorship request to unlock the thread."}</p>
                          </div>
                        )}
                      </section>
                    </div>
                  </article>
                ) : (
                  <article className={`${styles.emptyStateCard} ${styles.emptyStateWide}`}>
                    <p className={styles.emptyStateKicker}>Mentor lane</p>
                    <h2>No mentors matched</h2>
                    <p>Adjust the category or filters. Approved mentors in your campus will appear here once they are active.</p>
                    <div className={styles.emptyStatePills}>
                      <span className={styles.tagPill}>{category}</span>
                      <span className={styles.tagPill}>{program}</span>
                      <span className={styles.tagPill}>{subject}</span>
                    </div>
                    <div className={styles.emptyStateActions}>
                      {hasActiveFilters ? (
                        <button className={`${styles.actionButton} ${styles.actionPrimary}`} onClick={handleResetFilters} type="button">
                          Widen search
                        </button>
                      ) : null}
                      <button className={styles.actionButton} onClick={jumpToDoubtComposer} type="button">
                        Ask a doubt instead
                      </button>
                      <Link className={styles.actionButton} href="/community">
                        Open community
                      </Link>
                    </div>
                  </article>
                )}

                <div className={styles.mentorGrid}>
                  {filteredMentors.length ? (
                    filteredMentors.map((mentor) => (
                      <button
                        aria-pressed={mentor.id === selectedMentor?.id}
                        className={`${styles.mentorCard} ${mentor.id === selectedMentor?.id ? styles.mentorCardActive : ""}`}
                        key={mentor.id}
                        onClick={() => focusMentor(mentor.id)}
                        type="button"
                      >
                        <div className={styles.mentorIdentity}>
                          <div className={styles.mentorAvatar}>{mentor.initials}</div>
                          <div className={styles.mentorMeta}>
                            <strong className={styles.mentorName}>{mentor.name}</strong>
                            <span className={styles.mentorRole}>{mentor.role}</span>
                            <span className={styles.mentorSkills}>{mentor.primarySkill} / {mentor.secondarySkill}</span>
                          </div>
                        </div>

                        <p className={styles.mentorCardDescription}>{mentor.description}</p>

                        <div className={styles.tagRow}>
                          {mentor.expertise.slice(0, 3).map((item) => (
                            <span className={styles.tagPill} key={`${mentor.id}-${item}`}>
                              {item}
                            </span>
                          ))}
                        </div>

                        <div className={styles.mentorCardFooter}>
                          <span className={`${styles.statusPill} ${mentor.statusTone === "live" ? styles.statusLive : styles.statusNeutral}`}>{mentor.statusLabel}</span>
                          <span className={styles.sessionPill}>{mentor.sessionType}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <article className={styles.emptyStateCard}>
                      <h2>No mentors matched</h2>
                      <p>Try a broader search or switch the category tab to reopen more mentors from your campus.</p>
                    </article>
                  )}
                </div>
              </section>

              <section className={styles.doubtSection} id="mentorship-doubt-studio">
                <h2 className={styles.subsectionTitle}>Ask a Doubt</h2>
                <div className={styles.doubtComposer}>
                  <input className={styles.doubtInput} onChange={(event) => setDoubtInput(event.target.value)} placeholder="Type your doubt..." type="text" value={doubtInput} />
                  <button className={`${styles.actionButton} ${styles.actionPrimary} ${styles.postButton}`} disabled={doubtBusy} onClick={() => void handleCreateDoubt()} type="button">
                    {doubtBusy ? "Posting..." : "Post Doubt"}
                  </button>
                </div>
                <p className={styles.formNotice}>{formNotice}</p>

                <div className={styles.doubtList}>
                  {filteredDoubts.length ? (
                    filteredDoubts.map((doubt) => (
                      <article className={styles.doubtCard} key={doubt.id}>
                        <div className={styles.doubtQuestionRow}>
                          <div className={styles.doubtAvatar}>{doubt.authorInitials}</div>
                          <div className={styles.doubtContent}>
                            <div className={styles.doubtMetaTop}>
                              <div>
                                <strong className={styles.doubtAuthor}>{doubt.author}</strong>
                                <div className={styles.inlineMeta}>{doubt.role}</div>
                              </div>
                              <span className={styles.timeLabel}>{doubt.timeLabel}</span>
                            </div>
                            <p className={styles.doubtQuestion}>{doubt.question}</p>
                            <div className={styles.tagRow}>
                              {doubt.tags.map((tag) => (
                                <span className={styles.tagPill} key={`${doubt.id}-${tag}`}>{tag}</span>
                              ))}
                            </div>
                            <div className={styles.tagRow}>
                              <span className={`${styles.statusPill} ${getDoubtToneClassName(doubt.statusTone)}`}>
                                {doubt.statusLabel}
                              </span>
                              <span className={styles.tagPill}>{doubt.assignmentLabel}</span>
                            </div>
                          </div>
                        </div>

                        {doubt.replies.length ? (
                          <div className={styles.replyList}>
                            {doubt.replies.map((reply) => (
                              <div className={styles.answerBlock} key={reply.id}>
                                <div className={styles.answerAvatar}>{reply.authorInitials}</div>
                                <div className={styles.answerContent}>
                                  <div className={styles.answerMeta}>
                                    <strong className={styles.answerAuthor}>{reply.author}</strong>
                                    <span className={styles.inlineMeta}>{reply.role}</span>
                                    <span className={styles.timeLabel}>{reply.timeLabel}</span>
                                  </div>
                                  <p className={styles.answerText}>{reply.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.replyEmpty}>No replies yet.</p>
                        )}

                        {doubt.canReply ? (
                          <div className={styles.replyComposer}>
                            <input
                              className={styles.replyInput}
                              onChange={(event) => setReplyDrafts((current) => ({ ...current, [doubt.id]: event.target.value }))}
                              placeholder="Write a focused reply..."
                              type="text"
                              value={replyDrafts[doubt.id] ?? ""}
                            />
                            <button
                              className={styles.actionButton}
                              disabled={replyBusyId === doubt.id}
                              onClick={() => void handleCreateReply(doubt.id)}
                              type="button"
                            >
                              {replyBusyId === doubt.id ? "Posting..." : "Reply"}
                            </button>
                          </div>
                        ) : (
                          <p className={styles.replyEmpty}>{doubt.replyAccessHint}</p>
                        )}
                      </article>
                    ))
                  ) : (
                    <article className={styles.emptyStateCard}>
                      <h2>No doubts matched</h2>
                      <p>Try a broader search or post the first doubt to start the discussion layer for this subject.</p>
                    </article>
                  )}
                </div>
              </section>
            </section>

            <aside className={styles.sideRail}>
              <RequestPanel
                busyRequestId={requestUpdateBusyId}
                emptyText="Incoming mentorship requests will appear here."
                items={incomingRequests}
                onUpdate={(requestId, status) => void handleUpdateRequest(requestId, status)}
                title="Incoming Requests"
              />

              <RequestPanel
                busyRequestId={requestUpdateBusyId}
                emptyText="Your outgoing mentorship requests will appear here."
                items={outgoingRequests}
                onUpdate={(requestId, status) => void handleUpdateRequest(requestId, status)}
                title="Your Requests"
              />

              <section className={styles.leaderCard}>
                <div className={styles.leaderHeader}>
                  <h2 className={styles.subsectionTitle}>Notifications</h2>
                  <span className={styles.leaderChip}>{notifications.filter((item) => item.unread).length} unread</span>
                </div>
                {notifications.length ? (
                  <div className={styles.stackGrid}>
                    {notifications.map((notification) => (
                      <article className={styles.stackCard} key={notification.id}>
                        <div className={styles.stackHeader}>
                          <strong className={styles.leaderName}>{notification.title}</strong>
                          {notification.unread ? <span className={`${styles.statusPill} ${styles.statusPending}`}>Unread</span> : null}
                        </div>
                        <p className={styles.stackMeta}>{notification.body}</p>
                        <div className={styles.stackActions}>
                          <span className={styles.tagPill}>{notification.timeLabel}</span>
                          {notification.unread ? (
                            <button className={styles.actionButton} disabled={notificationBusyId === notification.id} onClick={() => void handleMarkNotificationRead(notification.id)} type="button">
                              {notificationBusyId === notification.id ? "Updating..." : "Mark read"}
                            </button>
                          ) : null}
                          {notification.href ? (
                            <Link className={styles.actionButton} href={notification.href}>Open</Link>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.railEmptyCard}>
                    <p className={styles.railEmptyTitle}>Inbox is clear</p>
                    <p className={styles.railEmpty}>No notifications yet.</p>
                  </div>
                )}
              </section>

              <section className={styles.leaderCard}>
                <div className={styles.leaderHeader}>
                  <h2 className={styles.subsectionTitle}>Top Performers</h2>
                  <span className={styles.leaderChip}>Campus</span>
                </div>
                {topPerformers.length ? (
                  <div className={styles.leaderList}>
                    {topPerformers.map((entry, index) => (
                      <div className={styles.leaderItem} key={entry.id}>
                        <div className={styles.rankMedal}>{index + 1}</div>
                        <div className={styles.leaderAvatar}>{entry.initials}</div>
                        <div>
                          <strong className={styles.leaderName}>{entry.name}</strong>
                          <p className={styles.leaderSubtitle}>{entry.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.railEmptyCard}>
                    <p className={styles.railEmptyTitle}>Leaderboard warming up</p>
                    <p className={styles.railEmpty}>Top mentor performance will appear once campus activity starts.</p>
                  </div>
                )}
              </section>

              <section className={styles.leaderCard}>
                <div className={styles.leaderHeader}>
                  <h2 className={styles.subsectionTitle}>Doubt Solvers</h2>
                  <span className={styles.leaderChip}>Campus</span>
                </div>
                {doubtSolvers.length ? (
                  <div className={styles.leaderList}>
                    {doubtSolvers.map((entry, index) => (
                      <div className={styles.leaderItem} key={entry.id}>
                        <div className={styles.rankMedal}>{index + 1}</div>
                        <div className={styles.leaderAvatar}>{entry.initials}</div>
                        <div>
                          <strong className={styles.leaderName}>{entry.name}</strong>
                          <p className={styles.leaderSubtitle}>{entry.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.railEmptyCard}>
                    <p className={styles.railEmptyTitle}>No solver streaks yet</p>
                    <p className={styles.railEmpty}>Doubt solvers will appear after the first replies are posted.</p>
                  </div>
                )}
              </section>
            </aside>
          </div>
          </>
          )}
        </div>
      </section>
    </main>
  );
}
