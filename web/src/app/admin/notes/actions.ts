"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireAdminUser } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  buildStructuredNoteContentFromInputs,
  NOTE_UNIT_SLOT_COUNT,
  type StructuredNoteAssessmentInput,
  type StructuredNoteUnitInput,
} from "@/lib/note-content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithResult(params: string) {
  redirect(`/admin/notes${params ? `?${params}` : ""}`);
}

async function getScopedNote(adminUserId: string, universityId: string, noteId: string) {
  const admin = createSupabaseAdminClient();
  const { data: note, error } = await admin
    .from("notes")
    .select("id, university_id, file_path, archived_at, content_json, video_url")
    .eq("id", noteId)
    .eq("university_id", universityId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return { admin, note, adminUserId };
}

function getOptionalPdfFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) {
    return null;
  }

  if (!value.name || value.size <= 0) {
    return null;
  }

  return value;
}

function readUnitInputs(formData: FormData): StructuredNoteUnitInput[] {
  return Array.from({ length: NOTE_UNIT_SLOT_COUNT }, (_, index) => {
    const slot = index + 1;

    return {
      mindMapInput: getStringValue(formData.get(`unit${slot}MindMap`)),
      notes: getStringValue(formData.get(`unit${slot}Notes`)),
      pyqsInput: getStringValue(formData.get(`unit${slot}Pyqs`)),
      revisionInput: getStringValue(formData.get(`unit${slot}Revision`)),
      slot,
      title: getStringValue(formData.get(`unit${slot}Title`)),
    };
  });
}

function hasAnyUnitContent(unitInputs: StructuredNoteUnitInput[]) {
  return unitInputs.some(
    (unit) =>
      Boolean(
        unit.title ||
          unit.notes ||
          unit.revisionInput ||
          unit.mindMapInput ||
          unit.pyqsInput,
      ),
  );
}

function readAssessmentInput(formData: FormData): StructuredNoteAssessmentInput | undefined {
  const questionsJson = getStringValue(formData.get("assessmentQuestionsJson"));
  if (!questionsJson) {
    return undefined;
  }

  return {
    durationMinutes: Number(getStringValue(formData.get("assessmentDurationMinutes")) || "18"),
    maxAttempts: Number(getStringValue(formData.get("assessmentMaxAttempts")) || "3"),
    passPercent: Number(getStringValue(formData.get("assessmentPassPercent")) || "70"),
    questionsJson,
    summary: getStringValue(formData.get("assessmentSummary")),
    title: getStringValue(formData.get("assessmentTitle")),
  };
}

export async function uploadNote(formData: FormData) {
  const title = getStringValue(formData.get("title"));
  const subject = getStringValue(formData.get("subject")) || null;
  const department = getStringValue(formData.get("department")) || null;
  const programDomain = getStringValue(formData.get("programDomain")) || null;
  const semesterRaw = getStringValue(formData.get("semester"));
  const description = getStringValue(formData.get("description")) || null;
  const overview = getStringValue(formData.get("overview"));
  const videoUrl = getStringValue(formData.get("videoUrl"));
  const unitInputs = readUnitInputs(formData);
  const assessmentInput = readAssessmentInput(formData);
  const priceRaw = getStringValue(formData.get("priceInr"));
  const fileEntry = getOptionalPdfFile(formData.get("pdfFile"));
  const semester = Number(semesterRaw);
  const priceInr = Number(priceRaw);

  if (
    !title ||
    !subject ||
    !department ||
    !programDomain ||
    !Number.isInteger(semester) ||
    semester < 1 ||
    semester > 12 ||
    !Number.isInteger(priceInr) ||
    priceInr < 0
  ) {
    redirectWithResult("error=invalid_input");
  }

  if (!hasAnyUnitContent(unitInputs)) {
    redirectWithResult("error=unit_content_required");
  }

  if (
    fileEntry &&
    (!fileEntry.name.toLowerCase().endsWith(".pdf") || fileEntry.type !== "application/pdf")
  ) {
    redirectWithResult("error=file_must_be_pdf");
  }

  if (assessmentInput) {
    try {
      JSON.parse(assessmentInput.questionsJson);
    } catch {
      redirectWithResult("error=invalid_assessment_questions");
    }
  }

  try {
    const { appUser, authUser } = await requireAdminUser();
    const admin = createSupabaseAdminClient();

    let filePath: string | null = null;
    if (fileEntry) {
      filePath = `${appUser.university_id}/${Date.now()}-${randomUUID()}.pdf`;
      const fileBytes = await fileEntry.arrayBuffer();

      const { error: uploadError } = await admin.storage
        .from(env.SUPABASE_NOTES_BUCKET)
        .upload(filePath, fileBytes, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        redirectWithResult("error=upload_failed");
      }
    }

    const contentJson = buildStructuredNoteContentFromInputs(
      {
        assessmentInput,
        overview,
        unitInputs,
        videoUrl,
      },
      {
        description,
        semester,
        subject,
        title,
        videoUrl,
      },
    );

    const { error: insertError } = await admin.from("notes").insert({
      content_json: contentJson,
      university_id: appUser.university_id,
      title,
      subject,
      department,
      program_domain: programDomain,
      semester,
      description,
      file_path: filePath,
      price_inr: priceInr,
      is_verified: true,
      uploaded_by: authUser.id,
      video_url: contentJson.videoUrl,
    });

    if (insertError) {
      if (filePath) {
        await admin.storage.from(env.SUPABASE_NOTES_BUCKET).remove([filePath]);
      }
      redirectWithResult("error=save_failed");
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithResult("error=upload_failed");
  }

  redirectWithResult("success=uploaded");
}

export async function updateNoteMetadata(formData: FormData) {
  const { appUser } = await requireAdminUser();
  const noteId = getStringValue(formData.get("noteId"));
  const title = getStringValue(formData.get("title"));
  const subject = getStringValue(formData.get("subject")) || null;
  const department = getStringValue(formData.get("department")) || null;
  const programDomain = getStringValue(formData.get("programDomain")) || null;
  const semester = Number(getStringValue(formData.get("semester")));
  const description = getStringValue(formData.get("description")) || null;
  const overview = getStringValue(formData.get("overview"));
  const videoUrl = getStringValue(formData.get("videoUrl"));
  const unitInputs = readUnitInputs(formData);
  const assessmentInput = readAssessmentInput(formData);
  const priceInr = Number(getStringValue(formData.get("priceInr")));

  if (
    !noteId ||
    !title ||
    !subject ||
    !department ||
    !programDomain ||
    !Number.isInteger(semester) ||
    semester < 1 ||
    semester > 12 ||
    !Number.isInteger(priceInr) ||
    priceInr < 0
  ) {
    redirectWithResult("error=invalid_input");
  }

  if (!hasAnyUnitContent(unitInputs)) {
    redirectWithResult("error=unit_content_required");
  }

  if (assessmentInput) {
    try {
      JSON.parse(assessmentInput.questionsJson);
    } catch {
      redirectWithResult("error=invalid_assessment_questions");
    }
  }

  const { admin, note } = await getScopedNote(appUser.id, appUser.university_id, noteId);
  if (!note) {
    redirectWithResult("error=note_not_found");
  }

  const contentJson = buildStructuredNoteContentFromInputs(
    {
      assessmentInput,
      overview,
      unitInputs,
      videoUrl,
    },
    {
      description,
      semester,
      subject,
      title,
      videoUrl,
    },
  );

  const { error } = await admin
    .from("notes")
    .update({
      content_json: contentJson,
      department,
      description,
      price_inr: priceInr,
      program_domain: programDomain,
      semester,
      subject,
      title,
      video_url: contentJson.videoUrl,
    })
    .eq("id", noteId)
    .eq("university_id", appUser.university_id);

  if (error) {
    redirectWithResult("error=save_failed");
  }

  redirectWithResult("success=metadata_saved");
}

export async function toggleNoteVerification(formData: FormData) {
  const { appUser } = await requireAdminUser();
  const noteId = getStringValue(formData.get("noteId"));
  const nextState = getStringValue(formData.get("nextState"));

  if (!noteId || !["true", "false"].includes(nextState)) {
    redirectWithResult("error=invalid_input");
  }

  const { admin, note } = await getScopedNote(appUser.id, appUser.university_id, noteId);
  if (!note) {
    redirectWithResult("error=note_not_found");
  }

  const { error } = await admin
    .from("notes")
    .update({ is_verified: nextState === "true" })
    .eq("id", noteId)
    .eq("university_id", appUser.university_id);

  if (error) {
    redirectWithResult("error=verification_failed");
  }

  redirectWithResult("success=verification_saved");
}

export async function archiveNote(formData: FormData) {
  const { appUser } = await requireAdminUser();
  const noteId = getStringValue(formData.get("noteId"));
  const nextState = getStringValue(formData.get("nextState"));

  if (!noteId || !["archive", "restore"].includes(nextState)) {
    redirectWithResult("error=invalid_input");
  }

  const { admin, note } = await getScopedNote(appUser.id, appUser.university_id, noteId);
  if (!note) {
    redirectWithResult("error=note_not_found");
  }

  const isArchiving = nextState === "archive";
  const { error } = await admin
    .from("notes")
    .update({
      archived_at: isArchiving ? new Date().toISOString() : null,
      archived_by: isArchiving ? appUser.id : null,
      is_verified: isArchiving ? false : true,
    })
    .eq("id", noteId)
    .eq("university_id", appUser.university_id);

  if (error) {
    redirectWithResult("error=archive_failed");
  }

  redirectWithResult(`success=${isArchiving ? "archived" : "restored"}`);
}

export async function deleteNote(formData: FormData) {
  const { appUser } = await requireAdminUser();
  const noteId = getStringValue(formData.get("noteId"));

  if (!noteId) {
    redirectWithResult("error=invalid_input");
  }

  const { admin, note } = await getScopedNote(appUser.id, appUser.university_id, noteId);
  if (!note) {
    redirectWithResult("error=note_not_found");
  }

  const scopedNote = note as NonNullable<typeof note>;

  const { error: deleteError } = await admin
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("university_id", appUser.university_id);

  if (deleteError) {
    redirectWithResult("error=delete_failed");
  }

  if (scopedNote.file_path) {
    await admin.storage.from(env.SUPABASE_NOTES_BUCKET).remove([scopedNote.file_path]);
  }

  redirectWithResult("success=deleted");
}
