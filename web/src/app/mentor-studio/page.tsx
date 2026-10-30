import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";
import { SiteFooter } from "@/components/site-footer";
import { buildMentorshipData, createMentorshipMentor, emptyMentorshipData } from "@/lib/mentorship";
import { requireVerifiedProfile } from "@/lib/tenant";
import styles from "./page.module.css";

const WORKSPACE_NAV_ITEMS = [
  { href: "/browse-notes", icon: "/notes.png", label: "Notes" },
  { href: "/mentorship", icon: "/mentorship.png", label: "Mentorship" },
  { href: "/community", icon: "/community.png", label: "Campus Community" },
] as const;

function getFirstName(value: string | null | undefined) {
  if (!value) {
    return "User";
  }

  const firstName = value.trim().split(/\s+/)[0];
  return firstName || "User";
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

export const dynamic = "force-dynamic";

export default async function MentorStudioPage() {
  const { authUser, profile, supabase } = await requireVerifiedProfile();

  if (!profile.university_id) {
    redirect("/onboarding/university");
  }

  if (!profile.mentor_approved && profile.role !== "superadmin") {
    redirect("/mentorship");
  }

  const [{ data: university }, mentorshipData] = await Promise.all([
    supabase.from("universities").select("name").eq("id", profile.university_id).maybeSingle(),
    buildMentorshipData(profile.university_id, profile.id).catch(() => emptyMentorshipData),
  ]);

  const userName = profile.full_name?.trim() || profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "University Name";
  const mentorProfile = createMentorshipMentor(profile);
  const unreadNotifications = mentorshipData.notifications.filter((item) => item.unread);
  const activeIncomingRequests = mentorshipData.incomingRequests.filter(
    (item) => item.status === "pending" || item.status === "accepted",
  );

  return (
    <div className={styles.viewport}>
      <main className={styles.shell}>
        <section className={styles.mainPanel}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <Link href="/" aria-label="LerenGO home" className={styles.brand}>
                <Image alt="LerenGO logo" className={styles.logoImage} height={30} priority src="/logo.lerengo.embedded.svg" width={140} />
              </Link>

              <nav aria-label="Workspace navigation" className={styles.workspaceNav}>
                {WORKSPACE_NAV_ITEMS.map((item) => {
                  const isActive = item.href === "/mentorship";

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`${styles.workspaceNavItem} ${isActive ? styles.workspaceNavItemActive : ""}`}
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className={styles.headerRight}>
              <div className={styles.universityField}>
                <Image alt="" aria-hidden="true" className={styles.universityLogo} height={20} src="/lpu logo.png" width={20} />
                <span className={styles.universityName}>{universityName}</span>
              </div>

              <div className={styles.profileDock}>
                <ProfileMenu
                  avatarUrl={authUser.avatarUrl ?? null}
                  displayName={displayName}
                  initials={initials}
                  showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
                  adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
                  showMentorLink
                />
              </div>
            </div>
          </header>

          <div className={styles.contentPane}>
            <section className={styles.heroGrid}>
              <article className={styles.heroCard}>
                <div className={styles.heroIdentity}>
                  <div className={styles.heroAvatarWrap}>
                    {authUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={`${userName} mentor profile`} className={styles.heroAvatar} src={authUser.avatarUrl} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <div className={styles.heroText}>
                    <p className={styles.eyebrow}>Verified mentor</p>
                    <h1 className={styles.title}>{userName}</h1>
                    <p className={styles.description}>
                      Your mentor-facing portfolio, request board, and alert surface. This is the clean operating page for approved mentors.
                    </p>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${styles.badgeStrong}`}>{mentorProfile.approvalLabel}</span>
                      <span className={styles.badge}>{mentorProfile.sessionType}</span>
                      <span className={styles.badge}>{mentorProfile.program}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.actionRow}>
                  <Link className={`${styles.actionButton} ${styles.actionPrimary}`} href="/mentorship">
                    Open Mentorship Workspace
                  </Link>
                  <Link className={styles.actionButton} href="/profile">
                    Open Profile
                  </Link>
                  <Link className={styles.actionButton} href="/community">
                    Open Community
                  </Link>
                </div>
              </article>

              <aside className={styles.accentCard}>
                <p className={styles.accentEyebrow}>Mentor signal</p>
                <h2 className={styles.accentTitle}>Requests, approvals, availability, and contact live in one focused mentor page.</h2>
                <p className={styles.accentCopy}>
                  The detail and chat threads still run through the mentorship workspace, but this page is the mentor-facing control surface.
                </p>
                <div className={styles.signalList}>
                  <div className={styles.signalItem}>
                    <span className={styles.signalLabel}>Availability</span>
                    <span className={styles.signalValue}>{mentorProfile.availabilityLabel}</span>
                  </div>
                  <div className={styles.signalItem}>
                    <span className={styles.signalLabel}>Contact</span>
                    <span className={styles.signalValue}>{mentorProfile.contactEmail}</span>
                  </div>
                  <div className={styles.signalItem}>
                    <span className={styles.signalLabel}>Request modes</span>
                    <span className={styles.signalValue}>{mentorProfile.primaryRequestType} / {mentorProfile.secondaryRequestType}</span>
                  </div>
                </div>
              </aside>
            </section>

            <section className={styles.statGrid}>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Incoming requests</span>
                <strong className={styles.statValue}>{mentorshipData.incomingRequests.length}</strong>
                <p className={styles.statMeta}>All incoming mentorship requests tied to your campus mentor account.</p>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Active appointments</span>
                <strong className={styles.statValue}>{activeIncomingRequests.length}</strong>
                <p className={styles.statMeta}>Pending or accepted requests that still need attention.</p>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Unread alerts</span>
                <strong className={styles.statValue}>{unreadNotifications.length}</strong>
                <p className={styles.statMeta}>Request and message notifications still waiting in your inbox.</p>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Expertise areas</span>
                <strong className={styles.statValue}>{mentorProfile.expertise.length}</strong>
                <p className={styles.statMeta}>Subjects or strengths currently visible on the mentor profile.</p>
              </article>
            </section>

            <section className={styles.sectionGrid}>
              <article className={`${styles.panel} ${styles.panelWide}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Mentor portfolio</h2>
                    <p className={styles.panelCopy}>The public-facing mentor identity users are effectively reading before they request time or start a chat thread.</p>
                  </div>
                  <span className={styles.badge}>{mentorProfile.statusLabel}</span>
                </div>

                <div className={styles.infoList}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Headline</span>
                    <span className={styles.infoValue}>{mentorProfile.role}</span>
                    <span className={styles.infoSubvalue}>{mentorProfile.description}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Availability</span>
                    <span className={styles.infoValue}>{mentorProfile.availabilityLabel}</span>
                    <span className={styles.infoSubvalue}>Appointments are coordinated through the live request flow in mentorship.</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Department and contact</span>
                    <span className={styles.infoValue}>{mentorProfile.department ?? "Campus-wide mentor"}</span>
                    <span className={styles.infoSubvalue}>{mentorProfile.contactEmail}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Expertise</span>
                    <div className={styles.chipRail}>
                      {mentorProfile.expertise.map((item) => (
                        <span className={styles.chip} key={item}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Appointment board</h2>
                    <p className={styles.panelCopy}>Latest incoming mentorship requests with their current approval state and requested time.</p>
                  </div>
                </div>

                {mentorshipData.incomingRequests.length ? (
                  <div className={styles.stackList}>
                    {mentorshipData.incomingRequests.slice(0, 4).map((request) => (
                      <article className={styles.stackCard} key={request.id}>
                        <div className={styles.stackHeader}>
                          <h3 className={styles.stackTitle}>{request.counterpartyName}</h3>
                          <span className={styles.badge}>{request.statusLabel}</span>
                        </div>
                        <div className={styles.stackMetaRow}>
                          <span className={styles.chip}>{request.requestTypeLabel}</span>
                          {request.scheduledLabel ? <span className={styles.chip}>{request.scheduledLabel}</span> : null}
                        </div>
                        <p className={styles.stackCopy}>{request.message ?? "No request note attached."}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyCard}>
                    <h3>No appointments yet</h3>
                    <p>Once students start requesting sessions or roadmap help, the queue will appear here.</p>
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Conversation alerts</h2>
                    <p className={styles.panelCopy}>Recent signals from requests and mentor chat threads.</p>
                  </div>
                </div>

                {mentorshipData.notifications.length ? (
                  <div className={styles.stackList}>
                    {mentorshipData.notifications.slice(0, 5).map((notification) => (
                      <article className={styles.stackCard} key={notification.id}>
                        <div className={styles.stackHeader}>
                          <h3 className={styles.stackTitle}>{notification.title}</h3>
                          {notification.unread ? <span className={`${styles.badge} ${styles.badgeStrong}`}>Unread</span> : null}
                        </div>
                        <p className={styles.stackCopy}>{notification.body}</p>
                        <div className={styles.stackMetaRow}>
                          <span className={styles.chip}>{notification.timeLabel}</span>
                          {notification.href ? (
                            <Link className={styles.actionButton} href={notification.href}>
                              Open
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyCard}>
                    <h3>Inbox is clear</h3>
                    <p>No mentor alerts are waiting right now.</p>
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Operating flow</h2>
                    <p className={styles.panelCopy}>Use this as the overview, then jump into the live workspace for accept, decline, and chat actions.</p>
                  </div>
                </div>

                <div className={styles.insightList}>
                  <div className={styles.insightItem}>
                    <strong className={styles.insightItemTitle}>1. Requests arrive here first</strong>
                    <p className={styles.insightItemBody}>Students create structured mentorship requests, including appointment intent and scheduling context.</p>
                  </div>
                  <div className={styles.insightItem}>
                    <strong className={styles.insightItemTitle}>2. Approval and chat stay in mentorship</strong>
                    <p className={styles.insightItemBody}>Accept, decline, mark complete, and continue follow-up in the live mentorship workspace.</p>
                  </div>
                  <div className={styles.insightItem}>
                    <strong className={styles.insightItemTitle}>3. Profile quality shapes trust</strong>
                    <p className={styles.insightItemBody}>Headline, expertise, and response quality are the main things users read before booking time with you.</p>
                  </div>
                </div>

                <div className={styles.linkList}>
                  <Link className={`${styles.actionButton} ${styles.actionPrimary}`} href="/mentorship">
                    Manage Requests Live
                  </Link>
                  <Link className={styles.actionButton} href="/profile">
                    Open Profile Portfolio
                  </Link>
                </div>
              </article>
            </section>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
