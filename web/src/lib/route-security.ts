import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { VerifiedTenantProfile } from "@/lib/tenant";
import { checkLocalRateLimit, resolveClientIp } from "@/lib/local-rate-limit";
import { logServerEvent } from "@/lib/server-log";

export type RouteAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type PersistentRateLimitParams = {
  actorColumn: string;
  actorId: string;
  client: Pick<RouteAdminClient, "from">;
  extraEq?: Record<string, string | number | boolean>;
  limit: number;
  nowMs?: number;
  table: string;
  timestampColumn?: string;
  windowMs: number;
};

type EnforceRouteLimitParams = {
  message: string;
  persistent?: PersistentRateLimitParams;
  profile: Pick<VerifiedTenantProfile, "id" | "university_id">;
  request: Request;
  routeKey: string;
  windowMs: number;
  limit: number;
};

async function checkPersistentRateLimit(params: PersistentRateLimitParams) {
  const sinceIso = new Date(
    (params.nowMs ?? Date.now()) - params.windowMs,
  ).toISOString();

  let query = params.client
    .from(params.table)
    .select("*", { count: "exact", head: true })
    .eq(params.actorColumn, params.actorId)
    .gte(params.timestampColumn ?? "created_at", sinceIso);

  for (const [column, value] of Object.entries(params.extraEq ?? {})) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;
  if (error) {
    logServerEvent("warn", "route_security.persistent_rate_limit_failed", {
      actorColumn: params.actorColumn,
      actorId: params.actorId,
      error,
      table: params.table,
    });
    return {
      allowed: true as const,
      retryAfterSeconds: 0,
    };
  }

  if ((count ?? 0) >= params.limit) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil(params.windowMs / 1000)),
    };
  }

  return {
    allowed: true as const,
    retryAfterSeconds: 0,
  };
}

export function buildRateLimitResponse(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export async function enforceRouteRateLimit(params: EnforceRouteLimitParams) {
  const rateKey = [
    params.routeKey,
    params.profile.university_id,
    params.profile.id,
    resolveClientIp(params.request),
  ].join(":");

  const localResult = checkLocalRateLimit({
    key: rateKey,
    limit: params.limit,
    windowMs: params.windowMs,
  });

  if (!localResult.allowed) {
    return buildRateLimitResponse(
      params.message,
      localResult.retryAfterSeconds,
    );
  }

  if (!params.persistent) {
    return null;
  }

  const persistentResult = await checkPersistentRateLimit(params.persistent);
  if (!persistentResult.allowed) {
    return buildRateLimitResponse(
      params.message,
      persistentResult.retryAfterSeconds,
    );
  }

  return null;
}

export function getRouteAdminClient(params: {
  feature: string;
  route: string;
}) {
  try {
    return {
      admin: createSupabaseAdminClient(),
      ok: true as const,
    };
  } catch (error) {
    logServerEvent("error", "route_security.service_role_missing", {
      error,
      feature: params.feature,
      route: params.route,
    });

    return {
      ok: false as const,
      response: NextResponse.json(
        { error: `${params.feature} is not configured yet.` },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      ),
    };
  }
}
