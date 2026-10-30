import { notFound } from "next/navigation";
import { AssessmentRoom } from "@/components/assessment-room";
import { resolveNoteAssessmentSummary } from "@/lib/note-assessments";
import { canDownloadNote, isNoteInOfferSemester } from "@/lib/note-offers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { requireVerifiedProfile } from "@/lib/tenant";

type Props = {
  params: Promise<{
    noteId: string;
  }>;
};

type NoteAssessmentAttemptRow = Database["public"]["Tables"]["note_assessment_attempts"]["Row"];

export const dynamic = "force-dynamic";

export default async function NoteTestPage({ params }: Props) {
  const { noteId } = await params;
  const { profile } = await requireVerifiedProfile();
  const admin = createSupabaseAdminClient();

  const [{ data: note, error: noteError }, { data: accessRow, error: accessError }] = await Promise.all([
    admin
      .from("notes")
      .select("id, title, description, content_json, price_inr, semester, university_id, is_verified, archived_at")
      .eq("id", noteId)
      .eq("university_id", profile.university_id)
      .eq("is_verified", true)
      .is("archived_at", null)
      .maybeSingle(),
    admin
      .from("note_access")
      .select("id")
      .eq("note_id", noteId)
      .eq("user_id", profile.id)
      .maybeSingle(),
  ]);

  if (noteError || accessError) {
    throw new Error(noteError?.message || accessError?.message || "Failed to load note test.");
  }

  if (!note) {
    notFound();
  }

  const [ownAttemptsResult, allAttemptsResult] = await Promise.all([
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
  ]);

  if (ownAttemptsResult.error || allAttemptsResult.error) {
    throw new Error(
      ownAttemptsResult.error?.message ||
        allAttemptsResult.error?.message ||
        "Failed to load note attempt history.",
    );
  }

  const assessment = resolveNoteAssessmentSummary({
    allAttempts: (allAttemptsResult.data ?? []) as NoteAssessmentAttemptRow[],
    contentJson: note.content_json,
    noteTitle: note.title,
    ownAttempts: (ownAttemptsResult.data ?? []) as NoteAssessmentAttemptRow[],
    userId: profile.id,
  });

  if (!assessment) {
    notFound();
  }

  const isUnlocked =
    note.price_inr <= 0 || isNoteInOfferSemester(note.semester) || canDownloadNote(note, Boolean(accessRow));

  return (
    <AssessmentRoom
      backHref={`/browse-notes/${note.id}`}
      backLabel="Back to note"
      certificate={null}
      eyebrow="Notes Test Room"
      initialAttemptCount={assessment.attemptCount}
      initialLatestPassed={assessment.latestPassed}
      initialLatestScorePercent={assessment.latestScorePercent}
      initialReport={assessment.report}
      lockedBody={
        isUnlocked
          ? undefined
          : "Unlock this note first. The unit reader and its test stay attached to the same note access."
      }
      lockedTitle={isUnlocked ? undefined : "Note test locked"}
      maxAttempts={assessment.maxAttempts}
      passPercent={assessment.passPercent}
      questions={assessment.questions}
      submitEndpoint={`/api/notes/${note.id}/assessment`}
      submitLabel="Submit note test"
      subtitle={
        note.description?.trim() ||
        "A focused unit-based test room for this note, with score report, rank, and badge feedback."
      }
      timerMinutes={assessment.durationMinutes}
      title={assessment.title}
    />
  );
}
