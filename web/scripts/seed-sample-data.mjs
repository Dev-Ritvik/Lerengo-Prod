import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

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

function getOptionalEnv(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  return value;
}

const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const notesBucket = getOptionalEnv("SUPABASE_NOTES_BUCKET", "notes-private");
const sampleUniversityName = getOptionalEnv(
  "SAMPLE_UNIVERSITY_NAME",
  "Sample Engineering University",
);
const sampleUniversityDomain = getOptionalEnv(
  "SAMPLE_UNIVERSITY_DOMAIN",
  "sample.edu",
);

const sampleUserEmail = getRequiredEnv("SAMPLE_USER_EMAIL");
const sampleUserPassword = getRequiredEnv("SAMPLE_USER_PASSWORD");
const sampleAdminEmail = getRequiredEnv("SAMPLE_ADMIN_EMAIL");
const sampleAdminPassword = getRequiredEnv("SAMPLE_ADMIN_PASSWORD");

const samplePdfBytes = Buffer.from(
  "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZSAvUGFnZXMvS2lkc1sgMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlIC9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMjAwIDIwMF0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCA0ND4+CnN0cmVhbQpCVCAvRjEgMTggVGYgNDAgMTAwIFRkIChMZXJlbkdPIFNhbXBsZSkgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUgL0ZvbnQvU3VidHlwZSAvVHlwZTEvQmFzZUZvbnQgL0hlbHZldGljYT4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTE3IDAwMDAwIG4gCjAwMDAwMDAyNDMgMDAwMDAgbiAKMDAwMDAwMDMzNiAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQwNQolJUVPRgo=",
  "base64",
);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureBucket(bucketName) {
  const { data, error } = await supabase.storage.getBucket(bucketName);
  if (!error && data) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(
    bucketName,
    { public: false },
  );

  if (createError && !/already exists/i.test(createError.message)) {
    throw createError;
  }
}

async function findAuthUserByEmail(email) {
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const matchedUser = users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function ensureAuthUser({ email, fullName, password }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (!error && data.user) {
    return data.user;
  }

  if (!error || !/already|registered|exists/i.test(error.message)) {
    throw error ?? new Error("Failed to create auth user.");
  }

  const existingUser = await findAuthUserByEmail(email);
  if (!existingUser) {
    throw new Error(`Existing auth user not found for ${email}`);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existingUser.id,
    {
      email_confirm: true,
      password,
      user_metadata: {
        full_name: fullName,
      },
    },
  );

  if (updateError) {
    throw updateError;
  }

  return existingUser;
}

async function ensureUniversity() {
  const { data, error } = await supabase
    .from("universities")
    .upsert(
      {
        domain: sampleUniversityDomain,
        is_active: true,
        keywords: [sampleUniversityName, "campus", "engineering"],
        min_score: 80,
        name: sampleUniversityName,
        name_variants: [sampleUniversityName],
        reg_id_regex: ["^[A-Z]{2}[0-9]{6}$"],
      },
      {
        onConflict: "domain",
      },
    )
    .select("id, name, domain")
    .single();

  if (error || !data) {
    throw error ?? new Error("Could not create sample university.");
  }

  return data;
}

async function ensureAppUser({
  authId,
  email,
  fullName,
  isVerified,
  role,
  universityId,
}) {
  const { error } = await supabase.from("users").upsert(
    {
      email,
      full_name: fullName,
      id: authId,
      reg_id_hash: isVerified ? "sample-seed" : null,
      reg_id_last4: isVerified ? "0001" : null,
      role,
      university_id: universityId,
      verified: isVerified,
      verified_at: isVerified ? new Date().toISOString() : null,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw error;
  }
}

async function ensureNote({
  title,
  description,
  filePath,
  priceInr,
  universityId,
  uploadedBy,
}) {
  const { data: existingNote, error: selectError } = await supabase
    .from("notes")
    .select("id")
    .eq("university_id", universityId)
    .eq("title", title)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  const { error: uploadError } = await supabase.storage
    .from(notesBucket)
    .upload(filePath, samplePdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  if (existingNote?.id) {
    const { error: updateError } = await supabase
      .from("notes")
      .update({
        description,
        file_path: filePath,
        is_verified: true,
        price_inr: priceInr,
        uploaded_by: uploadedBy,
      })
      .eq("id", existingNote.id);

    if (updateError) {
      throw updateError;
    }

    return existingNote.id;
  }

  const { data: insertedNote, error: insertError } = await supabase
    .from("notes")
    .insert({
      description,
      file_path: filePath,
      is_verified: true,
      price_inr: priceInr,
      title,
      university_id: universityId,
      uploaded_by: uploadedBy,
    })
    .select("id")
    .single();

  if (insertError || !insertedNote) {
    throw insertError ?? new Error(`Failed to insert note: ${title}`);
  }

  return insertedNote.id;
}

async function ensureNoteAccess({ noteId, userId }) {
  const { error } = await supabase.from("note_access").upsert(
    {
      note_id: noteId,
      payment_id: null,
      user_id: userId,
    },
    {
      onConflict: "user_id,note_id",
    },
  );

  if (error) {
    throw error;
  }
}

async function main() {
  await ensureBucket(notesBucket);

  const university = await ensureUniversity();

  const sampleUserAuth = await ensureAuthUser({
    email: sampleUserEmail,
    fullName: "Sample Student",
    password: sampleUserPassword,
  });
  const sampleAdminAuth = await ensureAuthUser({
    email: sampleAdminEmail,
    fullName: "Sample Admin",
    password: sampleAdminPassword,
  });

  await ensureAppUser({
    authId: sampleUserAuth.id,
    email: sampleUserEmail,
    fullName: "Sample Student",
    isVerified: false,
    role: "user",
    universityId: university.id,
  });
  await ensureAppUser({
    authId: sampleAdminAuth.id,
    email: sampleAdminEmail,
    fullName: "Sample Admin",
    isVerified: true,
    role: "admin",
    universityId: university.id,
  });

  const freeNoteId = await ensureNote({
    description: "Free sample note for dashboard and download flow testing.",
    filePath: `${university.id}/seed/sample-free-note.pdf`,
    priceInr: 0,
    title: "Sample Free Note",
    universityId: university.id,
    uploadedBy: sampleAdminAuth.id,
  });
  const paidNoteId = await ensureNote({
    description: "Paid sample note for unlock and note_access flow testing.",
    filePath: `${university.id}/seed/sample-paid-note.pdf`,
    priceInr: 99,
    title: "Sample Paid Note",
    universityId: university.id,
    uploadedBy: sampleAdminAuth.id,
  });

  await ensureNoteAccess({
    noteId: paidNoteId,
    userId: sampleUserAuth.id,
  });

  console.log("Sample seed complete.");
  console.log(`University: ${university.name} (${university.domain})`);
  console.log(`Sample user: ${sampleUserEmail} / ${sampleUserPassword}`);
  console.log(`Sample admin: ${sampleAdminEmail} / ${sampleAdminPassword}`);
  console.log("Paid note access granted to sample user.");
  console.log(`Free note id: ${freeNoteId}`);
  console.log(`Paid note id: ${paidNoteId}`);
}

main().catch((error) => {
  console.error("Sample seed failed.");
  console.error(error);
  process.exit(1);
});
