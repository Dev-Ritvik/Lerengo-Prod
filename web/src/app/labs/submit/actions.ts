"use server";

import { redirect } from "next/navigation";
import { requireUniversityAffiliatedUser } from "@/lib/auth";
import {
  isLabIdeaStage,
  isLabSupportTrack,
  isMissingLabsBackend,
} from "@/lib/labs";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getListValue(value: FormDataEntryValue | null) {
  return getStringValue(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function submitLabIdea(formData: FormData) {
  const title = getStringValue(formData.get("title")).slice(0, 160);
  const domain = getStringValue(formData.get("domain")).slice(0, 120);
  const submissionSummary = getStringValue(formData.get("submissionSummary")).slice(0, 260);
  const problemStatement = getStringValue(formData.get("problemStatement")).slice(0, 3000);
  const ideaStage = getStringValue(formData.get("ideaStage"));
  const supportTracks = formData
    .getAll("supportTracks")
    .map((value) => getStringValue(value))
    .filter(Boolean);
  const skillsSnapshot = getStringValue(formData.get("skillsSnapshot")).slice(0, 600);
  const teamContext = getStringValue(formData.get("teamContext")).slice(0, 900);
  const links = getListValue(formData.get("links")).slice(0, 10);
  const publicationInterest = getStringValue(formData.get("publicationInterest")) === "true";
  const patentInterest = getStringValue(formData.get("patentInterest")) === "true";

  if (
    !title ||
    !domain ||
    !submissionSummary ||
    !problemStatement ||
    !isLabIdeaStage(ideaStage)
  ) {
    redirect("/labs/submit?error=invalid_input");
  }

  const validatedSupportTracks = supportTracks.filter(isLabSupportTrack);
  if (validatedSupportTracks.length === 0) {
    redirect("/labs/submit?error=support_required");
  }

  const { appUser, supabase } = await requireUniversityAffiliatedUser();

  const { error } = await supabase.from("lab_submissions").insert({
    domain,
    idea_stage: ideaStage,
    links,
    patent_interest: patentInterest,
    problem_statement: problemStatement,
    publication_interest: publicationInterest,
    skills_snapshot: skillsSnapshot || null,
    submission_summary: submissionSummary,
    support_tracks: validatedSupportTracks,
    team_context: teamContext || null,
    title,
    university_id: appUser.university_id,
    user_id: appUser.id,
  });

  if (error) {
    if (isMissingLabsBackend(error)) {
      redirect("/labs/submit?error=schema_missing");
    }

    redirect("/labs/submit?error=submit_failed");
  }

  redirect("/labs/submit?success=submitted");
}
