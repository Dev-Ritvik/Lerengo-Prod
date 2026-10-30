import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { resolveCampusNetworkAppUrl, resolveLabsAppUrl } from "@/lib/app-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import styles from "./admin.module.css";

type ModuleCard = {
  description: string;
  href: string;
  metrics: string[];
  status: string;
  title: string;
};

type ModuleGroup = {
  description: string;
  modules: ModuleCard[];
  title: string;
};

function getModuleGroups(): ModuleGroup[] {
  return [
    {
      title: "CampusGO",
      description: "Operate the campus-scoped note, verification, mentorship, community, analytics, and payments workflows from one lane.",
      modules: [
        {
          title: "Notes Management",
          href: "/admin/notes",
          description: "Upload verified notes, maintain metadata, retire bad uploads, and prepare for pricing control.",
          metrics: ["Upload", "Edit metadata", "Verify/unverify", "Archive"],
          status: "Live",
        },
        {
          title: "Verification Management",
          href: "/admin/verification",
          description: "Review ID verification, email-verification issues, and see pending versus rejected history by campus.",
          metrics: ["Pending queue", "Approve/reject", "History", "Manual review"],
          status: "Live",
        },
        {
          title: "Community Moderation",
          href: "/admin/community",
          description: "Review reports, flag or dismiss posts, and keep the campus feed high-signal and academic.",
          metrics: ["Reports", "Flag/dismiss", "Moderation state", "Bad actor control"],
          status: "Live",
        },
        {
          title: "Mentorship Management",
          href: "/admin/mentorship",
          description: "Approve mentors, assign faculty or senior tracks, and disable inactive mentor presence per campus.",
          metrics: ["Approve mentors", "Faculty/senior/career", "Disable inactive", "Roster control"],
          status: "Live",
        },
        {
          title: "Campus Operations",
          href: "/admin/universities",
          description: "Manage university settings, departments, programs, and semester-subject mappings that shape browse-notes.",
          metrics: ["University settings", "Departments", "Programs", "Subject mappings"],
          status: "Live",
        },
        {
          title: "Analytics",
          href: "/admin/analytics",
          description: "Track active users, note usage, community activity, verification load, moderation pressure, and contributors.",
          metrics: ["Users", "Note usage", "Verification volume", "Top contributors"],
          status: "Live",
        },
        {
          title: "Payments",
          href: "/admin/payments",
          description: "Review note purchases, payment failures, audit trails, and prepare the workspace for refund controls later.",
          metrics: ["Purchases", "Failures", "Audit trail", "Revenue"],
          status: "Early",
        },
      ],
    },
    {
      title: "SkillGO",
      description: "Manage the paid learning catalog, lesson structure, and final assessment workflow.",
      modules: [
        {
          title: "SkillGO Management",
          href: "/admin/courses",
          description: "Manage paid course catalog entries, curriculum modules, private lesson links, and final assessment structure.",
          metrics: ["Catalog", "Modules", "Lessons", "Assessments"],
          status: "Live",
        },
      ],
    },
    {
      title: "ForgeGO",
      description: "Review idea intake and move accepted work through the ForgeGO pipeline.",
      modules: [
        {
          title: "ForgeGO Management",
          href: "/admin/labs",
          description: "Review idea intake, classify promising submissions, and move accepted work into research, build, publication, or patent tracks.",
          metrics: ["Submissions", "Review", "Tracks", "Showcase"],
          status: "Live",
        },
      ],
    },
    {
      title: "MentorGO",
      description: "Operate verified mentor profiles, booking states, payment state review, and marketplace trust controls.",
      modules: [
        {
          title: "MentorGO Management",
          href: "/admin/mentorgo",
          description: "Review mentor applications, control publication, monitor paid booking states, and keep mentor quality explicit.",
          metrics: ["Mentor review", "Publish control", "Booking states", "Payment boundary"],
          status: "Foundation",
        },
      ],
    },
    {
      title: "HunterGO",
      description: "Operate verified talent discovery, recruiter verification, opportunity moderation, and privacy-first access control.",
      modules: [
        {
          title: "HunterGO Management",
          href: "/admin/huntergo",
          description: "Verify recruiters and companies, review opportunities, and monitor opt-in student talent visibility.",
          metrics: ["Recruiter review", "Company trust", "Opportunities", "Talent privacy"],
          status: "Foundation",
        },
      ],
    },
  ];
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { appUser, supabase } = await requireAdminUser();
  const admin = createSupabaseAdminClient();
  const campusNetworkUrl = resolveCampusNetworkAppUrl();
  const labsUrl = resolveLabsAppUrl();

  const [
    { data: university, error: universityError },
    { count: notesCount, error: notesError },
    { count: pendingVerificationCount, error: verificationError },
    { count: openReportsCount, error: reportsError },
    { count: activeUsersCount, error: usersError },
  ] = await Promise.all([
    supabase.from("universities").select("name", { head: false }).eq("id", appUser.university_id).maybeSingle(),
    admin.from("notes").select("id", { count: "exact", head: true }).eq("university_id", appUser.university_id),
    admin
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("university_id", appUser.university_id)
      .eq("status", "pending"),
    admin
      .from("community_reports")
      .select("id", { count: "exact", head: true })
      .eq("university_id", appUser.university_id)
      .eq("status", "open"),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("university_id", appUser.university_id)
      .eq("verified", true),
  ]);

  if (universityError || notesError || verificationError || reportsError || usersError) {
    throw new Error(
      universityError?.message ||
        notesError?.message ||
        verificationError?.message ||
        reportsError?.message ||
        usersError?.message ||
        "Failed to load admin dashboard.",
    );
  }

  const moduleGroups = getModuleGroups();
  const universityName = university?.name ?? "Your university";

  return (
    <main className={`shell ${styles.shell}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Admin Workspace</p>
          <h1 className={styles.heroTitle}>Campus Admin Dashboard</h1>
          <p className={styles.heroSubtitle}>
            Operate {universityName} from one control surface. Manage verified notes,
            student verification, community moderation, and the modules that will follow.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="button secondary small" href="/admin/surfaces">
            Switch lane
          </Link>
          <a className="button secondary small" href={`${campusNetworkUrl}/campus-network`}>
            CampusGO
          </a>
          <a className="button secondary small" href={`${campusNetworkUrl}/community`}>
            Campus Community
          </a>
          <a className="button secondary small" href={`${labsUrl}/labs`}>
            ForgeGO
          </a>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{activeUsersCount ?? 0}</span>
          <span className={styles.statLabel}>Verified users</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{notesCount ?? 0}</span>
          <span className={styles.statLabel}>Published notes</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{pendingVerificationCount ?? 0}</span>
          <span className={styles.statLabel}>Pending verifications</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statValue}>{openReportsCount ?? 0}</span>
          <span className={styles.statLabel}>Open community reports</span>
        </article>
      </section>

      <section className="stack">
        <div className={styles.sectionHeading}>
          <h2>Admin Modules</h2>
          <p>These workspaces are live and campus-scoped. Notes, verification, community, mentorship, ForgeGO operations, analytics, and payments now live under one admin surface.</p>
        </div>
        <div className={styles.moduleGroups}>
          {moduleGroups.map((group) => (
            <div className={styles.moduleGroup} key={group.title}>
              <div className={styles.groupHeading}>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              <div className={styles.moduleGrid}>
                {group.modules.map((module) => (
                  <Link className={styles.moduleCard} href={module.href} key={module.href}>
                    <div className={styles.cardTopRow}>
                      <h4 className={styles.cardTitle}>{module.title}</h4>
                      <span className={styles.statusPill}>{module.status}</span>
                    </div>
                    <p className={styles.cardDescription}>{module.description}</p>
                    <div className={styles.pillRow}>
                      {module.metrics.map((metric) => (
                        <span className={styles.pill} key={metric}>
                          {metric}
                        </span>
                      ))}
                    </div>
                    <div className={styles.linkRow}>
                      <span className={styles.linkLabel}>Open module</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
