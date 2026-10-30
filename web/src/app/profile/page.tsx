import Image from "next/image";
import Link from "next/link";
import { ProfileMenu } from "@/components/profile-menu";
import { resolveAssessmentBadge } from "@/lib/assessment-reporting";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedProfile } from "@/lib/tenant";
import { EditProfileModal } from "./edit-profile-modal";
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

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return "Not available yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available yet";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildProfileCompletion(params: {
  fullName: string | null;
  department: string | null;
  programDomain: string | null;
  batch: string | null;
  mentorHeadline: string | null;
  mentorExpertise: string[] | null | undefined;
  mentorApproved: boolean;
}) {
  const expertise = params.mentorExpertise ?? [];

  const baseChecks = [
    Boolean(params.fullName?.trim()),
    Boolean(params.department?.trim()),
    Boolean(params.programDomain?.trim()),
    Boolean(params.batch?.trim()),
  ];

  const mentorChecks = params.mentorApproved
    ? [Boolean(params.mentorHeadline?.trim()), expertise.length > 0]
    : [];

  const checks = [...baseChecks, ...mentorChecks];
  const filled = checks.filter(Boolean).length;

  return Math.round((filled / Math.max(checks.length, 1)) * 100);
}

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { authUser, profile, supabase } = await requireVerifiedProfile();
  const admin = createSupabaseAdminClient();

  const [
    { data: university },
    notesCountResponse,
    communityCountResponse,
    mentorshipCountResponse,
    unreadCountResponse,
    noteAttemptsResult,
    courseAttemptsResult,
    certificatesResult,
  ] = await Promise.all([
    profile.university_id
      ? supabase.from("universities").select("name").eq("id", profile.university_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    profile.university_id
      ? supabase
          .from("notes")
          .select("*", { count: "exact", head: true })
          .eq("university_id", profile.university_id)
          .eq("uploaded_by", profile.id)
      : Promise.resolve({ count: 0 }),
    profile.university_id
      ? supabase
          .from("community_posts")
          .select("*", { count: "exact", head: true })
          .eq("university_id", profile.university_id)
          .eq("user_id", profile.id)
      : Promise.resolve({ count: 0 }),
    profile.university_id
      ? supabase
          .from("mentorship_requests")
          .select("*", { count: "exact", head: true })
          .eq("university_id", profile.university_id)
          .or(`requester_id.eq.${profile.id},mentor_id.eq.${profile.id}`)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .is("read_at", null),
    profile.university_id
      ? admin
          .from("note_assessment_attempts")
          .select("id, note_id, score_percent, passed, submitted_at")
          .eq("user_id", profile.id)
          .eq("university_id", profile.university_id)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null }),
    admin
      .from("course_assessment_attempts")
      .select("id, course_id, score_percent, passed, submitted_at")
      .eq("user_id", profile.id)
      .order("submitted_at", { ascending: false }),
    admin
      .from("course_certificates")
      .select("id, course_id, certificate_number, issued_at, title")
      .eq("user_id", profile.id)
      .order("issued_at", { ascending: false }),
  ]);

  const userName = profile.full_name?.trim() || profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "University Name";
  const profileCompletion = buildProfileCompletion({
    batch: profile.batch,
    department: profile.department,
    fullName: profile.full_name,
    mentorApproved: profile.mentor_approved,
    mentorExpertise: profile.mentor_expertise,
    mentorHeadline: profile.mentor_headline,
    programDomain: profile.program_domain,
  });
  const roleLabel =
    profile.role === "admin"
      ? "Campus Admin"
      : profile.mentor_approved
        ? "Verified Mentor"
        : "Verified Campus Member";
  const notesCount = notesCountResponse.count ?? 0;
  const communityCount = communityCountResponse.count ?? 0;
  const mentorshipCount = mentorshipCountResponse.count ?? 0;
  const unreadCount = unreadCountResponse.count ?? 0;
  const noteAttempts = noteAttemptsResult.data ?? [];
  const courseAttempts = courseAttemptsResult.data ?? [];
  const certificates = certificatesResult.data ?? [];
  const verifiedDate = formatDateLabel(profile.verified_at);
  const memberSince = formatDateLabel(profile.created_at);
  const registrationLabel = profile.reg_id_last4 ? `Ends with ${profile.reg_id_last4}` : "Not stored";
  const mentorExpertise = (profile.mentor_expertise ?? []).filter(Boolean);
  const noteIds = Array.from(new Set(noteAttempts.map((attempt: { note_id: string }) => attempt.note_id)));
  const courseIds = Array.from(
    new Set([
      ...courseAttempts.map((attempt: { course_id: string }) => attempt.course_id),
      ...certificates.map((certificate: { course_id: string }) => certificate.course_id),
    ]),
  );
  const [{ data: noteTitles }, { data: courseTitles }] = await Promise.all([
    noteIds.length > 0
      ? admin.from("notes").select("id, title").in("id", noteIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    courseIds.length > 0
      ? admin.from("courses").select("id, title, slug").in("id", courseIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; slug: string }> }),
  ]);
  type CourseRef = { id: string; title: string; slug: string };
  const noteTitleById = new Map<string, string>((noteTitles ?? []).map((note: { id: string; title: string }) => [note.id, note.title] as [string, string]));
  const courseById = new Map<string, CourseRef>((courseTitles ?? []).map((course: CourseRef) => [course.id, course] as [string, CourseRef]));
  const bestNoteAttemptByNote = new Map<string, (typeof noteAttempts)[number]>();
  for (const attempt of noteAttempts) {
    const current = bestNoteAttemptByNote.get(attempt.note_id);
    if (
      !current ||
      attempt.score_percent > current.score_percent ||
      (attempt.score_percent === current.score_percent &&
        new Date(attempt.submitted_at).getTime() < new Date(current.submitted_at).getTime())
    ) {
      bestNoteAttemptByNote.set(attempt.note_id, attempt);
    }
  }
  const bestCourseAttemptByCourse = new Map<string, (typeof courseAttempts)[number]>();
  for (const attempt of courseAttempts) {
    const current = bestCourseAttemptByCourse.get(attempt.course_id);
    if (
      !current ||
      attempt.score_percent > current.score_percent ||
      (attempt.score_percent === current.score_percent &&
        new Date(attempt.submitted_at).getTime() < new Date(current.submitted_at).getTime())
    ) {
      bestCourseAttemptByCourse.set(attempt.course_id, attempt);
    }
  }
  const learningAchievements = [
    ...Array.from(bestNoteAttemptByNote.values()).map((attempt) => ({
      badge: resolveAssessmentBadge(attempt.score_percent, attempt.passed).label,
      href: `/browse-notes/${attempt.note_id}/test`,
      lane: "Notes Test",
      score: attempt.score_percent,
      title: noteTitleById.get(attempt.note_id) ?? "Campus note",
    })),
    ...Array.from(bestCourseAttemptByCourse.values()).map((attempt) => ({
      badge: resolveAssessmentBadge(attempt.score_percent, attempt.passed).label,
      href: courseById.get(attempt.course_id)?.slug
        ? `/courses/${courseById.get(attempt.course_id)?.slug}/test`
        : "/courses",
      lane: "SkillGO Test",
      score: attempt.score_percent,
      title: courseById.get(attempt.course_id)?.title ?? "SkillGO course",
    })),
  ]
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
  const signals = [
    { label: "Verification", value: verifiedDate },
    { label: "Role lane", value: roleLabel },
    { label: "Campus", value: universityName },
  ];
  const insights = [
    {
      title: "Campus access is live",
      body: `Your verified identity is attached to ${universityName}, so notes, mentorship, and community stay inside one university boundary.`,
    },
    {
      title: "Profile strength is measurable",
      body: `${profileCompletion}% of the current profile surface is filled, based on academic identity, batch, and mentor metadata where applicable.`,
    },
    {
      title: profile.mentor_approved ? "Mentor lane is switched on" : "Mentor lane is still optional",
      body: profile.mentor_approved
        ? `You are visible as a verified mentor${mentorExpertise.length ? ` with ${mentorExpertise.slice(0, 3).join(", ")}` : ""}.`
        : "You can still use the platform fully as a verified campus member even without mentor approval.",
    },
    {
      title: profile.role === "admin" ? "Admin workspace is enabled" : "Admin workspace is separate",
      body:
        profile.role === "admin"
          ? "This account can move into the admin workspace for moderation, verification, and operations."
          : "This account is scoped to the member workspace. Admin access stays isolated behind the dedicated admin entry flow.",
    },
  ];

  return (
    <div className={styles.viewport}>
      <main className={styles.shell}>
        <section className={styles.mainPanel}>
          <header className={styles.topBar}>
            <div className={styles.topBarFrame}>
              <div className={styles.navBar}>
                <div className={styles.brandCluster}>
                  <Link href="/" aria-label="LerenGO home" className={styles.brandLink}>
                    <Image alt="LerenGO logo" className={styles.brandLogo} height={303} priority src="/logo.lerengo.embedded.svg" width={562} />
                  </Link>

                  <nav aria-label="Workspace navigation" className={styles.workspaceNav}>
                    {WORKSPACE_NAV_ITEMS.map((item) => (
                      <Link className={styles.workspaceNavItem} href={item.href} key={item.href}>
                        <Image alt="" className={styles.workspaceNavIcon} height={30} src={item.icon} width={30} />
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
                      avatarUrl={authUser.avatarUrl ?? null}
                      displayName={displayName}
                      initials={initials}
                      showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
                      adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
                      showMentorLink={profile.mentor_approved}
                    />
                  </div>
                </div>
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
                      <img alt={`${userName} profile`} className={styles.heroAvatar} src={authUser.avatarUrl} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  <div className={styles.heroText}>
                    <p className={styles.eyebrow}>Profile portfolio</p>
                    <h1 className={styles.title}>{userName}</h1>
                    <p className={styles.description}>
                      A compact, university-scoped identity card for everything you do across notes, mentorship, community, and verification.
                    </p>
                    <EditProfileModal
                      initialData={{
                        fullName: profile.full_name ?? "",
                        department: profile.department ?? "",
                        programDomain: profile.program_domain ?? "",
                        batch: profile.batch ?? "",
                        avatarUrl: authUser.avatarUrl ?? "",
                      }}
                    />
                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${styles.badgeStrong}`}>Verified</span>
                      <span className={styles.badge}>{roleLabel}</span>
                      {profile.department ? <span className={styles.badge}>{profile.department}</span> : null}
                      {profile.program_domain ? <span className={styles.badge}>{profile.program_domain}</span> : null}
                    </div>
                  </div>
                </div>

                <div className={styles.actionRow}>
                  <Link className={`${styles.actionButton} ${styles.actionPrimary}`} href="/browse-notes">
                    Open Notes
                  </Link>
                  <Link className={styles.actionButton} href="/mentorship">
                    Open Mentorship
                  </Link>
                  <Link className={styles.actionButton} href="/community">
                    Open Community
                  </Link>
                </div>
              </article>

              <aside className={styles.accentCard}>
                <p className={styles.accentEyebrow}>Profile signal</p>
                <h2 className={styles.accentTitle}>One person, one verified campus identity, and one clean summary of what is active.</h2>
                <p className={styles.accentCopy}>
                  This page acts like the portfolio layer of the account, not just a settings stub.
                </p>
                <div className={styles.signalList}>
                  {signals.map((signal) => (
                    <div className={styles.signalItem} key={signal.label}>
                      <span className={styles.signalLabel}>{signal.label}</span>
                      <span className={styles.signalValue}>{signal.value}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            <section className={styles.statGrid}>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Profile strength</span>
                <strong className={styles.statValue}>{profileCompletion}%</strong>
                <p className={styles.statMeta}>Completion based on academic identity, batch, and mentor metadata.</p>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Notes uploaded</span>
                <strong className={styles.statValue}>{notesCount}</strong>
                <p className={styles.statMeta}>Verified notes currently attached to this account.</p>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Community posts</span>
                <strong className={styles.statValue}>{communityCount}</strong>
                <p className={styles.statMeta}>Published discussions in your university community.</p>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Mentorship threads</span>
                <strong className={styles.statValue}>{mentorshipCount}</strong>
                <p className={styles.statMeta}>{unreadCount} unread notifications currently waiting.</p>
              </article>
            </section>

            <section className={styles.sectionGrid}>
              <article className={`${styles.panel} ${styles.panelWide}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Identity block</h2>
                    <p className={styles.panelCopy}>The core academic and verification fields that define how this account behaves across the platform.</p>
                  </div>
                  <span className={styles.badge}>{memberSince}</span>
                </div>

                <div className={styles.infoList}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Full name</span>
                    <span className={styles.infoValue}>{userName}</span>
                    <span className={styles.infoSubvalue}>Primary contact: {profile.email}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>University and campus</span>
                    <span className={styles.infoValue}>{universityName}</span>
                    <span className={styles.infoSubvalue}>{profile.campus_name ?? "Campus name not set"}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Department and program</span>
                    <span className={styles.infoValue}>{profile.department ?? "Department pending"}</span>
                    <span className={styles.infoSubvalue}>{profile.program_domain ?? "Program pending"}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Batch and registration</span>
                    <span className={styles.infoValue}>{profile.batch ?? "Batch pending"}</span>
                    <span className={styles.infoSubvalue}>{registrationLabel}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoTerm}>Verification timeline</span>
                    <span className={styles.infoValue}>Verified {verifiedDate}</span>
                    <span className={styles.infoSubvalue}>Profile created {memberSince}</span>
                  </div>
                </div>
              </article>

              <article className={`${styles.panel} ${styles.panelWide}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Proof of Learning</h2>
                    <p className={styles.panelCopy}>
                      Test badges from notes and SkillGO stay attached to the same verified profile.
                    </p>
                  </div>
                  <span className={styles.badge}>{noteAttempts.length + courseAttempts.length} attempts</span>
                </div>

                {learningAchievements.length > 0 ? (
                  <div className={styles.stackList}>
                    {learningAchievements.map((achievement) => (
                      <div className={styles.stackCard} key={`${achievement.lane}-${achievement.href}`}>
                        <div className={styles.stackHeader}>
                          <strong className={styles.stackTitle}>{achievement.title}</strong>
                          <span className={styles.badge}>{achievement.score}%</span>
                        </div>
                        <p className={styles.stackCopy}>
                          {achievement.lane} / {achievement.badge}
                        </p>
                        <Link className={styles.actionButton} href={achievement.href}>
                          Open test room
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyCard}>
                    <h3>No test achievements yet</h3>
                    <p>Once you complete note tests or SkillGO assessments, badges and score proof will appear here.</p>
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Basic analysis</h2>
                    <p className={styles.panelCopy}>Short reading of how this account is positioned inside the product right now.</p>
                  </div>
                </div>

                <div className={styles.insightList}>
                  {insights.map((insight) => (
                    <div className={styles.insightItem} key={insight.title}>
                      <strong className={styles.insightItemTitle}>{insight.title}</strong>
                      <p className={styles.insightItemBody}>{insight.body}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Mentor surface</h2>
                    <p className={styles.panelCopy}>Mentor metadata only appears when the account is approved for that lane.</p>
                  </div>
                </div>

                {profile.mentor_approved ? (
                  <>
                    <div className={styles.chipRail}>
                      {(mentorExpertise.length ? mentorExpertise : ["General guidance"]).map((item) => (
                        <span className={styles.chip} key={item}>{item}</span>
                      ))}
                    </div>
                    <div className={styles.infoList}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoTerm}>Headline</span>
                        <span className={styles.infoValue}>{profile.mentor_headline?.trim() || "Approved mentor profile"}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoTerm}>Mentor status</span>
                        <span className={styles.infoValue}>{profile.mentor_active ? "Live and taking requests" : "Approved but not marked live"}</span>
                      </div>
                    </div>
                    <Link className={`${styles.actionButton} ${styles.actionPrimary}`} href="/mentor-studio">
                      Open Mentor Studio
                    </Link>
                  </>
                ) : (
                  <div className={styles.emptyCard}>
                    <h3>No mentor profile yet</h3>
                    <p>This account is still running as a verified campus member. Mentor approval is a separate access layer.</p>
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Certificates</h2>
                    <p className={styles.panelCopy}>SkillGO certificate links appear here the moment the final test is cleared.</p>
                  </div>
                </div>

                {certificates.length > 0 ? (
                  <div className={styles.linkList}>
                    {certificates.map((certificate: { id: string; course_id: string; certificate_number: string; title: string }) => {
                      const course = courseById.get(certificate.course_id);

                      return (
                        <Link
                          className={`${styles.actionButton} ${styles.actionPrimary}`}
                          href={`/certificates/${certificate.certificate_number}`}
                          key={certificate.id}
                        >
                          {course?.title ?? certificate.title}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyCard}>
                    <h3>No certificates yet</h3>
                    <p>Pass a SkillGO final test and the certificate link will appear here automatically.</p>
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Quick routes</h2>
                    <p className={styles.panelCopy}>Everything shown here is a real destination, not a placeholder button.</p>
                  </div>
                </div>

                <div className={styles.linkList}>
                  <Link className={`${styles.actionButton} ${styles.actionPrimary}`} href="/browse-notes">
                    Browse Notes
                  </Link>
                  <Link className={styles.actionButton} href="/mentorship">
                    Mentorship Workspace
                  </Link>
                  <Link className={styles.actionButton} href="/community">
                    Campus Community
                  </Link>
                  {profile.mentor_approved ? (
                    <Link className={styles.actionButton} href="/mentor-studio">
                      Mentor Studio
                    </Link>
                  ) : null}
                  {profile.role === "admin" ? (
                    <Link className={styles.actionButton} href="/admin">
                      Admin Workspace
                    </Link>
                  ) : null}
                </div>
              </article>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
