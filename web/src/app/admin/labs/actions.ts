"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isLabIdeaStage,
  isLabPriority,
  isLabSubmissionStatus,
  isMissingLabsBackend,
} from "@/lib/labs";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function reviewLabSubmission(formData: FormData) {
  const submissionId = getStringValue(formData.get("submissionId"));
  const status = getStringValue(formData.get("status"));
  const priority = getStringValue(formData.get("priority"));
  const ideaStage = getStringValue(formData.get("ideaStage"));
  const assignedTo = getStringValue(formData.get("assignedTo")).slice(0, 160);
  const reviewNotes = getStringValue(formData.get("reviewNotes")).slice(0, 2000);
  const nextStep = getStringValue(formData.get("nextStep")).slice(0, 240);

  if (
    !submissionId ||
    !isLabSubmissionStatus(status) ||
    !isLabPriority(priority) ||
    !isLabIdeaStage(ideaStage)
  ) {
    redirect("/admin/labs?error=invalid_input");
  }

  const { appUser } = await requireAdminUser();
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("lab_submissions")
    .update({
      assigned_to: assignedTo || null,
      idea_stage: ideaStage,
      last_reviewed_at: new Date().toISOString(),
      next_step: nextStep || null,
      priority,
      review_notes: reviewNotes || null,
      reviewed_by: appUser.id,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("university_id", appUser.university_id);

  if (error) {
    if (isMissingLabsBackend(error)) {
      redirect("/admin/labs?error=schema_missing");
    }

    redirect("/admin/labs?error=save_failed");
  }

  redirect("/admin/labs?success=review_saved");
}
