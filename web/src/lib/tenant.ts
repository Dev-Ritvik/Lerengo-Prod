import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export {
  hasCompletedCampusProfile,
  resolvePostAuthDestination,
  resolveSafeAppPath,
  resolveUserJourneyPath,
} from "@/lib/auth-journey";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UniversityRow = Database["public"]["Tables"]["universities"]["Row"];

export type SessionContext = {
  authUser: { id: string; email?: string | null; avatarUrl?: string | null };
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
};

export type TenantProfile = UserRow;
export type TenantProfileWithUniversity = UserRow & { university_id: string };
export type VerifiedTenantProfile = TenantProfileWithUniversity & { verified: true };

function normalizeAvatarCandidate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function getAuthAvatarUrl(userMetadata: unknown, identities?: unknown): string | null {
  if (userMetadata && typeof userMetadata === "object") {
    const metadata = userMetadata as Record<string, unknown>;
    const directAvatar =
      normalizeAvatarCandidate(metadata.avatar_url) ??
      normalizeAvatarCandidate(metadata.picture);

    if (directAvatar) {
      return directAvatar;
    }
  }

  if (!Array.isArray(identities)) {
    return null;
  }

  for (const identity of identities) {
    if (!identity || typeof identity !== "object") {
      continue;
    }

    const identityData = (identity as { identity_data?: unknown }).identity_data;
    if (!identityData || typeof identityData !== "object") {
      continue;
    }

    const normalizedIdentityAvatar =
      normalizeAvatarCandidate((identityData as Record<string, unknown>).avatar_url) ??
      normalizeAvatarCandidate((identityData as Record<string, unknown>).picture);

    if (normalizedIdentityAvatar) {
      return normalizedIdentityAvatar;
    }
  }

  return null;
}

export async function getAuthAvatarUrlWithFallback(params: {
  userId: string;
  userMetadata: unknown;
  identities?: unknown;
}): Promise<string | null> {
  const directAvatarUrl = getAuthAvatarUrl(params.userMetadata, params.identities);
  if (directAvatarUrl) {
    return directAvatarUrl;
  }

  try {
    const admin = createSupabaseAdminClient();
    const response = await admin.auth.admin.getUserById(params.userId);
    if (response.error || !response.data.user) {
      return null;
    }

    return getAuthAvatarUrl(
      response.data.user.user_metadata,
      response.data.user.identities,
    );
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionContext | null> {
  const supabase = await createServerSupabaseClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] | null = null;
  let error: Awaited<ReturnType<typeof supabase.auth.getUser>>["error"] | null = null;

  try {
    const response = await supabase.auth.getUser();
    user = response.data.user;
    error = response.error;
  } catch {
    return null;
  }

  if (error || !user) {
    return null;
  }

  const avatarUrl = await getAuthAvatarUrlWithFallback({
    userId: user.id,
    userMetadata: user.user_metadata,
    identities: user.identities,
  });

  return {
    authUser: {
      avatarUrl,
      id: user.id,
      email: user.email,
    },
    supabase,
  };
}

async function getUserProfile(session: SessionContext) {
  const { data, error } = await session.supabase
    .from("users")
    .select("*")
    .eq("id", session.authUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserRow | null;
}

export async function requireVerifiedProfile(): Promise<{
  authUser: SessionContext["authUser"];
  supabase: SessionContext["supabase"];
  profile: VerifiedTenantProfile;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const mockClient = await createServerSupabaseClient();
    return {
      authUser: {
        id: "mock-user-id",
        email: "demo@lerengo.dev",
        avatarUrl: null,
      },
      supabase: mockClient,
      profile: {
        id: "mock-user-id",
        email: "demo@lerengo.dev",
        full_name: "Siddharth S.",
        university_id: "mock-univ-id",
        campus_name: "Lovely Professional University",
        program_domain: "Computer Science",
        verified: true,
        role: "student",
        mentor_approved: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
    };
  }

  const session = await getSessionUser();
  if (!session) {
    redirect("/signin?next=/campus-network");
  }

  const profile = await getUserProfile(session);
  if (profile?.is_banned) {
    await session.supabase.auth.signOut();
    redirect("/banned");
  }

  return {
    ...session,
    profile: profile as VerifiedTenantProfile,
  };
}

export async function requireUniversityProfile(): Promise<{
  authUser: SessionContext["authUser"];
  supabase: SessionContext["supabase"];
  profile: TenantProfileWithUniversity;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const mockClient = await createServerSupabaseClient();
    return {
      authUser: {
        id: "mock-user-id",
        email: "demo@lerengo.dev",
        avatarUrl: null,
      },
      supabase: mockClient,
      profile: {
        id: "mock-user-id",
        email: "demo@lerengo.dev",
        full_name: "Siddharth S.",
        university_id: "mock-univ-id",
        campus_name: "Lovely Professional University",
        program_domain: "Computer Science",
        verified: true,
        role: "student",
        mentor_approved: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
    };
  }

  const session = await getSessionUser();
  if (!session) {
    redirect("/signin?next=/campus-network");
  }

  const profile = await getUserProfile(session);
  if (profile?.is_banned) {
    await session.supabase.auth.signOut();
    redirect("/banned");
  }
  if (!profile?.university_id) {
    redirect("/onboarding/university?next=/labs/submit");
  }

  return {
    ...session,
    profile: profile as TenantProfileWithUniversity,
  };
}

export async function getTenantUniversityId(): Promise<string | null> {
  const { profile } = await requireVerifiedProfile();
  return profile.university_id;
}

export async function getUniversityById(
  universityId: string,
): Promise<UniversityRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .eq("id", universityId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as UniversityRow | null;
}

export type ApiTenantGuardResult =
  | { ok: false; status: number; error: string }
  | {
    ok: true;
    authUser: SessionContext["authUser"];
    supabase: SessionContext["supabase"];
    profile: VerifiedTenantProfile;
  };

export async function requireVerifiedProfileForApi(): Promise<ApiTenantGuardResult> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const profile = await getUserProfile(session);
  if (profile?.is_banned) {
    return { ok: false, status: 403, error: "Account suspended." };
  }
  if (!profile?.university_id) {
    return { ok: false, status: 403, error: "University not selected." };
  }

  return {
    ok: true,
    ...session,
    profile: profile as VerifiedTenantProfile,
  };
}

export async function getSessionProfileForApi(): Promise<
  | { ok: false; status: number; error: string }
  | {
    ok: true;
    authUser: SessionContext["authUser"];
    supabase: SessionContext["supabase"];
    profile: TenantProfileWithUniversity;
  }
> {
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  const profile = await getUserProfile(session);
  if (profile?.is_banned) {
    return { ok: false, status: 403, error: "Account suspended." };
  }
  if (!profile?.university_id) {
    return { ok: false, status: 403, error: "University not selected." };
  }

  return {
    ok: true,
    ...session,
    profile: profile as TenantProfileWithUniversity,
  };
}
