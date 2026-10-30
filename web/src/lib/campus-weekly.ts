import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CampusWeeklyCategory,
  CampusWeeklyItemType,
  CampusWeeklyTargetType,
  Database,
} from "@/lib/supabase/types";

export type CampusWeeklyItemRow = Database["public"]["Tables"]["campus_weekly_items"]["Row"];

export const CAMPUS_WEEKLY_ITEM_TYPES: CampusWeeklyItemType[] = ["banner", "announcement"];
export const CAMPUS_WEEKLY_TARGET_TYPES: CampusWeeklyTargetType[] = ["external", "community_post"];
export const CAMPUS_WEEKLY_CATEGORIES: CampusWeeklyCategory[] = [
  "hackathon",
  "event",
  "workshop",
  "opportunity",
  "announcement",
  "bulletin",
];

export const CAMPUS_WEEKLY_SCHEMA_HINT =
  "Apply web/supabase/campus_weekly_schema.sql to enable real This Week on Campus banners and announcement threads.";

export function isMissingCampusWeeklyBackend(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalizedMessage = message.toLowerCase();

  return normalizedMessage.includes("campus_weekly_items") && (
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("schema cache") ||
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("not found")
  );
}

export function filterActiveCampusWeeklyItems(
  rows: CampusWeeklyItemRow[],
  now = new Date(),
) {
  const nowTimestamp = now.getTime();

  return rows.filter((row) => {
    if (!row.is_active) {
      return false;
    }

    const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
    const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;

    if (startsAt !== null && !Number.isNaN(startsAt) && startsAt > nowTimestamp) {
      return false;
    }

    if (endsAt !== null && !Number.isNaN(endsAt) && endsAt < nowTimestamp) {
      return false;
    }

    return true;
  });
}

export async function listCampusWeeklyItemsForUniversity(universityId: string) {
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return {
      items: [] as CampusWeeklyItemRow[],
      missingBackend: true,
      usesFallback: true,
    };
  }

  const { data, error } = await admin
    .from("campus_weekly_items")
    .select("*")
    .eq("university_id", universityId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingCampusWeeklyBackend(error)) {
      return {
        items: [] as CampusWeeklyItemRow[],
        missingBackend: true,
        usesFallback: true,
      };
    }

    throw new Error(error.message);
  }

  return {
    items: (data ?? []) as CampusWeeklyItemRow[],
    missingBackend: false,
    usesFallback: false,
  };
}

export function formatCampusWeeklyCategoryLabel(category: CampusWeeklyCategory) {
  switch (category) {
    case "hackathon":
      return "Hackathon";
    case "event":
      return "Event";
    case "workshop":
      return "Workshop";
    case "opportunity":
      return "Opportunity";
    case "announcement":
      return "Announcement";
    case "bulletin":
      return "Bulletin";
    default:
      return "Campus";
  }
}
