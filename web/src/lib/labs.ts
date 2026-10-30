import type { Database, LabIdeaStage, LabPriority, LabSubmissionStatus, LabSupportTrack } from "@/lib/supabase/types";

export const LAB_IDEA_STAGES: LabIdeaStage[] = [
  "idea",
  "research",
  "prototype",
  "paper",
  "patent",
  "build",
];

export const LAB_SUPPORT_TRACKS: LabSupportTrack[] = [
  "validation",
  "research",
  "prototype",
  "publication",
  "patent",
  "mentorship",
];

export const LAB_PRIORITIES: LabPriority[] = ["standard", "priority", "critical"];

export const LAB_SUBMISSION_STATUSES: LabSubmissionStatus[] = [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "active_build",
  "research_track",
  "publication_track",
  "patent_track",
  "showcase",
];

export const LABS_SCHEMA_HINT =
  "Apply web/supabase/labs_schema.sql to create the Labs submission backend before using intake and admin review.";

export type LabSubmissionRow = Database["public"]["Tables"]["lab_submissions"]["Row"];

export function isMissingLabsBackend(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();

  return normalized.includes("lab_submissions") && (
    normalized.includes("schema cache") ||
    normalized.includes("not found") ||
    normalized.includes("relation") ||
    normalized.includes("does not exist")
  );
}

export function isLabIdeaStage(value: string): value is LabIdeaStage {
  return LAB_IDEA_STAGES.includes(value as LabIdeaStage);
}

export function isLabSupportTrack(value: string): value is LabSupportTrack {
  return LAB_SUPPORT_TRACKS.includes(value as LabSupportTrack);
}

export function isLabPriority(value: string): value is LabPriority {
  return LAB_PRIORITIES.includes(value as LabPriority);
}

export function isLabSubmissionStatus(value: string): value is LabSubmissionStatus {
  return LAB_SUBMISSION_STATUSES.includes(value as LabSubmissionStatus);
}

export function formatLabValue(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
