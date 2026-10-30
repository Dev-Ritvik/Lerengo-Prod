import { requireVerifiedProfile } from "@/lib/tenant";
import { buildMentorshipData, emptyMentorshipData } from "@/lib/mentorship";
import { MentorshipShell } from "./mentorship-shell";

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

export default async function MentorshipPage() {
  const { authUser, profile, supabase } = await requireVerifiedProfile();
  const { data: university } = profile.university_id
    ? await supabase
        .from("universities")
        .select("name")
        .eq("id", profile.university_id)
        .maybeSingle()
    : { data: null };

  const mentorshipData = profile.university_id
    ? await buildMentorshipData(profile.university_id, profile.id).catch(() => emptyMentorshipData)
    : emptyMentorshipData;

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "Select Campus";

  return (
    <MentorshipShell
      avatarUrl={authUser.avatarUrl ?? null}
      displayName={displayName}
      initials={initials}
      doubts={mentorshipData.doubts}
      mentors={mentorshipData.mentors}
      doubtSolvers={mentorshipData.doubtSolvers}
      programOptions={mentorshipData.programOptions}
      incomingRequests={mentorshipData.incomingRequests}
      notifications={mentorshipData.notifications}
      outgoingRequests={mentorshipData.outgoingRequests}
      showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
      adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
      isSuperadmin={profile.role === "superadmin"}
      showMentorLink={profile.mentor_approved}
      subjectOptions={mentorshipData.subjectOptions}
      topPerformers={mentorshipData.topPerformers}
      universityName={universityName}
      hasUniversity={Boolean(profile.university_id)}
    />
  );
}
