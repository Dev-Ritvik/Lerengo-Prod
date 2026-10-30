import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Database,
  MentorBookingStatus,
  MentorPaymentStatus,
  MentorVerificationStatus,
} from "@/lib/supabase/types";

export const MENTORGO_SCHEMA_HINT =
  "Apply web/supabase/mentorgo_schema.sql before using MentorGO directory, booking, and admin review workflows.";

export const MENTOR_VERIFICATION_STATUSES: MentorVerificationStatus[] = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "suspended",
];

export const MENTOR_BOOKING_STATUSES: MentorBookingStatus[] = [
  "draft",
  "pending_payment",
  "payment_failed",
  "pending_mentor_approval",
  "confirmed",
  "reschedule_requested",
  "cancelled_by_student",
  "cancelled_by_mentor",
  "completed",
  "no_show",
  "refunded",
  "disputed",
];

export const MENTOR_PAYMENT_STATUSES: MentorPaymentStatus[] = [
  "not_required",
  "pending",
  "paid",
  "failed",
  "refunded",
  "partial_refund",
];

export type MentorProfileRow = Database["public"]["Tables"]["mentor_profiles"]["Row"];
export type MentorSessionTypeRow = Database["public"]["Tables"]["mentor_session_types"]["Row"];
export type MentorBookingRow = Database["public"]["Tables"]["mentor_bookings"]["Row"];

export type MentorDirectoryProfile = MentorProfileRow & {
  activeSessionTypes: MentorSessionTypeRow[];
};

export function isMissingMentorGoBackend(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "";
  const normalized = message.toLowerCase();

  return normalized.includes("mentor_") && (
    normalized.includes("schema cache") ||
    normalized.includes("not found") ||
    normalized.includes("relation") ||
    normalized.includes("does not exist")
  );
}

export function formatMentorGoValue(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatMentorPrice(amount: number | null, currency = "INR") {
  if (amount === null) {
    return "Price not set";
  }

  if (amount === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-IN", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export function isMentorVerificationStatus(value: string): value is MentorVerificationStatus {
  return MENTOR_VERIFICATION_STATUSES.includes(value as MentorVerificationStatus);
}

export function isMentorBookingStatus(value: string): value is MentorBookingStatus {
  return MENTOR_BOOKING_STATUSES.includes(value as MentorBookingStatus);
}

export function isMentorPaymentStatus(value: string): value is MentorPaymentStatus {
  return MENTOR_PAYMENT_STATUSES.includes(value as MentorPaymentStatus);
}

export async function getMentorGoDirectoryData() {
  const supabase = await createServerSupabaseClient();

  const profilesResult = await supabase
    .from("mentor_profiles")
    .select("*")
    .eq("verification_status", "approved")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (profilesResult.error) {
    if (isMissingMentorGoBackend(profilesResult.error)) {
      return {
        profiles: [] as MentorDirectoryProfile[],
        schemaMissing: true,
      };
    }

    throw new Error(profilesResult.error.message);
  }

  const profiles = (profilesResult.data ?? []) as MentorProfileRow[];
  const profileIds = profiles.map((profile) => profile.id);

  const sessionTypesResult =
    profileIds.length > 0
      ? await supabase
          .from("mentor_session_types")
          .select("*")
          .in("mentor_profile_id", profileIds)
          .eq("is_active", true)
          .order("price_amount", { ascending: true })
      : { data: [] as MentorSessionTypeRow[], error: null };

  if (sessionTypesResult.error) {
    if (isMissingMentorGoBackend(sessionTypesResult.error)) {
      return {
        profiles: [] as MentorDirectoryProfile[],
        schemaMissing: true,
      };
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

export interface PopularMentor {
  name: string;
  type: string;
  typeKey: string;
  headline: string;
  rating: string;
  sessions: string;
  tags: string[];
  accentColor: string;
  avatarChar: string;
  imageUrl?: string;
}

export const popularMentors: PopularMentor[] = [
  {
    name: "Rahul Verma",
    type: "Expert Mentor",
    typeKey: "expert",
    headline: "AI/ML Engineer at Google",
    rating: "4.9",
    sessions: "120 sessions",
    tags: ["AI/ML", "Python", "TensorFlow"],
    accentColor: "#96a1ab",
    avatarChar: "R",
    imageUrl: "/images/profile_rahul_verma.png",
  },
  {
    name: "Priya Sharma",
    type: "Senior Mentor",
    typeKey: "senior",
    headline: "SDE at Microsoft",
    rating: "4.8",
    sessions: "95 sessions",
    tags: ["DSA", "System Design", "Java"],
    accentColor: "#D97706",
    avatarChar: "P",
    imageUrl: "/images/profile_priya_sharma.png",
  },
  {
    name: "Aman Singh",
    type: "Alumni Mentor",
    typeKey: "alumni",
    headline: "Product Manager at Airbnb",
    rating: "4.9",
    sessions: "80 sessions",
    tags: ["Product", "Strategy", "Career"],
    accentColor: "#10B981",
    avatarChar: "A",
    imageUrl: "/images/profile_aman_singh.png",
  },
  {
    name: "Neha Kapoor",
    type: "Expert Mentor",
    typeKey: "expert",
    headline: "Data Scientist at Netflix",
    rating: "4.8",
    sessions: "110 sessions",
    tags: ["Data Science", "SQL", "Python"],
    accentColor: "#96a1ab",
    avatarChar: "N",
    imageUrl: "/images/profile_neha_kapoor.png",
  },
  {
    name: "Vikram Malhotra",
    type: "Senior Mentor",
    typeKey: "senior",
    headline: "Founder at MalCorp",
    rating: "4.7",
    sessions: "60 sessions",
    tags: ["SaaS", "Fundraising", "GTM"],
    accentColor: "#D97706",
    avatarChar: "V",
    imageUrl: "/images/profile_vikram_malhotra.png",
  },
  {
    name: "Shalini Iyer",
    type: "Alumni Mentor",
    typeKey: "alumni",
    headline: "UI/UX Designer at Meta",
    rating: "4.9",
    sessions: "75 sessions",
    tags: ["Product Design", "Figma", "User Research"],
    accentColor: "#10B981",
    avatarChar: "S",
    imageUrl: "/images/profile_shalini_iyer.png",
  },
  {
    name: "Rohan Das",
    type: "Expert Mentor",
    typeKey: "expert",
    headline: "Principal Architect at Amazon",
    rating: "4.8",
    sessions: "140 sessions",
    tags: ["Cloud", "Architecture", "Java"],
    accentColor: "#96a1ab",
    avatarChar: "R",
    imageUrl: "/images/profile_rohan_das.png",
  },
  {
    name: "Aditi Sen",
    type: "Senior Mentor",
    typeKey: "senior",
    headline: "Data Analyst at Spotify",
    rating: "4.6",
    sessions: "50 sessions",
    tags: ["SQL", "Tableau", "Metrics"],
    accentColor: "#D97706",
    avatarChar: "A",
    imageUrl: "/images/profile_aditi_sen.png",
  },
];
