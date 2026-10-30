import { NextResponse } from "next/server";
import { buildAssessmentReport } from "@/lib/assessment-reporting";
import { resolveStructuredNoteAssessmentBundle } from "@/lib/note-content";
import { scoreNoteAssessment } from "@/lib/note-assessments";
import { canDownloadNote } from "@/lib/note-offers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

type Params = {
  params: Promise<{
    noteId: string;
  }>;
};

function normalizeAnswers(value: unknown) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [key, answer]) => {
      if (typeof answer === "string" && answer.trim()) {
        accumulator[key] = answer.trim();
      }

      return accumulator;
    },
    {},
  );
}

export async function POST(request: Request, { params }: Params) {
  const session = await requireVerifiedProfileForApi();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { noteId } = await params;
  const admin = createSupabaseAdminClient();

  const [{ data: note, error: noteError }, { data: accessRow, error: accessError }] =
    await Promise.all([
      admin
        .from("notes")
        .select("id, title, content_json, price_inr, semester, university_id, is_verified, archived_at")
        .eq("id", noteId)
        .eq("university_id", session.profile.university_id)
        .eq("is_verified", true)
        .is("archived_at", null)
        .maybeSingle(),
      admin
        .from("note_access")
        .select("id")
        .eq("user_id", session.profile.id)
        .eq("note_id", noteId)
        .maybeSingle(),
    ]);

  if (noteError || accessError) {
    return NextResponse.json(
      { error: noteError?.message ?? accessError?.message ?? "Could not load this note test." },
      { status: 500 },
    );
  }

  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (!canDownloadNote(note, Boolean(accessRow))) {
    return NextResponse.json(
      { error: "Unlock this note before taking the test." },
      { status: 402 },
    );
  }

  const bundle = resolveStructuredNoteAssessmentBundle(note.content_json, note.title);
  if (!bundle) {
    return NextResponse.json({ error: "This note does not have a test configured yet." }, { status: 404 });
  }

  const { data: ownAttempts, error: attemptsError } = await admin
    .from("note_assessment_attempts")
    .select("id, note_id, user_id, score_percent, passed, submitted_at, university_id")
    .eq("note_id", note.id)
    .eq("user_id", session.profile.id)
    .order("submitted_at", { ascending: false });

  if (attemptsError) {
    return NextResponse.json({ error: attemptsError.message }, { status: 500 });
  }

  const currentAttempts = ownAttempts ?? [];
  if (currentAttempts.length >= bundle.maxAttempts) {
    return NextResponse.json(
      { error: "Maximum attempts reached for this note test." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const answers = normalizeAnswers((body as Record<string, unknown>).answers);
  const scoring = scoreNoteAssessment(bundle.questions, answers);
  const passed = scoring.scorePercent >= bundle.passPercent;

  const { error: insertError } = await admin.from("note_assessment_attempts").insert({
    answers_json: answers,
    note_id: note.id,
    passed,
    score_percent: scoring.scorePercent,
    university_id: session.profile.university_id,
    user_id: session.profile.id,
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message ?? "Could not record note test attempt." },
      { status: 500 },
    );
  }

  const { data: rankingAttempts, error: rankingError } = await admin
    .from("note_assessment_attempts")
    .select("user_id, score_percent, submitted_at")
    .eq("note_id", note.id)
    .eq("university_id", session.profile.university_id)
    .order("submitted_at", { ascending: false });

  if (rankingError) {
    return NextResponse.json({ error: rankingError.message }, { status: 500 });
  }

  const report = buildAssessmentReport({
    attempts: (rankingAttempts ?? []).map((attempt: { user_id: string; score_percent: number; submitted_at: string }) => ({
      scorePercent: attempt.score_percent,
      submittedAt: attempt.submitted_at,
      userId: attempt.user_id,
    })),
    passed,
    scorePercent: scoring.scorePercent,
    userId: session.profile.id,
  });

  return NextResponse.json({
    passed,
    report,
    scorePercent: scoring.scorePercent,
    success: true,
  });
}
