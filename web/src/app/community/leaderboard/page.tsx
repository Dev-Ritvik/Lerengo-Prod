import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";
import { requireVerifiedProfile } from "@/lib/tenant";
import { buildCommunityLeaderboardData } from "../data";
import styles from "./page.module.css";

function getFirstName(value: string | null | undefined) {
  if (!value) {
    return "User";
  }
  return value.trim().split(/\s+/)[0] || "User";
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "U";
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  return parts.length === 1
    ? parts[0].slice(0, 1).toUpperCase()
    : `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export const dynamic = "force-dynamic";

export default async function CommunityLeaderboardPage() {
  const { authUser, profile, supabase } = await requireVerifiedProfile();
  if (!profile.university_id) {
    redirect("/community");
  }
  const { data: university } = await supabase.from("universities").select("name").eq("id", profile.university_id).maybeSingle();
  const leaderboard = await buildCommunityLeaderboardData({ universityId: profile.university_id });

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "University Name";

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
              <span className={styles.searchCopy}>Community Leaderboard</span>
            </div>
          </div>
          <div className={styles.profileDock}>
            <ProfileMenu
              avatarUrl={authUser.avatarUrl ?? null}
              displayName={displayName}
              initials={initials}
              showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
              adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
            />
          </div>
        </header>

        <div className={styles.contentPane}>
          <div className={styles.sectionHeaderRow}>
            <div>
              <p className={styles.eyebrow}>LerenGO &gt; Campus Community</p>
              <h1 className={styles.pageTitle}>Leaderboard</h1>
              <p className={styles.pageDescription}>Trust-ranked contributors based on posts, replies, helpful actions, and moderation signal.</p>
            </div>
            <div className={styles.headerActions}>
              <Link className={styles.secondaryButton} href="/community">Back to Community</Link>
            </div>
          </div>

          <div className={styles.statsRow}>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{leaderboard.totals.contributors}</span>
              <span className={styles.statLabel}>Active contributors</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{leaderboard.totals.posts}</span>
              <span className={styles.statLabel}>Discussion posts</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statValue}>{leaderboard.totals.comments}</span>
              <span className={styles.statLabel}>Replies posted</span>
            </article>
          </div>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.subsectionTitle}>Top Contributors</h2>
            </div>
            <div className={styles.leaderboardList}>
              {leaderboard.entries.map((entry, index) => (
                <article className={styles.leaderboardCard} key={entry.id}>
                  <div className={styles.rankBadge}>{index + 1}</div>
                  <div className={styles.avatarLarge}>{entry.initials}</div>
                  <div className={styles.leaderboardMeta}>
                    <div className={styles.leaderboardTopRow}>
                      <strong className={styles.contributorName}>{entry.name}</strong>
                      <span className={styles.metricPill}>{entry.reputation}</span>
                    </div>
                    <div className={styles.tagRow}>
                      <span className={styles.tagPill}>{entry.badge}</span>
                    </div>
                    <p className={styles.updateSubtitle}>{entry.subtitle}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
