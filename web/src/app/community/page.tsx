import { requireVerifiedProfile } from "@/lib/tenant";
import { buildCommunityData } from "./data";
import { CommunityShell } from "./community-shell";

function getFirstName(value: string | null | undefined) {
  if (!value) {
    return "User";
  }

  const firstName = value.trim().split(/\s+/)[0];
  return firstName || "User";
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "U";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const { authUser, profile, supabase } = await requireVerifiedProfile();
  const { data: university } = profile.university_id
    ? await supabase
        .from("universities")
        .select("name")
        .eq("id", profile.university_id)
        .maybeSingle()
    : { data: null };

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "Select Campus";
  
  const communityData = profile.university_id
    ? await buildCommunityData({
        currentUserId: profile.id,
        currentUserRole: profile.role,
        universityId: profile.university_id,
      })
    : { contributors: [], discussions: [], matchCards: [], openReports: 0, weeklyUpdates: [] };

  return (
    <CommunityShell
      avatarUrl={authUser.avatarUrl ?? null}
      contributors={communityData.contributors}
      discussions={communityData.discussions}
      displayName={displayName}
      initials={initials}
      matchCards={communityData.matchCards}
      openReports={communityData.openReports}
      showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
      adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
      showMentorLink={profile.mentor_approved}
      universityName={universityName}
      weeklyUpdates={communityData.weeklyUpdates}
      hasUniversity={Boolean(profile.university_id)}
    />
  );
}
