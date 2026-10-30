import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isNoteInOfferSemester } from "@/lib/note-offers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

type RouteParams = {
  params: Promise<{
    noteId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { noteId } = await params;
  const tenant = await requireVerifiedProfileForApi();
  if (!tenant.ok) {
    if (tenant.status === 401) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.json({ error: tenant.error }, { status: tenant.status });
  }
  const { profile, supabase } = tenant;

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id, university_id, file_path, price_inr, is_verified, semester, archived_at")
    .eq("id", noteId)
    .is("archived_at", null)
    .maybeSingle();

  if (noteError || !note || !note.is_verified) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (note.university_id !== profile.university_id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!note.file_path) {
    return NextResponse.json(
      { error: "Reference PDF is not available for this note." },
      { status: 404 },
    );
  }

  if (note.price_inr > 0 && !isNoteInOfferSemester(note.semester)) {
    const { data: accessRow, error: accessError } = await supabase
      .from("note_access")
      .select("id")
      .eq("user_id", profile.id)
      .eq("note_id", note.id)
      .maybeSingle();

    if (accessError || !accessRow) {
      return NextResponse.json({ error: "Payment required." }, { status: 403 });
    }
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from(env.SUPABASE_NOTES_BUCKET)
    .createSignedUrl(note.file_path, 60 * 5);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { error: "Could not generate signed URL." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signedUrlData.signedUrl);
}
