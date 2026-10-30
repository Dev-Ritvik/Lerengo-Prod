import type { Database } from "@/lib/supabase/types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type JourneyProfile = Pick<
  UserRow,
  "batch" | "campus_name" | "department" | "program_domain" | "university_id" | "verified"
>;

const CAMPUS_REQUIRED_PREFIXES = [
  "/admin",
  "/browse-notes",
  "/campus-network",
  "/community",
  "/mentor-studio",
  "/mentorship",
  "/onboarding",
  "/profile",
  "/verify",
] as const;

const BLOCKED_POST_AUTH_PREFIXES = [
  "/auth/",
  "/onboarding/",
  "/signin",
  "/signup",
  "/verify",
];

export type AuthLane = "campus" | "courses" | "general" | "labs";

export function resolveAuthLane(nextPath: string | null | undefined): AuthLane {
  const safeNextPath = resolveSafeAppPath(nextPath, "/campus-network");

  if (safeNextPath === "/courses" || safeNextPath.startsWith("/courses/")) {
    return "courses";
  }

  if (safeNextPath === "/labs" || safeNextPath.startsWith("/labs/")) {
    return "labs";
  }

  if (
    safeNextPath === "/campus-network" ||
    CAMPUS_REQUIRED_PREFIXES.some((prefix) => safeNextPath.startsWith(prefix))
  ) {
    return "campus";
  }

  return "general";
}

export function requiresCampusJourney(nextPath: string | null | undefined) {
  return resolveAuthLane(nextPath) === "campus";
}

export function hasCompletedCampusProfile(profile: JourneyProfile | null | undefined) {
  return Boolean(
    profile?.campus_name &&
      profile?.batch &&
      profile?.department &&
      profile?.program_domain,
  );
}

export function resolveUserJourneyPath(profile: JourneyProfile | null | undefined) {
  if (!profile?.university_id) {
    return "/onboarding/university";
  }

  if (!hasCompletedCampusProfile(profile)) {
    return "/onboarding/campus-profile";
  }

  if (!profile.verified) {
    return "/verify";
  }

  return "/campus-network";
}

export function resolveSafeAppPath(
  nextPath: string | null | undefined,
  fallback = "/",
) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return fallback;
  }

  if (nextPath.startsWith("//")) {
    return fallback;
  }

  return nextPath;
}

export function resolvePostAuthDestination(
  profile: JourneyProfile | null | undefined,
  nextPath: string | null | undefined,
) {
  const safeNextPath = resolveSafeAppPath(nextPath, "/");

  if (
    safeNextPath === "/" ||
    safeNextPath === "/dashboard" ||
    BLOCKED_POST_AUTH_PREFIXES.some((prefix) => safeNextPath.startsWith(prefix))
  ) {
    return "/";
  }

  return safeNextPath;
}
