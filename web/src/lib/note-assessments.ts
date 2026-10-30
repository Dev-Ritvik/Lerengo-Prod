import { buildAssessmentReport, type AssessmentReport } from "@/lib/assessment-reporting";
import {
  resolveStructuredNoteAssessmentBundle,
  type StructuredNoteAssessmentBundle,
  type StructuredNoteAssessmentQuestion,
} from "@/lib/note-content";
import type { Database } from "@/lib/supabase/types";

type NoteAssessmentAttemptRow = Database["public"]["Tables"]["note_assessment_attempts"]["Row"];

export type NoteAssessmentSummary = {
  attemptCount: number;
  durationMinutes: number;
  latestPassed: boolean | null;
  latestScorePercent: number | null;
  maxAttempts: number;
  passPercent: number;
  questions: StructuredNoteAssessmentQuestion[];
  report: AssessmentReport | null;
  summary: string | null;
  title: string;
};

export function scoreNoteAssessment(
  questions: StructuredNoteAssessmentBundle["questions"],
  answers: Record<string, string>,
) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { correctCount: 0, scorePercent: 0 };
  }

  const correctCount = questions.reduce((count, question) => {
    return count + (answers[question.id] === question.correctOptionId ? 1 : 0);
  }, 0);

  return {
    correctCount,
    scorePercent: Math.round((correctCount / questions.length) * 100),
  };
}

export function resolveNoteAssessmentSummary(params: {
  allAttempts?: NoteAssessmentAttemptRow[];
  contentJson: unknown;
  noteTitle: string;
  ownAttempts?: NoteAssessmentAttemptRow[];
  userId?: string | null;
}): NoteAssessmentSummary | null {
  const bundle = resolveStructuredNoteAssessmentBundle(params.contentJson, params.noteTitle);
  if (!bundle) {
    return null;
  }

  const ownAttempts = params.ownAttempts ?? [];
  const latestAttempt = ownAttempts[0] ?? null;
  const report =
    latestAttempt && params.userId
      ? buildAssessmentReport({
          attempts: (params.allAttempts ?? ownAttempts).map((attempt) => ({
            scorePercent: attempt.score_percent,
            submittedAt: attempt.submitted_at,
            userId: attempt.user_id,
          })),
          passed: latestAttempt.passed,
          scorePercent: latestAttempt.score_percent,
          userId: params.userId,
        })
      : null;

  return {
    attemptCount: ownAttempts.length,
    durationMinutes: bundle.durationMinutes,
    latestPassed: latestAttempt?.passed ?? null,
    latestScorePercent: latestAttempt?.score_percent ?? null,
    maxAttempts: bundle.maxAttempts,
    passPercent: bundle.passPercent,
    questions: bundle.questions.map((question) => ({
      id: question.id,
      options: question.options,
      prompt: question.prompt,
    })),
    report,
    summary: bundle.summary,
    title: bundle.title,
  };
}
