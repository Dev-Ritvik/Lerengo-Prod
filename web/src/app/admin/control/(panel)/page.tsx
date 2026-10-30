import Link from "next/link";
import { requireSuperAdminUser } from "@/lib/superadmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import styles from "../control.module.css";

export const dynamic = "force-dynamic";

type CountResult = { count: number | null; error: unknown };

function toCount(result: PromiseSettledResult<CountResult>): number {
  if (result.status !== "fulfilled" || result.value.error) {
    return 0;
  }
  return result.value.count ?? 0;
}

type ControlLink = {
  href: string;
  title: string;
  body: string;
  external?: boolean;
};

const CONTROL_SURFACES: ControlLink[] = [
  { href: "/admin/control/users", title: "Users", body: "Ban / unban, change roles, and control verification for every account." },
  { href: "/admin/control/mentors", title: "Mentors", body: "Approve, publish, suspend, delete, or add MentorGO mentors." },
  { href: "/admin/control/courses", title: "Courses", body: "Create, publish, unpublish, or delete SkillGO courses." },
];

const MODULE_ADMIN: ControlLink[] = [
  { href: "/admin", title: "Campus admin home", body: "The campus-scoped operations dashboard." },
  { href: "/admin/notes", title: "Notes", body: "Verified notes catalog and pricing." },
  { href: "/admin/verification", title: "Verification", body: "Student ID / email verification queue." },
  { href: "/admin/community", title: "Community", body: "Moderate reports and the campus feed." },
  { href: "/admin/mentorship", title: "Mentorship", body: "Campus mentor approvals and rosters." },
  { href: "/admin/universities", title: "Universities", body: "Campuses, departments, and subject mappings." },
  { href: "/admin/labs", title: "ForgeGO", body: "Idea intake and research/build tracks." },
  { href: "/admin/mentorgo", title: "MentorGO ops", body: "Bookings and marketplace trust controls." },
  { href: "/admin/huntergo", title: "HunterGO", body: "Recruiter verification and opportunities." },
  { href: "/admin/payments", title: "Payments", body: "Purchases, failures, and revenue." },
];

export default async function ControlOverviewPage() {
  const { appUser } = await requireSuperAdminUser();
  const admin = createSupabaseAdminClient();

  const count = (table: string, apply?: (q: any) => any): Promise<CountResult> => {
    let query = admin.from(table).select("id", { count: "exact", head: true });
    if (apply) {
      query = apply(query);
    }
    return query.then((res: CountResult) => res);
  };

  const results = await Promise.allSettled([
    count("users"),
    count("users", (q) => q.eq("verified", true)),
    count("users", (q) => q.eq("is_banned", true)),
    count("universities"),
    count("mentor_profiles"),
    count("mentor_profiles", (q) => q.eq("is_published", true)),
    count("courses"),
    count("courses", (q) => q.eq("is_published", true)),
    count("verification_requests", (q) => q.eq("status", "pending")),
    count("community_reports", (q) => q.eq("status", "open")),
  ]);

  const [
    totalUsers,
    verifiedUsers,
    bannedUsers,
    universities,
    totalMentors,
    publishedMentors,
    totalCourses,
    publishedCourses,
    pendingVerifications,
    openReports,
  ] = results.map(toCount);

  const stats = [
    { value: totalUsers, label: "Total users" },
    { value: verifiedUsers, label: "Verified users" },
    { value: bannedUsers, label: "Banned users" },
    { value: universities, label: "Universities" },
    { value: `${publishedMentors}/${totalMentors}`, label: "Mentors published" },
    { value: `${publishedCourses}/${totalCourses}`, label: "Courses published" },
    { value: pendingVerifications, label: "Pending verifications" },
    { value: openReports, label: "Open community reports" },
  ];

  return (
    <>
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>Overview</p>
        <h1 className={styles.heroTitle}>Control anything and everything</h1>
        <p className={styles.heroSubtitle}>
          Signed in as {appUser.email}. This is the platform-wide control plane. Every campus and
          every module in one place — user bans, mentor approvals, course publishing, and moderation.
        </p>
      </section>

      <section className={styles.statsGrid}>
        {stats.map((stat) => (
          <article className={styles.statCard} key={stat.label}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>Control surfaces</h2>
          <p>Platform-wide, not scoped to any single campus.</p>
        </div>
        <div className={styles.cardGrid}>
          {CONTROL_SURFACES.map((item) => (
            <Link className={styles.linkCard} href={item.href} key={item.href}>
              <span className={styles.linkCardTitle}>{item.title}</span>
              <span className={styles.linkCardBody}>{item.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>Campus &amp; module admin</h2>
          <p>The existing campus-scoped admin lanes. Superadmin can open all of them.</p>
        </div>
        <div className={styles.cardGrid}>
          {MODULE_ADMIN.map((item) => (
            <Link className={styles.linkCard} href={item.href} key={item.href}>
              <span className={styles.linkCardTitle}>{item.title}</span>
              <span className={styles.linkCardBody}>{item.body}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
