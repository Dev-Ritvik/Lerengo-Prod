"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";
import type { CommunityChannel, CommunityDiscussion, Contributor, MatchCard, WeeklyUpdate } from "./data";
import styles from "./page.module.css";

type CommunityShellProps = {
  avatarUrl?: string | null;
  universityName: string;
  displayName: string;
  initials: string;
  showAdminLink?: boolean;
  adminUrl?: string;
  showMentorLink?: boolean;
  discussions: CommunityDiscussion[];
  weeklyUpdates: WeeklyUpdate[];
  contributors: Contributor[];
  matchCards: MatchCard[];
  openReports: number;
  hasUniversity?: boolean;
};

const CHANNELS: CommunityChannel[] = ["Projects", "Research", "Exams", "Labs"];

const WORKSPACE_NAV_ITEMS = [
  { href: "/browse-notes", icon: "/notes.png", label: "Notes" },
  { href: "/mentorship", icon: "/mentorship.png", label: "Mentorship" },
  { href: "/community", icon: "/community.png", label: "Campus Community" },
] as const;

function SearchGlyph() {
  return (
    <svg aria-hidden="true" className={styles.searchGlyph} fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.2 12.2L16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

export function CommunityShell({
  avatarUrl = null,
  universityName,
  displayName,
  initials,
  showAdminLink = false,
  adminUrl = "/admin",
  showMentorLink = false,
  discussions,
  weeklyUpdates,
  contributors,
  matchCards,
  openReports,
  hasUniversity = true,
}: CommunityShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channel, setChannel] = useState<CommunityChannel>("Projects");
  const [query, setQuery] = useState("");
  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false);
  const [isDiscussionFormOpen, setIsDiscussionFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("Use comma-separated skills. Example: React, Node, DBMS");
  const [formStatus, setFormStatus] = useState<"idle" | "success" | "error">("idle");
  const [isDiscussionSubmitting, setIsDiscussionSubmitting] = useState(false);
  const [discussionMessage, setDiscussionMessage] = useState("Tag the post with focused academic keywords.");
  const [discussionStatus, setDiscussionStatus] = useState<"idle" | "success" | "error">("idle");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmittingId, setReportSubmittingId] = useState<string | null>(null);
  const [helpfulSubmittingId, setHelpfulSubmittingId] = useState<string | null>(null);
  const [reportFeedback, setReportFeedback] = useState<{ postId: string; status: "success" | "error"; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const discussionFormRef = useRef<HTMLFormElement>(null);
  const hasActiveFilters = channel !== "Projects" || Boolean(query.trim());

  useEffect(() => {
    const compose = searchParams.get("compose");
    const requestedChannel = searchParams.get("channel");

    if (compose === "discussion") {
      setIsDiscussionFormOpen(true);
      setIsPartnerFormOpen(false);
    } else if (compose === "partner") {
      setIsPartnerFormOpen(true);
      setIsDiscussionFormOpen(false);
    }

    if (
      requestedChannel &&
      CHANNELS.includes(requestedChannel as CommunityChannel)
    ) {
      setChannel(requestedChannel as CommunityChannel);
    }
  }, [searchParams]);

  async function handlePartnerRequestSubmit(formData: FormData) {
    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      openRoles: String(formData.get("openRoles") ?? "").trim(),
      teamSizeLabel: String(formData.get("teamSizeLabel") ?? "").trim(),
      skills: String(formData.get("skills") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    setIsSubmitting(true);
    setFormStatus("idle");
    setFormMessage("Submitting request...");

    try {
      const response = await fetch("/api/community/partner-requests", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setFormStatus("error");
        setFormMessage(result.error ?? "Could not submit the request. Try again.");
        return;
      }

      formRef.current?.reset();
      setFormStatus("success");
      setFormMessage("Partner request submitted.");
      setIsPartnerFormOpen(false);
      router.refresh();
    } catch {
      setFormStatus("error");
      setFormMessage("Could not submit the request. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDiscussionPostSubmit(formData: FormData) {
    const payload = {
      channel: String(formData.get("channel") ?? "").trim(),
      title: String(formData.get("title") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim(),
      topic: String(formData.get("topic") ?? "").trim(),
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    setIsDiscussionSubmitting(true);
    setDiscussionStatus("idle");
    setDiscussionMessage("Publishing discussion...");

    try {
      const response = await fetch("/api/community/posts", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setDiscussionStatus("error");
        setDiscussionMessage(result.error ?? "Could not publish the discussion. Try again.");
        return;
      }

      discussionFormRef.current?.reset();
      setDiscussionStatus("success");
      setDiscussionMessage("Discussion published.");
      setIsDiscussionFormOpen(false);
      router.refresh();
    } catch {
      setDiscussionStatus("error");
      setDiscussionMessage("Could not publish the discussion. Try again.");
    } finally {
      setIsDiscussionSubmitting(false);
    }
  }

  async function handleReportSubmit(postId: string) {
    const reason = reportReason.trim();
    if (!reason) {
      setReportFeedback({
        message: "Add a reason before reporting this discussion.",
        postId,
        status: "error",
      });
      return;
    }

    setReportSubmittingId(postId);
    setReportFeedback(null);

    try {
      const response = await fetch("/api/community/reports", {
        body: JSON.stringify({ postId, reason }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setReportFeedback({
          message: result.error ?? "Could not submit the report. Try again.",
          postId,
          status: "error",
        });
        return;
      }

      setReportFeedback({
        message: "Report submitted.",
        postId,
        status: "success",
      });
      setReportReason("");
      setReportingId(null);
      router.refresh();
    } catch {
      setReportFeedback({
        message: "Could not submit the report. Try again.",
        postId,
        status: "error",
      });
    } finally {
      setReportSubmittingId(null);
    }
  }

  async function handleHelpful(postId: string) {
    setHelpfulSubmittingId(postId);

    try {
      const response = await fetch("/api/community/helpful", {
        body: JSON.stringify({ targetId: postId, targetType: "post" }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      router.refresh();
    } finally {
      setHelpfulSubmittingId(null);
    }
  }

  const filteredDiscussions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return discussions.filter((item) => {
      if (item.channel !== channel) return false;
      if (!normalizedQuery) return true;
      return `${item.title} ${item.summary} ${item.author} ${item.tags.join(" ")}`.toLowerCase().includes(normalizedQuery);
    });
  }, [channel, discussions, query]);

  async function handlePartnerFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await handlePartnerRequestSubmit(formData);
  }

  async function handleDiscussionFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await handleDiscussionPostSubmit(formData);
  }

  function handleResetFilters() {
    setChannel("Projects");
    setQuery("");
  }

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
                      aria-current={item.href === "/community" ? "page" : undefined}
                      className={`${styles.workspaceNavItem} ${item.href === "/community" ? styles.workspaceNavItemActive : ""}`}
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
              <div className={styles.sectionHeaderRow}>
                <div>
                  <h1 className={styles.pageTitle}>Community</h1>
                  <p className={styles.pageDescription}>Structured academic channels for projects, research, exams, labs, and serious campus collaboration.</p>
                </div>
              </div>

              <aside className={styles.heroAccentCard}>
                <p className={styles.heroAccentEyebrow}>Campus pulse</p>
                <h2 className={styles.heroAccentTitle}>Project matching, trust-ranked discussion, and weekly movement in one stream.</h2>
                <div className={styles.heroStatRow}>
                  <span className={styles.heroStatPill}>{discussions.length} discussions</span>
                  <span className={styles.heroStatPill}>{matchCards.length} partner requests</span>
                  <span className={styles.heroStatPill}>{openReports} open reports</span>
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
                To view projects, research threads, exams discussions, and join active study groups on LerenGO, please select your campus first.
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
                <p className={styles.filtersKicker}>Channel view</p>
                <h2 className={styles.filtersTitle}>Choose a channel, search once, then create the right kind of post.</h2>
              </div>

              <div className={styles.headerActions}>
                {hasActiveFilters ? (
                  <button className={styles.filtersReset} onClick={handleResetFilters} type="button">
                    Reset view
                  </button>
                ) : (
                  <p className={styles.filtersHint}>Everything here stays university-scoped and moderation-aware.</p>
                )}
                <button
                  className={`${styles.actionButton} ${styles.secondaryActionButton}`}
                  onClick={() => setIsDiscussionFormOpen((current) => !current)}
                  type="button"
                >
                  {isDiscussionFormOpen ? "Close Post" : "Create Discussion"}
                </button>
                <button
                  className={`${styles.actionButton} ${styles.actionPrimary} ${styles.partnerButton}`}
                  onClick={() => setIsPartnerFormOpen((current) => !current)}
                  type="button"
                >
                  {isPartnerFormOpen ? "Close Form" : "Find Project Partner"}
                </button>
              </div>
            </div>

            <div className={styles.categoryTabs}>
              {CHANNELS.map((item) => (
                <button className={`${styles.tabButton} ${item === channel ? styles.tabButtonActive : ""}`} key={item} onClick={() => setChannel(item)} type="button">
                  {item}
                </button>
              ))}
            </div>

            <label className={`${styles.searchField} ${styles.panelSearchField}`}>
              <span aria-hidden="true" className={styles.searchIcon}>
                <SearchGlyph />
              </span>
              <input onChange={(event) => setQuery(event.target.value)} placeholder="Search discussions, projects, or updates..." type="search" value={query} />
            </label>
          </section>

          {isDiscussionFormOpen ? (
            <section className={styles.partnerFormCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.subsectionTitle}>Create discussion post</h2>
                  <p className={styles.utilityDescription}>Publish a focused academic discussion in the right channel. Keep the summary specific and signal-rich.</p>
                </div>
              </div>

              <form className={styles.partnerForm} onSubmit={handleDiscussionFormSubmit} ref={discussionFormRef}>
                <div className={styles.partnerFormGrid}>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Channel</span>
                    <select className={styles.formSelect} defaultValue={channel} name="channel" required>
                      {CHANNELS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Topic</span>
                    <input maxLength={80} name="topic" placeholder="DBMS, VLSI, Research Methods" type="text" />
                  </label>

                  <label className={`${styles.formField} ${styles.formFieldFull}`}>
                    <span className={styles.formLabel}>Discussion title</span>
                    <input maxLength={100} name="title" placeholder="Need guidance on building a VLSI simulation dashboard" required type="text" />
                  </label>

                  <label className={`${styles.formField} ${styles.formFieldFull}`}>
                    <span className={styles.formLabel}>Summary</span>
                    <textarea maxLength={320} name="summary" placeholder="State the question, context, or collaboration need clearly so serious contributors can respond." required rows={4} />
                  </label>

                  <label className={`${styles.formField} ${styles.formFieldFull}`}>
                    <span className={styles.formLabel}>Tags</span>
                    <input maxLength={120} name="tags" placeholder="Research, DBMS, Exam Prep" type="text" />
                  </label>
                </div>

                <div className={styles.partnerFormFooter}>
                  <p
                    aria-live="polite"
                    className={`${styles.formMessage} ${
                      discussionStatus === "success" ? styles.formMessageSuccess : discussionStatus === "error" ? styles.formMessageError : ""
                    }`}
                  >
                    {discussionMessage}
                  </p>

                  <div className={styles.partnerFormActions}>
                    <button className={styles.secondaryButton} onClick={() => setIsDiscussionFormOpen(false)} type="button">
                      Cancel
                    </button>
                    <button className={`${styles.actionButton} ${styles.actionPrimary}`} disabled={isDiscussionSubmitting} type="submit">
                      {isDiscussionSubmitting ? "Publishing..." : "Publish Discussion"}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          ) : null}

          {isPartnerFormOpen ? (
            <section className={styles.partnerFormCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.subsectionTitle}>Project partner submission</h2>
                  <p className={styles.utilityDescription}>Post a focused request for serious teammates. Keep it academic, specific, and role-based.</p>
                </div>
              </div>

              <form
                className={styles.partnerForm}
                onSubmit={handlePartnerFormSubmit}
                ref={formRef}
              >
                <div className={styles.partnerFormGrid}>
                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Project title</span>
                    <input maxLength={100} name="title" placeholder="AI healthcare triage assistant" required type="text" />
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Open roles</span>
                    <input maxLength={80} name="openRoles" placeholder="Frontend, backend, ML" required type="text" />
                  </label>

                  <label className={`${styles.formField} ${styles.formFieldFull}`}>
                    <span className={styles.formLabel}>Project brief</span>
                    <textarea maxLength={280} name="description" placeholder="State the build goal, scope, expected commitment, and the kind of teammate you need." required rows={4} />
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Skills needed</span>
                    <input maxLength={120} name="skills" placeholder="React, Python, Research" required type="text" />
                  </label>

                  <label className={styles.formField}>
                    <span className={styles.formLabel}>Team size</span>
                    <input maxLength={60} name="teamSizeLabel" placeholder="3 to 4 members" required type="text" />
                  </label>
                </div>

                <div className={styles.partnerFormFooter}>
                  <p
                    aria-live="polite"
                    className={`${styles.formMessage} ${
                      formStatus === "success" ? styles.formMessageSuccess : formStatus === "error" ? styles.formMessageError : ""
                    }`}
                  >
                    {formMessage}
                  </p>

                  <div className={styles.partnerFormActions}>
                    <button className={styles.secondaryButton} onClick={() => setIsPartnerFormOpen(false)} type="button">
                      Cancel
                    </button>
                    <button className={`${styles.actionButton} ${styles.actionPrimary}`} disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          ) : null}

          <div className={styles.workspaceGrid}>
            <section className={styles.primaryColumn}>
              <div className={styles.partnerGrid}>
                {matchCards.length ? (
                  matchCards.map((card) => (
                    <article className={styles.utilityCard} key={card.id}>
                      <div className={styles.utilityHeader}>
                        <h2 className={styles.utilityTitle}>{card.title}</h2>
                      </div>
                      <p className={styles.utilityDescription}>{card.description}</p>
                      <div className={styles.utilityTags}>
                        {card.skills.map((skill) => (
                          <span className={styles.tagPill} key={skill}>{skill}</span>
                        ))}
                      </div>
                      <div className={styles.utilityMetaRow}>
                        <span className={styles.sessionPill}>{card.openRoles}</span>
                        <span className={styles.sessionPill}>{card.teamSize}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className={`${styles.emptyStateCard} ${styles.emptyStateWide}`}>
                    <p className={styles.emptyStateKicker}>Project lane</p>
                    <h2>No partner requests yet</h2>
                    <p>Open a focused request when you need teammates for a serious campus build.</p>
                    <div className={styles.emptyStatePills}>
                      <span className={styles.sessionPill}>{channel}</span>
                      <span className={styles.sessionPill}>Campus-scoped</span>
                    </div>
                    <div className={styles.emptyStateActions}>
                      <button
                        className={`${styles.actionButton} ${styles.actionPrimary}`}
                        onClick={() => {
                          setIsPartnerFormOpen(true);
                          setIsDiscussionFormOpen(false);
                        }}
                        type="button"
                      >
                        Open partner request
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => {
                          setIsDiscussionFormOpen(true);
                          setIsPartnerFormOpen(false);
                        }}
                        type="button"
                      >
                        Start discussion
                      </button>
                    </div>
                  </article>
                )}
              </div>

              <section className={styles.discussionSection}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>Active Discussions</h2>
                  <Link className={styles.textActionLink} href="/community/project-board">View project board</Link>
                </div>

                <div className={styles.discussionList}>
                  {filteredDiscussions.length ? filteredDiscussions.map((item) => (
                    <article className={styles.discussionCard} key={item.id}>
                      <div className={styles.discussionLead}>
                        <div className={styles.avatarLarge}>{item.authorInitials}</div>
                        <div className={styles.discussionLeadMeta}>
                          <div className={styles.discussionTitleRow}>
                            <Link className={styles.discussionTitleLink} href={`/community/${item.id}`}>
                              <h3 className={styles.discussionTitle}>{item.title}</h3>
                            </Link>
                            <span className={styles.timeLabel}>{item.timeLabel}</span>
                          </div>
                          <div className={styles.authorRow}>
                            <strong className={styles.discussionAuthor}>{item.author}</strong>
                            <span className={styles.inlineMeta}>{item.role}</span>
                            <span className={styles.inlineMeta}>Trust {item.trustScore}</span>
                          </div>
                          <p className={styles.discussionSummary}>{item.summary}</p>
                        </div>
                      </div>

                      <div className={styles.discussionFooter}>
                        <div className={styles.tagRow}>
                          <span className={styles.statusPill}>{item.status}</span>
                          <span className={styles.tagPill}>{item.badge}</span>
                          {item.tags.map((tag) => (
                            <span className={styles.tagPill} key={tag}>{tag}</span>
                          ))}
                        </div>
                        <div className={styles.discussionMetrics}>
                          <span className={styles.metricPill}>{item.replies} replies</span>
                          <button
                            className={`${styles.textActionLink} ${item.viewerHasVoted ? styles.textActionLinkActive : ""}`}
                            disabled={helpfulSubmittingId === item.id}
                            onClick={() => void handleHelpful(item.id)}
                            type="button"
                          >
                            {helpfulSubmittingId === item.id
                              ? "Updating..."
                              : `${item.viewerHasVoted ? "Helpful saved" : "Mark helpful"} • ${item.helpfulCount}`}
                          </button>
                          <Link className={styles.textActionLink} href={`/community/${item.id}`}>Open thread</Link>
                          <button
                            className={styles.reportButton}
                            onClick={() => {
                              setReportingId((current) => (current === item.id ? null : item.id));
                              setReportReason("");
                              setReportFeedback(null);
                            }}
                            type="button"
                          >
                            {reportingId === item.id ? "Close" : "Report"}
                          </button>
                        </div>
                      </div>

                      {reportingId === item.id ? (
                        <div className={styles.reportComposer}>
                          <label className={styles.reportField}>
                            <span className={styles.formLabel}>Report reason</span>
                            <textarea
                              onChange={(event) => setReportReason(event.target.value)}
                              placeholder="Explain why this post should be reviewed."
                              rows={3}
                              value={reportReason}
                            />
                          </label>

                          <div className={styles.reportFooter}>
                            <p
                              aria-live="polite"
                              className={`${styles.formMessage} ${
                                reportFeedback?.postId === item.id && reportFeedback.status === "success"
                                  ? styles.formMessageSuccess
                                  : reportFeedback?.postId === item.id && reportFeedback.status === "error"
                                    ? styles.formMessageError
                                    : ""
                              }`}
                            >
                              {reportFeedback?.postId === item.id ? reportFeedback.message : "Reports are reviewed to keep the community academic and high-signal."}
                            </p>

                            <div className={styles.partnerFormActions}>
                              <button className={styles.secondaryButton} onClick={() => setReportingId(null)} type="button">
                                Cancel
                              </button>
                              <button
                                className={`${styles.actionButton} ${styles.actionPrimary}`}
                                disabled={reportSubmittingId === item.id}
                                onClick={() => void handleReportSubmit(item.id)}
                                type="button"
                              >
                                {reportSubmittingId === item.id ? "Submitting..." : "Submit Report"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  )) : (
                    <article className={`${styles.emptyStateCard} ${styles.emptyStateWide}`}>
                      <p className={styles.emptyStateKicker}>Thread view</p>
                      <h2>No discussions matched</h2>
                      <p>Change channel or search terms, or publish a new discussion to start the thread.</p>
                      <div className={styles.emptyStateActions}>
                        {hasActiveFilters ? (
                          <button className={`${styles.actionButton} ${styles.actionPrimary}`} onClick={handleResetFilters} type="button">
                            Reset view
                          </button>
                        ) : null}
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setIsDiscussionFormOpen(true);
                            setIsPartnerFormOpen(false);
                          }}
                          type="button"
                        >
                          Create discussion
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setIsPartnerFormOpen(true);
                            setIsDiscussionFormOpen(false);
                          }}
                          type="button"
                        >
                          Find partner
                        </button>
                      </div>
                    </article>
                  )}
                </div>
              </section>
            </section>

            <aside className={styles.sideRail}>
              <section className={styles.railCard}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>This Week on Campus</h2>
                </div>
                {weeklyUpdates.length ? (
                  <>
                    <div className={styles.updateList}>
                      {weeklyUpdates.map((item) => (
                        <article className={styles.updateItem} key={item.id}>
                          <div>
                            <h3 className={styles.updateTitle}>{item.title}</h3>
                            <p className={styles.updateSubtitle}>{item.subtitle}</p>
                          </div>
                          <span className={styles.timeLabel}>{item.timeLabel}</span>
                        </article>
                      ))}
                    </div>
                    <Link className={styles.textAction} href="/community/project-board">View all</Link>
                  </>
                ) : (
                  <div className={styles.railEmptyCard}>
                    <p className={styles.railEmptyTitle}>No weekly highlights yet</p>
                    <p className={styles.railEmpty}>Once discussions and projects start moving, the strongest campus signals will land here.</p>
                    <div className={styles.emptyStateActions}>
                      <button
                        className={`${styles.actionButton} ${styles.actionPrimary}`}
                        onClick={() => {
                          setIsDiscussionFormOpen(true);
                          setIsPartnerFormOpen(false);
                        }}
                        type="button"
                      >
                        Post first discussion
                      </button>
                      <Link className={styles.actionButton} href="/community/project-board">Open board</Link>
                    </div>
                  </div>
                )}
              </section>

              <section className={styles.railCard}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>Top Contributors</h2>
                </div>
                {contributors.length ? (
                  <div className={styles.contributorList}>
                    {contributors.map((item) => (
                      <article className={styles.contributorItem} key={item.id}>
                        <div className={styles.avatarMedium}>{item.initials}</div>
                        <div className={styles.contributorMeta}>
                          <div className={styles.contributorTopRow}>
                            <strong className={styles.contributorName}>{item.name}</strong>
                            <span className={styles.metricPill}>{item.reputation}</span>
                          </div>
                          <div className={styles.tagRow}>
                            <span className={styles.tagPill}>{item.badge}</span>
                          </div>
                          <p className={styles.updateSubtitle}>{item.subtitle}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.railEmptyCard}>
                    <p className={styles.railEmptyTitle}>No contributor board yet</p>
                    <p className={styles.railEmpty}>The leaderboard will appear after the first useful discussions, replies, and helpful votes come in.</p>
                  </div>
                )}
                <div className={styles.utilityMetaRow}>
                  <span className={styles.sessionPill}>{openReports} open reports</span>
                  <span className={styles.sessionPill}>Trust-based ranking</span>
                </div>
                <Link className={`${styles.actionButton} ${styles.railButton}`} href="/community/leaderboard">View leaderboard</Link>
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
