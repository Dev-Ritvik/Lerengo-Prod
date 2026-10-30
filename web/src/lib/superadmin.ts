import { redirect } from "next/navigation";
import { getSessionUser, type SessionContext } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppUser } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";

export type SuperAdminContext = {
  authUser: SessionContext["authUser"];
  supabase: SessionContext["supabase"];
  appUser: AppUser;
};

export function isSuperAdminUser(
  candidate: Pick<AppUser, "role" | "verified" | "is_banned"> | null | undefined,
): boolean {
  if (!candidate) {
    return false;
  }
  return (
    candidate.role === "superadmin" &&
    candidate.verified === true &&
    candidate.is_banned !== true
  );
}

/**
 * Platform-wide guard. Unlike requireAdminUser (which is campus-scoped and needs a
 * university_id), the superadmin is global: it only requires a verified 'superadmin'
 * row that is not banned. Reads/writes in the control dashboard use the service-role
 * client, so this guard is the single gate for the whole /admin/control surface.
 */
export async function requireSuperAdminUser(): Promise<SuperAdminContext> {
  const session = await getSessionUser();
  if (!session) {
    redirect("/admin/control/login");
  }

  const { data, error } = await session.supabase
    .from("users")
    .select("*")
    .eq("id", session.authUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const appUser = data as AppUser | null;
  if (!isSuperAdminUser(appUser) || !appUser) {
    redirect("/admin/control/login?error=not_superadmin");
  }

  return {
    authUser: session.authUser,
    supabase: session.supabase,
    appUser,
  };
}

export type AuditEntry = {
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort audit trail for superadmin actions. Never throws — an audit failure must
 * not block the action the operator intended.
 */
export async function recordAdminAudit(
  actor: Pick<AppUser, "id" | "email">,
  entry: AuditEntry,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("admin_audit_log").insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action: entry.action,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      summary: entry.summary ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch {
    // Swallow — auditing is advisory, not a hard dependency.
  }
}

// Roles the superadmin may assign from the control dashboard.
export const ASSIGNABLE_ROLES: UserRole[] = ["user", "senior", "admin", "superadmin"];

export function isAssignableRole(value: string): value is UserRole {
  return (ASSIGNABLE_ROLES as string[]).includes(value);
}
