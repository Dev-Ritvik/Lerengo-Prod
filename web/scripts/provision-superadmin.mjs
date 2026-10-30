// Provision (or re-provision) the LerenGO platform superadmin.
//
// This is the "give me admin rights in Supabase" step. It is idempotent and safe to
// re-run. Nothing about the credential lives in application code — the password is stored
// (hashed) in Supabase Auth, and the role lives in the public.users row.
//
// It will:
//   1. Create the Supabase Auth user (email confirmed) with the given password, or, if the
//      user already exists, reset their password and confirm the email.
//   2. Upsert the matching public.users row as role='superadmin', verified=true.
//
// Run the SQL migration first so the 'superadmin' role and ban columns exist:
//   psql "$DATABASE_URL" -f supabase/superadmin_schema.sql
//   (or paste supabase/superadmin_schema.sql into the Supabase SQL editor)
//
// Then:
//   npm run provision:superadmin
//   # or override the defaults:
//   SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='secret' npm run provision:superadmin
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env / .env.local).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const projectRoot = path.resolve(currentDir, "..");

function loadEnvFile(filePath, { overrideExisting = false } = {}) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || (!overrideExisting && process.env[key] !== undefined)) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"), { overrideExisting: true });

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Defaults match the requested credential. Override with env vars if you prefer.
const EMAIL = (process.env.SUPERADMIN_EMAIL ?? "anand01ts@gmail.com").trim().toLowerCase();
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "Anand.1105";
const FULL_NAME = process.env.SUPERADMIN_FULL_NAME ?? "Anand";
const ADMIN_USER_ID = (process.env.SUPERADMIN_ADMIN_USER_ID ?? "anand-superadmin").trim().toLowerCase();

async function findAuthUserByEmail(admin, email) {
  // Paginate through the auth user list until we find a matching email.
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => (user.email ?? "").toLowerCase() === email,
    );
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }
  }

  return null;
}

async function main() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Provisioning superadmin: ${EMAIL}`);

  // 1. Ensure the auth user exists with the requested password + confirmed email.
  let authUserId = null;

  const createResult = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME },
  });

  if (createResult.error) {
    const message = createResult.error.message.toLowerCase();
    const alreadyExists =
      message.includes("already been registered") ||
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("duplicate");

    if (!alreadyExists) {
      throw new Error(`Failed to create auth user: ${createResult.error.message}`);
    }

    console.log("Auth user already exists — resetting password and confirming email.");
    const existing = await findAuthUserByEmail(admin, EMAIL);
    if (!existing) {
      throw new Error(
        "Auth user reported as existing but could not be found via listUsers.",
      );
    }

    authUserId = existing.id;
    const updateResult = await admin.auth.admin.updateUserById(authUserId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata ?? {}), full_name: FULL_NAME },
    });
    if (updateResult.error) {
      throw new Error(`Failed to update auth user: ${updateResult.error.message}`);
    }
  } else {
    authUserId = createResult.data.user?.id ?? null;
    console.log("Auth user created.");
  }

  if (!authUserId) {
    throw new Error("Could not resolve the auth user id.");
  }

  // 2. Best-effort: attach a default campus so the campus-scoped admin modules
  //    (notes, verification, community, ...) also open for this account. The global
  //    control dashboard does not depend on this.
  let defaultUniversityId = null;
  const { data: universityRow } = await admin
    .from("universities")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  defaultUniversityId = universityRow?.id ?? null;

  // 3. Upsert the public.users row as a verified superadmin.
  const nowIso = new Date().toISOString();
  const upsertRow = {
    id: authUserId,
    email: EMAIL,
    full_name: FULL_NAME,
    role: "superadmin",
    verified: true,
    verified_at: nowIso,
    admin_user_id: ADMIN_USER_ID,
    is_banned: false,
    banned_at: null,
    banned_by: null,
    banned_reason: null,
    updated_at: nowIso,
  };
  if (defaultUniversityId) {
    upsertRow.university_id = defaultUniversityId;
  }

  const { error: upsertError } = await admin
    .from("users")
    .upsert(upsertRow, { onConflict: "id" });

  if (upsertError) {
    throw new Error(`Failed to upsert public.users row: ${upsertError.message}`);
  }

  console.log("");
  console.log("Superadmin provisioned successfully.");
  console.log(`  auth user id : ${authUserId}`);
  console.log(`  email        : ${EMAIL}`);
  console.log(`  role         : superadmin (verified)`);
  console.log("");
  console.log("Sign in at /admin/control/login with the email + password above.");
}

main().catch((error) => {
  console.error("");
  console.error("Provisioning failed:", error.message);
  console.error("");
  console.error("Checklist:");
  console.error("  - Did you apply supabase/superadmin_schema.sql first? (needs the superadmin role + ban columns)");
  console.error("  - Are NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in .env.local?");
  process.exit(1);
});
