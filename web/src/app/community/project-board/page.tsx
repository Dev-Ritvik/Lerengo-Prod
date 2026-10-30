import { redirect } from "next/navigation";
import { requireVerifiedProfile } from "@/lib/tenant";
import { buildCommunityData } from "../data";
import { ProjectBoardShell } from "./project-board-shell";

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

export default async function ProjectBoardPage() {
  const { authUser, profile, supabase } = await requireVerifiedProfile();
  if (!profile.university_id) {
    redirect("/community");
  }
  const { data: university } = await supabase
    .from("universities")
    .select("name")
    .eq("id", profile.university_id)
    .maybeSingle();

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "University Name";
  const communityData = await buildCommunityData({
    currentUserId: profile.id,
    currentUserRole: profile.role,
    universityId: profile.university_id,
  });

  return (
    <ProjectBoardShell
      avatarUrl={authUser.avatarUrl ?? null}
      contributors={communityData.contributors}
      displayName={displayName}
      initials={initials}
      matchCards={communityData.matchCards}
      projectDiscussions={communityData.discussions.filter((item) => item.channel === "Projects")}
      showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
      adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
      universityName={universityName}
      weeklyUpdates={communityData.weeklyUpdates}
    />
  );
}
