import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Database,
  HunterOpportunityStatus,
  HunterVerificationStatus,
} from "@/lib/supabase/types";

export const HUNTERGO_SCHEMA_HINT =
  "Apply web/supabase/huntergo_schema.sql before using HunterGO talent, recruiter, opportunity, and admin workflows.";

export const HUNTER_VERIFICATION_STATUSES: HunterVerificationStatus[] = [
  "pending",
  "verified",
  "rejected",
  "suspended",
];

export const HUNTER_OPPORTUNITY_STATUSES: HunterOpportunityStatus[] = [
  "draft",
  "pending_review",
  "published",
  "paused",
  "closed",
  "archived",
];

export type HunterTalentProfileRow = Database["public"]["Tables"]["hunter_talent_profiles"]["Row"];
export type HunterCompanyRow = Database["public"]["Tables"]["hunter_companies"]["Row"];
export type HunterRecruiterProfileRow = Database["public"]["Tables"]["hunter_recruiter_profiles"]["Row"];
export type HunterOpportunityRow = Database["public"]["Tables"]["hunter_opportunities"]["Row"];
export type HunterInviteRow = Database["public"]["Tables"]["hunter_invites"]["Row"];

export type HunterOpportunityPreview = HunterOpportunityRow & {
  company: HunterCompanyRow | null;
};

export function isMissingHunterGoBackend(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "";
  const normalized = message.toLowerCase();

  return normalized.includes("hunter_") && (
    normalized.includes("schema cache") ||
    normalized.includes("not found") ||
    normalized.includes("relation") ||
    normalized.includes("does not exist")
  );
}

export function formatHunterGoValue(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function isHunterVerificationStatus(value: string): value is HunterVerificationStatus {
  return HUNTER_VERIFICATION_STATUSES.includes(value as HunterVerificationStatus);
}

export function isHunterOpportunityStatus(value: string): value is HunterOpportunityStatus {
  return HUNTER_OPPORTUNITY_STATUSES.includes(value as HunterOpportunityStatus);
}

export async function getHunterGoPublicData() {
  const supabase = await createServerSupabaseClient();

  const opportunitiesResult = await supabase
    .from("hunter_opportunities")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(8);

  if (opportunitiesResult.error) {
    console.warn("HunterGO data fetch failed:", opportunitiesResult.error.message);
    return {
      opportunities: [] as HunterOpportunityPreview[],
      schemaMissing: true,
    };
  }

  const opportunities = (opportunitiesResult.data ?? []) as HunterOpportunityRow[];
  const companyIds = [...new Set(opportunities.map((opportunity) => opportunity.company_id).filter(Boolean))] as string[];

  const companiesResult =
    companyIds.length > 0
      ? await supabase.from("hunter_companies").select("*").in("id", companyIds)
      : { data: [] as HunterCompanyRow[], error: null };

  if (companiesResult.error) {
    console.warn("HunterGO companies fetch failed:", companiesResult.error.message);
    return {
      opportunities: [] as HunterOpportunityPreview[],
      schemaMissing: true,
    };
  }

  const companiesById = new Map(
    ((companiesResult.data ?? []) as HunterCompanyRow[]).map((company) => [company.id, company]),
  );

  return {
    opportunities: opportunities.map((opportunity) => ({
      ...opportunity,
      company: opportunity.company_id ? companiesById.get(opportunity.company_id) ?? null : null,
    })),
    schemaMissing: false,
  };
}
