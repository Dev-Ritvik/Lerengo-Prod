import { redirect } from "next/navigation";
import { resolveCampusNetworkAppUrl } from "@/lib/app-url";
import type { Database } from "@/lib/supabase/types";
import { getSessionUser, requireUniversityProfile, requireVerifiedProfile } from "@/lib/tenant";

export type AppUser = Database["public"]["Tables"]["users"]["Row"];
export type UniversityScopedUser = AppUser & { university_id: string; verified: true };

type ProvisionedAdminCandidate = Pick<AppUser, "admin_user_id" | "role">;

export function isProvisionedAdminUser(candidate: ProvisionedAdminCandidate | null | undefined) {
  // Platform superadmins have full access, including the campus admin lane.
  if (candidate?.role === "superadmin") {
    return true;
  }

  if (!candidate || candidate.role !== "admin") {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return Boolean(candidate.admin_user_id?.trim());
}

export async function requireSessionUser() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/");
  }

  return {
    authUser: session.authUser,
    supabase: session.supabase,
  };
}

export async function getAppUser() {
  const { supabase, authUser } = await requireSessionUser();
  const { data: appUserData, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  const appUser = appUserData as AppUser | null;

  if (error) {
    throw new Error(error.message);
  }

  return { supabase, authUser, appUser };
}

export async function requireUniversityScopedUser() {
  const context = await requireVerifiedProfile();
  return {
    authUser: context.authUser,
    supabase: context.supabase,
    appUser: context.profile as UniversityScopedUser,
  } as {
    supabase: typeof context.supabase;
    authUser: typeof context.authUser;
    appUser: UniversityScopedUser;
  };
}

export async function requireUniversityAffiliatedUser() {
  const context = await requireUniversityProfile();
  return {
    authUser: context.authUser,
    supabase: context.supabase,
    appUser: context.profile as AppUser & { university_id: string },
  } as {
    supabase: typeof context.supabase;
    authUser: typeof context.authUser;
    appUser: AppUser & { university_id: string };
  };
}

export async function requireAdminUser() {
  const context = await requireUniversityScopedUser();
  if (!isProvisionedAdminUser(context.appUser)) {
    redirect(`${resolveCampusNetworkAppUrl()}/campus-network`);
  }

  return context;
}
