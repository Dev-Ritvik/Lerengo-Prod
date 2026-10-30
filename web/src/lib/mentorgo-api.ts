import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isMissingMentorGoBackend, type MentorDirectoryProfile, type MentorProfileRow, type MentorSessionTypeRow } from "@/lib/mentorgo";

export async function getMentorsByCategory(category: string) {
  const supabase = await createServerSupabaseClient();
  
  // Map category to mentor_type
  let types: string[] = [];
  if (category === "expert") {
    types = ["industry_expert", "founder", "operator"];
  } else if (category === "senior") {
    types = ["senior_student"];
  } else if (category === "alumni") {
    types = ["alumni"];
  } else {
    types = [category];
  }

  const profilesResult = await supabase
    .from("mentor_profiles")
    .select("*")
    .eq("verification_status", "approved")
    .eq("is_published", true)
    .in("mentor_type", types)
    .order("updated_at", { ascending: false });

  if (profilesResult.error) {
    if (isMissingMentorGoBackend(profilesResult.error)) {
      return { profiles: [], schemaMissing: true };
    }
    throw new Error(profilesResult.error.message);
  }

  const profiles = (profilesResult.data ?? []) as MentorProfileRow[];
  const profileIds = profiles.map((p) => p.id);

  const sessionTypesResult = profileIds.length > 0
    ? await supabase
        .from("mentor_session_types")
        .select("*")
        .in("mentor_profile_id", profileIds)
        .eq("is_active", true)
        .order("price_amount", { ascending: true })
    : { data: [], error: null };

  if (sessionTypesResult.error) {
    if (isMissingMentorGoBackend(sessionTypesResult.error)) {
      return { profiles: [], schemaMissing: true };
    }
    throw new Error(sessionTypesResult.error.message);
  }

  const sessionsByProfile = new Map<string, MentorSessionTypeRow[]>();
  for (const sessionType of (sessionTypesResult.data ?? []) as MentorSessionTypeRow[]) {
    const bucket = sessionsByProfile.get(sessionType.mentor_profile_id) ?? [];
    bucket.push(sessionType);
    sessionsByProfile.set(sessionType.mentor_profile_id, bucket);
  }

  return {
    profiles: profiles.map((profile) => ({
      ...profile,
      activeSessionTypes: sessionsByProfile.get(profile.id) ?? [],
    })),
    schemaMissing: false,
  };
}

export async function getMentorBySlug(slug: string) {
  const supabase = await createServerSupabaseClient();
  
  const profileResult = await supabase
    .from("mentor_profiles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (profileResult.error) {
    if (isMissingMentorGoBackend(profileResult.error)) {
      return { profile: null, schemaMissing: true };
    }
    return { profile: null, schemaMissing: false };
  }

  const profile = profileResult.data as MentorProfileRow;

  const sessionTypesResult = await supabase
    .from("mentor_session_types")
    .select("*")
    .eq("mentor_profile_id", profile.id)
    .eq("is_active", true)
    .order("price_amount", { ascending: true });

  const activeSessionTypes = (sessionTypesResult.data ?? []) as MentorSessionTypeRow[];

  return {
    profile: { ...profile, activeSessionTypes } as MentorDirectoryProfile,
    schemaMissing: false,
  };
}
