import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ScrollRevealController } from "@/components/scroll-reveal-controller";
import { TransitionLink } from "@/components/transition-link";
import { ProfileMenu } from "@/components/profile-menu";
import { NoteDetailShell } from "./note-detail-shell";
import {
  buildPreviewStructuredNoteContent,
  normalizeStructuredNoteContent,
} from "@/lib/note-content";
import { resolveNoteAssessmentSummary } from "@/lib/note-assessments";
import { canDownloadNote, isNoteInOfferSemester } from "@/lib/note-offers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { requireVerifiedProfile } from "@/lib/tenant";
import styles from "./page.module.css";

type Props = {
  params: Promise<{
    noteId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { noteId } = await params;
  const { supabase } = await requireVerifiedProfile();
  const { data: note } = await supabase
    .from("notes")
    .select("title")
    .eq("id", noteId)
    .maybeSingle();

  return {
    title: note?.title ? `${note.title} | LerenGO` : "Note Details | LerenGO",
  };
}


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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

type NoteAssessmentAttemptRow = Database["public"]["Tables"]["note_assessment_attempts"]["Row"];

export default async function BrowseNoteDetailPage({ params }: Props) {
  const { noteId } = await params;
  const { authUser, profile, supabase } = await requireVerifiedProfile();

  const [{ data: university }, { data: note, error: noteError }] = await Promise.all([
    supabase.from("universities").select("name").eq("id", profile.university_id).maybeSingle(),
    supabase
      .from("notes")
      .select(
        "id, title, subject, description, department, program_domain, semester, file_path, content_json, video_url, price_inr, created_at, updated_at, university_id, is_verified, archived_at",
      )
      .eq("id", noteId)
      .eq("university_id", profile.university_id)
      .eq("is_verified", true)
      .is("archived_at", null)
      .maybeSingle(),
  ]);

  if (noteError) {
    throw new Error(noteError.message);
  }

  if (!note) {
    notFound();
  }

  const [{ data: accessRow, error: accessError }, { data: relatedNotes, error: relatedNotesError }] =
    await Promise.all([
      supabase
        .from("note_access")
        .select("id")
        .eq("user_id", profile.id)
        .eq("note_id", note.id)
        .maybeSingle(),
      supabase
        .from("notes")
        .select("id, title, subject, semester")
        .eq("university_id", profile.university_id)
        .eq("is_verified", true)
        .is("archived_at", null)
        .neq("id", note.id)
        .order("updated_at", { ascending: false })
        .limit(4),
    ]);

  if (accessError || relatedNotesError) {
    throw new Error(accessError?.message || relatedNotesError?.message || "Failed to load note detail.");
  }

  const admin = createSupabaseAdminClient();
  const assessmentConfigured = Boolean(
    note.content_json &&
      typeof note.content_json === "object" &&
      !Array.isArray(note.content_json) &&
      "assessment" in (note.content_json as Record<string, unknown>),
  );
  const [ownAttemptsResult, allAttemptsResult] = assessmentConfigured
    ? await Promise.all([
        admin
          .from("note_assessment_attempts")
          .select("id, note_id, user_id, score_percent, passed, submitted_at, university_id, answers_json, created_at, updated_at")
          .eq("note_id", note.id)
          .eq("user_id", profile.id)
          .order("submitted_at", { ascending: false }),
        admin
          .from("note_assessment_attempts")
          .select("id, note_id, user_id, score_percent, passed, submitted_at, university_id, answers_json, created_at, updated_at")
          .eq("note_id", note.id)
          .eq("university_id", profile.university_id)
          .order("submitted_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (ownAttemptsResult.error || allAttemptsResult.error) {
    throw new Error(
      ownAttemptsResult.error?.message || allAttemptsResult.error?.message || "Failed to load note test data.",
    );
  }

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "University Name";
  const hasAccess = canDownloadNote(note, Boolean(accessRow));
  const isOfferFree = note.price_inr > 0 && isNoteInOfferSemester(note.semester);
  const readerUnlocked = hasAccess || note.price_inr <= 0 || isOfferFree;
  const fullContent = normalizeStructuredNoteContent(note.content_json, {
    description: note.description,
    semester: note.semester,
    subject: note.subject,
    title: note.title,
    videoUrl: note.video_url,
  });
  const displayContent =
    readerUnlocked
      ? fullContent
      : buildPreviewStructuredNoteContent(fullContent);
  const assessment = resolveNoteAssessmentSummary({
    allAttempts: (allAttemptsResult.data ?? []) as NoteAssessmentAttemptRow[],
    contentJson: note.content_json,
    noteTitle: note.title,
    ownAttempts: (ownAttemptsResult.data ?? []) as NoteAssessmentAttemptRow[],
    userId: profile.id,
  });

  return (
    <div className={styles.viewport}>
      <ScrollRevealController />

      <main className={styles.canvas}>
        {/* ── Header ── */}
        <header className={`${styles.header} ${styles.reveal}`} data-reveal>
          <div className={styles.headerLeft}>
            <TransitionLink href="/campus-network" className={styles.brand} aria-label="LerenGO home">
              <Image
                src="/logo.lerengo.embedded.svg"
                alt="LerenGO logo"
                width={562}
                height={303}
                className={styles.logoImage}
                priority
              />
            </TransitionLink>

            <div className={styles.campusBadge}>
              <Image
                alt=""
                aria-hidden="true"
                className={styles.campusLogo}
                height={24}
                src="/lpu logo.png"
                width={24}
              />
              <span className={styles.campusName}>{universityName}</span>
            </div>
          </div>

          <nav className={styles.nav} aria-label="CampusGO navigation">
            <TransitionLink href="/browse-notes" className={styles.navLink}>Notes</TransitionLink>
            <TransitionLink href="/mentorship" className={styles.navLink}>Mentorship</TransitionLink>
            <TransitionLink href="/community" className={styles.navLink}>Community</TransitionLink>
            <TransitionLink href="/community/project-board" className={styles.navLink}>Projects</TransitionLink>
          </nav>

          <div className={styles.profileWrap}>
            <ProfileMenu
              avatarUrl={authUser.avatarUrl ?? null}
              displayName={displayName}
              initials={initials}
              showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
              adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
            />
          </div>
        </header>

        {/* ── Content ── */}
        <div style={{ marginTop: "40px" }}>
          <NoteDetailShell
            isSuperadmin={profile.role === "superadmin"}
            createdLabel={formatDate(note.created_at)}
            content={displayContent}
            department={note.department}
            description={note.description}
            downloadHref={note.file_path ? `/api/notes/${note.id}/download` : null}
            email={profile.email}
            hasAccess={hasAccess}
            hasReferencePdf={Boolean(note.file_path)}
            isOfferFree={isOfferFree}
            noteId={note.id}
            assessment={assessment}
            priceInr={note.price_inr}
            programDomain={note.program_domain}
            relatedNotes={relatedNotes ?? []}
            semester={note.semester}
            subject={note.subject}
            testHref={assessment && readerUnlocked ? `/browse-notes/${note.id}/test` : null}
            title={note.title}
            updatedLabel={formatDate(note.updated_at)}
            userName={userName}
          />
        </div>
      </main>
    </div>
  );
}

