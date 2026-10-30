import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import {
  resolveCampusNetworkAppUrl,
  resolveCoursesAppUrl,
  resolveLabsAppUrl,
} from "@/lib/app-url";
import { SurfaceLaneCard } from "./surface-lane-card";
import shared from "../workspace.module.css";
import styles from "./surfaces.module.css";

const laneCards = [
  {
    title: "CampusGO",
    description:
      "Moderate community, review verification, manage notes, approve mentors, and keep the weekly campus layer accurate.",
    href: "/admin",
    liveHref: `${resolveCampusNetworkAppUrl()}/campus-network`,
    metrics: ["Notes", "Verification", "Community", "Mentorship"],
    status: "Campus ops",
  },
  {
    title: "SkillGO",
    description:
      "Control paid catalog entries, private lesson links, assessments, certificates, and course-side publishing decisions.",
    href: "/admin/courses",
    liveHref: `${resolveCoursesAppUrl()}/courses`,
    metrics: ["Catalog", "Videos", "Assessments", "Enrollments"],
    status: "Course ops",
  },
  {
    title: "ForgeGO",
    description:
      "Review idea intake, route serious submissions into research or build tracks, and move promising work toward publication, patent, or showcase outcomes.",
    href: "/admin/labs",
    liveHref: `${resolveLabsAppUrl()}/labs`,
    metrics: ["Intake", "Review", "Research", "Patent / Publication"],
    status: "Innovation ops",
  },
] as const;

export const dynamic = "force-dynamic";

export default async function AdminSurfacesPage() {
  const { appUser } = await requireAdminUser();
  const universityName = appUser.campus_name ?? "your campus";

  return (
    <main className={`shell ${shared.page}`}>
      <section className={shared.topbar}>
        <div className={shared.titleWrap}>
          <p className={shared.eyebrow}>Admin Workspace</p>
          <h1 className={shared.title}>Choose the admin lane</h1>
          <p className={shared.subtitle}>
            OTP verification is complete. Pick the workspace lane you want to operate for {universityName},
            then move into the corresponding admin surface.
          </p>
        </div>
        <div className={shared.actions}>
          <Link className="button secondary small" href="/admin/login">
            Use different admin email
          </Link>
        </div>
      </section>

      <section className={`${shared.panel} ${styles.surfaceShell}`}>
        <div className={styles.surfaceHeader}>
          <div>
            <p className={styles.surfaceEyebrow}>Verified admin session</p>
            <h2 className={styles.surfaceTitle}>CampusGO, SkillGO, or ForgeGO</h2>
          </div>
          <span className={shared.pill}>OTP verified</span>
        </div>

        <div className={styles.surfaceGrid}>
          {laneCards.map((lane) => (
            <SurfaceLaneCard key={lane.title} {...lane} />
          ))}
        </div>
      </section>
    </main>
  );
}
