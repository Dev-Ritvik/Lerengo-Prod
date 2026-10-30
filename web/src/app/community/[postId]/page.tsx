import { notFound, redirect } from "next/navigation";
import { requireVerifiedProfile } from "@/lib/tenant";
import { buildCommunityPostDetail } from "../data";
import { CommunityPostDetailShell } from "./post-detail-shell";

function getFirstName(value: string | null | undefined) {
  if (!value) {
    return "User";
  }
  return value.trim().split(/\s+/)[0] || "User";
}

function getInitials(value: string | null | undefined) {
  if (!value) {
    return "U";
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  return parts.length === 1
    ? parts[0].slice(0, 1).toUpperCase()
    : `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export const dynamic = "force-dynamic";

export default async function CommunityPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const [{ postId }, { authUser, profile, supabase }] = await Promise.all([params, requireVerifiedProfile()]);

  if (!profile.university_id) {
    redirect("/community");
  }

  const detail = await buildCommunityPostDetail({
    currentUserId: profile.id,
    currentUserRole: profile.role,
    postId,
    universityId: profile.university_id,
  });

  if (!detail) {
    notFound();
  }

  const { data: university } = await supabase.from("universities").select("name").eq("id", profile.university_id).maybeSingle();

  const userName = profile.full_name ?? profile.email;
  const displayName = getFirstName(userName);
  const initials = getInitials(userName);
  const universityName = university?.name ?? profile.campus_name ?? "University Name";

  return (
    <CommunityPostDetailShell
      avatarUrl={authUser.avatarUrl ?? null}
      comments={detail.comments}
      displayName={displayName}
      initials={initials}
      post={detail.post}
      relatedPartnerRequests={detail.relatedPartnerRequests}
      showAdminLink={profile.role === "admin" || profile.role === "superadmin"}
      adminUrl={profile.role === "superadmin" ? "/admin/control" : "/admin"}
      isSuperadmin={profile.role === "superadmin"}
      universityName={universityName}
    />
  );
}
