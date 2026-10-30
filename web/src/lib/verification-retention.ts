import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { logServerEvent } from "@/lib/server-log";

type VerificationRequestRow =
  Database["public"]["Tables"]["verification_requests"]["Row"];

type AdminClient = Pick<
  ReturnType<typeof createSupabaseAdminClient>,
  "from" | "storage"
>;

function resolveVerificationRetentionCutoffIso(nowMs = Date.now()) {
  return new Date(
    nowMs - env.ID_VERIFICATION_RETENTION_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

export async function cleanupExpiredVerificationArtifacts(
  admin: AdminClient,
  options?: { limit?: number },
) {
  const limit = Math.max(1, Math.min(options?.limit ?? 40, 200));
  const cutoffIso = resolveVerificationRetentionCutoffIso();

  const { data, error } = await admin
    .from("verification_requests")
    .select("id, id_front_path")
    .neq("id_front_path", "")
    .in("status", ["approved", "rejected"])
    .lt("decided_at", cutoffIso)
    .order("decided_at", { ascending: true })
    .limit(limit);

  if (error) {
    logServerEvent("warn", "verification.cleanup_lookup_failed", { error });
    return;
  }

  const rows = (data ?? []) as Pick<
    VerificationRequestRow,
    "id" | "id_front_path"
  >[];
  const paths = rows
    .map((row) => row.id_front_path.trim())
    .filter(Boolean);

  if (paths.length === 0) {
    return;
  }

  const removeResponse = await admin.storage
    .from(env.SUPABASE_ID_CARDS_BUCKET)
    .remove(paths);

  if (removeResponse.error) {
    logServerEvent("warn", "verification.cleanup_storage_remove_failed", {
      error: removeResponse.error,
      pathCount: paths.length,
    });
    return;
  }

  const ids = rows.map((row) => row.id);
  const { error: updateError } = await admin
    .from("verification_requests")
    .update({ id_front_path: "" })
    .in("id", ids);

  if (updateError) {
    logServerEvent("warn", "verification.cleanup_marker_update_failed", {
      error: updateError,
      requestCount: ids.length,
    });
  }
}
