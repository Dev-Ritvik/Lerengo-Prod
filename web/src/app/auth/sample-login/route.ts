import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { setFlashMessage } from "@/lib/flash";
import { resolvePostAuthDestination } from "@/lib/tenant";

function resolveSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/campus-network";
  }

  if (nextPath.startsWith("//")) {
    return "/campus-network";
  }

  return nextPath;
}

function isSampleLoginEnabled() {
  return env.ENABLE_SAMPLE_LOGIN;
}

function buildSigninRedirect(url: URL, nextPath: string, error: string) {
  const destination = new URL("/signin", url.origin);
  destination.searchParams.set("next", nextPath);
  let response = NextResponse.redirect(destination);
  response = setFlashMessage(response, "error", error);
  return response;
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  if (error.code === "PGRST205" || error.code === "42P01") {
    return true;
  }

  const message = (error.message ?? "").toLowerCase();
  return message.includes("does not exist") && message.includes("relation");
}

async function ensureSampleAuthUser(params: {
  email: string;
  password: string;
  fullName: string;
}) {
  const admin = createSupabaseAdminClient();
  const listResponse = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listResponse.error) {
    throw listResponse.error;
  }

  const existingUser = listResponse.data.users.find(
    (user: any) => (user.email ?? "").toLowerCase() === params.email.toLowerCase(),
  );

  if (existingUser) {
    const updateResponse = await admin.auth.admin.updateUserById(existingUser.id, {
      email: params.email,
      email_confirm: true,
      password: params.password,
      user_metadata: {
        full_name: params.fullName,
      },
    });

    if (updateResponse.error) {
      throw updateResponse.error;
    }

    return updateResponse.data.user?.id ?? existingUser.id;
  }

  const createResponse = await admin.auth.admin.createUser({
    email: params.email,
    email_confirm: true,
    password: params.password,
    user_metadata: {
      full_name: params.fullName,
    },
  });

  if (createResponse.error) {
    throw createResponse.error;
  }

  if (!createResponse.data.user?.id) {
    throw new Error("Sample user creation returned no user.");
  }

  return createResponse.data.user.id;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requestedNextPath = resolveSafeNextPath(requestUrl.searchParams.get("next"));
  const accountType = requestUrl.searchParams.get("as") === "admin" ? "admin" : "user";
  const nextPath = requestedNextPath;

  if (!isSampleLoginEnabled()) {
    return buildSigninRedirect(requestUrl, nextPath, "sample_login_disabled");
  }

  const email =
    accountType === "admin"
      ? process.env.SAMPLE_ADMIN_EMAIL
      : process.env.SAMPLE_USER_EMAIL;
  const password =
    accountType === "admin"
      ? process.env.SAMPLE_ADMIN_PASSWORD
      : process.env.SAMPLE_USER_PASSWORD;
  const sampleUniversityDomain = (process.env.SAMPLE_UNIVERSITY_DOMAIN ?? "").trim().toLowerCase();

  if (!email || !password || !sampleUniversityDomain) {
    return buildSigninRedirect(requestUrl, nextPath, "sample_login_not_configured");
  }

  try {
    const fullName =
      accountType === "admin"
        ? "Sample Admin"
        : "Sample Student";
    const seededUserId = await ensureSampleAuthUser({
      email,
      password,
      fullName,
    });
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return buildSigninRedirect(requestUrl, nextPath, "sample_login_failed");
    }

    if (!data.user?.id) {
      return buildSigninRedirect(requestUrl, nextPath, "sample_login_failed");
    }

    const admin = createSupabaseAdminClient();
    const sampleUniversityName = (process.env.SAMPLE_UNIVERSITY_NAME ?? "Sample Engineering University").trim();
    const { data: university, error: universityError } = await admin
      .from("universities")
      .upsert(
        {
          domain: sampleUniversityDomain,
          is_active: true,
          name: sampleUniversityName,
        },
        {
          onConflict: "domain",
        },
      )
      .select("id, name")
      .single();

    if (universityError) {
      if (isMissingTableError(universityError)) {
        return buildSigninRedirect(requestUrl, nextPath, "sample_schema_missing");
      }

      return buildSigninRedirect(requestUrl, nextPath, "sample_login_failed");
    }

    if (!university?.id) {
      return buildSigninRedirect(requestUrl, nextPath, "sample_university_missing");
    }

    const { error: profileError } = await admin.from("users").upsert(
      {
        batch: "2028",
        campus_name: university.name ?? sampleUniversityName,
        department: "Computer Science and Engineering",
        email: data.user.email ?? email,
        full_name: fullName,
        id: seededUserId,
        program_domain: "B.Tech",
        reg_id_hash: null,
        reg_id_last4: null,
        role: accountType === "admin" ? "admin" : "user",
        university_id: university.id,
        verified: true,
        verified_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

    if (profileError) {
      if (isMissingTableError(profileError)) {
        return buildSigninRedirect(requestUrl, nextPath, "sample_schema_missing");
      }

      return buildSigninRedirect(requestUrl, nextPath, "sample_login_failed");
    }

    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", seededUserId)
      .maybeSingle();

    const destinationPath = resolvePostAuthDestination(
      profileData as Database["public"]["Tables"]["users"]["Row"] | null,
      nextPath,
    );
    return NextResponse.redirect(new URL(destinationPath, requestUrl.origin));
  } catch {
    return buildSigninRedirect(requestUrl, nextPath, "sample_login_failed");
  }
}
