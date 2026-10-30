"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileMenu } from "@/components/profile-menu";
import type { CommunityDiscussion, Contributor, MatchCard, WeeklyUpdate } from "../data";
import styles from "./project-board.module.css";

type ProjectBoardShellProps = {
  avatarUrl?: string | null;
  contributors: Contributor[];
  displayName: string;
  initials: string;
  matchCards: MatchCard[];
  projectDiscussions: CommunityDiscussion[];
  showAdminLink?: boolean;
  adminUrl?: string;
  universityName: string;
  weeklyUpdates: WeeklyUpdate[];
};

export function ProjectBoardShell({
  avatarUrl = null,
  contributors,
  displayName,
  initials,
  matchCards,
  projectDiscussions,
  showAdminLink = false,
  adminUrl = "/admin",
  universityName,
  weeklyUpdates,
}: ProjectBoardShellProps) {
  const router = useRouter();
  const [statusSubmittingId, setStatusSubmittingId] = useState<string | null>(null);

  async function updatePartnerStatus(requestId: string, status: "matched" | "closed" | "open") {
    setStatusSubmittingId(requestId);

    try {
      const response = await fetch(`/api/community/partner-requests/${requestId}`, {
        body: JSON.stringify({ status }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        return;
      }

      router.refresh();
    } finally {
      setStatusSubmittingId(null);
    }
  }

  return (
    <main className={styles.shell} data-workspace-shell="true">
      <aside className={styles.sidebar}>
        <div className={styles.sidebarMain}>
          <div className={styles.sidebarBrand}>
            <Link aria-label="LerenGO home" className={styles.sidebarLogoLink} href="/">
              <Image alt="LerenGO logo" className={styles.sidebarLogo} height={303} priority src="/logo.lerengo.embedded.svg" width={562} />
            </Link>
          </div>
          <div aria-hidden="true" className={styles.sidebarDivider} />

          <nav aria-label="Workspace navigation" className={styles.sidebarNav}>
            <Link className={styles.sidebarItem} href="/browse-notes">
              <Image alt="" className={styles.sidebarIcon} height={30} src="/notes.png" width={30} />
              <span className={styles.sidebarItemLabel}>Notes</span>
            </Link>

            <Link className={styles.sidebarItem} href="/mentorship">
              <Image alt="" className={styles.sidebarIcon} height={30} src="/mentorship.png" width={30} />
              <span className={styles.sidebarItemLabel}>Mentorship</span>
            </Link>

            <Link className={`${styles.sidebarItem} ${styles.sidebarItemActive}`} href="/community">
              <Image alt="" className={styles.sidebarIcon} height={30} src="/community.png" width={30} />
              <span className={styles.sidebarItemLabel}>Campus Community</span>
            </Link>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <div aria-hidden="true" className={styles.sidebarDivider} />
          <a className={styles.sidebarLogout} href="/auth/logout">
            <Image alt="" className={styles.sidebarIcon} height={28} src="/logout.png" width={28} />
            Log out
          </a>
        </div>
      </aside>

      <section className={styles.mainPanel}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div className={styles.scopeField}>
              <Image alt="" aria-hidden="true" className={styles.universityLogo} height={30} src="/lpu logo.png" width={30} />
              <span className={styles.universityName}>{universityName}</span>
            </div>

            <div className={styles.searchField}>
              <span className={styles.searchCopy}>Project Board</span>
            </div>
          </div>

          <div className={styles.profileDock}>
            <ProfileMenu
              avatarUrl={avatarUrl}
              displayName={displayName}
              initials={initials}
              showAdminLink={showAdminLink}
              adminUrl={adminUrl}
            />
          </div>
        </header>

        <div className={styles.contentPane}>
          <div className={styles.sectionHeaderRow}>
            <div>
              <p className={styles.eyebrow}>LerenGO &gt; Campus Community</p>
              <h1 className={styles.pageTitle}>Project Board</h1>
        <p className={styles.pageDescription}>Open collaboration requests, serious project threads, and weekly momentum across your CampusGO network.</p>
            </div>
            <div className={styles.headerActions}>
              <Link className={styles.secondaryButton} href="/community">Back to Community</Link>
              <Link className={`${styles.actionButton} ${styles.actionPrimary}`} href="/community?compose=partner&channel=Projects">Create or Join</Link>
            </div>
          </div>

          <div className={styles.statsRow}>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{matchCards.filter((item) => item.status === "open").length}</span>
              <span className={styles.statLabel}>Open partner requests</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{projectDiscussions.length}</span>
              <span className={styles.statLabel}>Project discussions</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{contributors.length}</span>
              <span className={styles.statLabel}>Top contributors</span>
            </article>
          </div>

          <div className={styles.workspaceGrid}>
            <section className={styles.primaryColumn}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>Partner Requests</h2>
                </div>
                {matchCards.length === 0 ? (
                  <div className={styles.emptyStateCard}>
                    <h2>No project requests yet</h2>
                    <p>
                      Open a serious collaboration request in community when you need
                      focused teammates for a build, lab, or research effort.
                    </p>
                  </div>
                ) : (
                  <div className={styles.partnerGrid}>
                    {matchCards.map((card) => (
                      <article className={styles.utilityCard} key={card.id}>
                        <h3 className={styles.cardTitle}>{card.title}</h3>
                        <p className={styles.cardDescription}>{card.description}</p>
                        <div className={styles.tagRow}>
                          {card.skills.map((skill) => (
                            <span className={styles.tagPill} key={skill}>{skill}</span>
                          ))}
                        </div>
                        <div className={styles.metaRow}>
                          <span className={styles.metricPill}>{card.openRoles}</span>
                          <span className={styles.metricPill}>{card.teamSize}</span>
                          <span className={styles.metricPill}>{card.status}</span>
                        </div>
                        {card.canManage ? (
                          <div className={styles.partnerActions}>
                            <button
                              className={`${styles.actionButton} ${styles.actionPrimary}`}
                              disabled={statusSubmittingId === card.id || card.status === "matched"}
                              onClick={() => void updatePartnerStatus(card.id, "matched")}
                              type="button"
                            >
                              {statusSubmittingId === card.id && card.status !== "matched" ? "Updating..." : "Mark matched"}
                            </button>
                            <button
                              className={styles.secondaryButton}
                              disabled={statusSubmittingId === card.id || card.status === "closed"}
                              onClick={() => void updatePartnerStatus(card.id, "closed")}
                              type="button"
                            >
                              Close request
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>Project Discussions</h2>
                </div>
                {projectDiscussions.length === 0 ? (
                  <div className={styles.emptyStateCard}>
                    <h2>No project discussions yet</h2>
                    <p>
                      Once project threads are opened in the Projects channel, they will
                      appear here for the whole campus to review and join.
                    </p>
                  </div>
                ) : (
                  <div className={styles.discussionList}>
                    {projectDiscussions.map((item) => (
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
                        <div className={styles.metaRow}>
                          <span className={styles.metricPill}>{item.replies} replies</span>
                          <span className={styles.metricPill}>{item.helpfulCount} helpful</span>
                          <span className={styles.metricPill}>{item.status}</span>
                          {item.tags.map((tag) => (
                            <span className={styles.tagPill} key={tag}>{tag}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>

            <aside className={styles.sideRail}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>This Week on Campus</h2>
                </div>
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
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subsectionTitle}>Top Contributors</h2>
                </div>
                <div className={styles.contributorList}>
                  {contributors.map((item) => (
                    <article className={styles.contributorItem} key={item.id}>
                      <div className={styles.avatarMedium}>{item.initials}</div>
                      <div className={styles.contributorMeta}>
                        <div className={styles.contributorTopRow}>
                          <strong className={styles.contributorName}>{item.name}</strong>
                          <span className={styles.metricPill}>{item.reputation}</span>
                        </div>
                        <span className={styles.tagPill}>{item.badge}</span>
                        <p className={styles.updateSubtitle}>{item.subtitle}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
