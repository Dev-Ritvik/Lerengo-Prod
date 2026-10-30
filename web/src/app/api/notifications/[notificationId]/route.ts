import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedProfileForApi } from "@/lib/tenant";

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const guard = await requireVerifiedProfileForApi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { notificationId } = await context.params;
  if (!notificationId) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("university_id", guard.profile.university_id)
    .eq("user_id", guard.profile.id)
    .is("read_at", null);

  if (error) {
    return NextResponse.json({ error: "Could not update the notification." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
