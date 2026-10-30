import { NextResponse } from "next/server";
import { EMAIL_OTP_MAX_ATTEMPTS, normalizeOtpCode, otpMatchesHash } from "@/lib/email-verification";
import { getSessionProfileForApi } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isVerificationSchemaError(code: string) {
  return code === "42P01" || code === "42703" || code === "PGRST205" || code === "PGRST204";
}

export async function POST(request: Request) {
  try {
    const session = await getSessionProfileForApi();
    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const { profile, supabase } = session;

    const json = (await request.json()) as { email?: unknown; code?: unknown };
    const email = typeof json.email === "string" ? json.email.trim().toLowerCase() : "";
    const code = normalizeOtpCode(json.code);

    if (!email || code.length !== 6) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }

    const { data: university, error: universityError } = await supabase
      .from("universities")
      .select("id, domain")
      .eq("id", profile.university_id)
      .single();

    if (universityError || !university) {
      return NextResponse.json({ error: "Could not load selected campus details." }, { status: 500 });
    }

    const domain = university.domain?.toLowerCase().trim();
    if (!domain) {
      return NextResponse.json(
        { error: "No university email domain configured for this campus." },
        { status: 400 },
      );
    }

    if (!email.endsWith(`@${domain}`)) {
      return NextResponse.json(
        { error: `Email must end with @${domain}` },
        { status: 400 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: record, error } = await supabaseAdmin
      .from("verification_codes")
      .select("id, attempt_count, code, expires_at, university_id")
      .eq("user_id", profile.id)
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      const dbCode = typeof error.code === "string" ? error.code : "";
      if (isVerificationSchemaError(dbCode)) {
        return NextResponse.json(
          {
            error:
              "Verification table/schema is not ready. Re-run web/supabase/verification_schema.sql, then retry in 10 seconds.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ error: "Could not validate the verification code." }, { status: 500 });
    }

    if (!record) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (record.university_id !== profile.university_id) {
      await supabaseAdmin.from("verification_codes").delete().eq("id", record.id);
      return NextResponse.json(
        { error: "Verification code is no longer valid for the selected campus. Request a new code." },
        { status: 400 },
      );
    }

    if (new Date(record.expires_at) < new Date()) {
      await supabaseAdmin.from("verification_codes").delete().eq("id", record.id);
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    if (record.attempt_count >= EMAIL_OTP_MAX_ATTEMPTS) {
      await supabaseAdmin.from("verification_codes").delete().eq("id", record.id);
      return NextResponse.json(
        { error: "Too many invalid attempts. Request a new code." },
        { status: 429 },
      );
    }

    if (!otpMatchesHash(record.code, code)) {
      const nextAttemptCount = record.attempt_count + 1;
      if (nextAttemptCount >= EMAIL_OTP_MAX_ATTEMPTS) {
        await supabaseAdmin.from("verification_codes").delete().eq("id", record.id);
        return NextResponse.json(
          { error: "Too many invalid attempts. Request a new code." },
          { status: 429 },
        );
      }

      const { error: attemptUpdateError } = await supabaseAdmin
        .from("verification_codes")
        .update({
          attempt_count: nextAttemptCount,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (attemptUpdateError) {
        const dbCode = typeof attemptUpdateError.code === "string" ? attemptUpdateError.code : "";
        if (isVerificationSchemaError(dbCode)) {
          return NextResponse.json(
            {
              error:
                "Verification table/schema is not ready. Re-run web/supabase/verification_schema.sql, then retry in 10 seconds.",
            },
            { status: 500 },
          );
        }

        return NextResponse.json({ error: "Could not update the verification attempt." }, { status: 500 });
      }

      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        email,
      })
      .eq("id", profile.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    await supabaseAdmin.from("verification_codes").delete().eq("user_id", profile.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
