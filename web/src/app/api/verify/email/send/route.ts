import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { resolveAppUrl } from "@/lib/app-url";
import {
  createOtpCode,
  EMAIL_OTP_EXPIRY_MINUTES,
  EMAIL_OTP_MAX_SENDS_PER_HOUR,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  hashOtpCode,
} from "@/lib/email-verification";
import { getRequiredEnv } from "@/lib/env";
import { getSessionProfileForApi } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import sanitizeHtml from "sanitize-html";

function isVerificationSchemaError(code: string) {
  return code === "42P01" || code === "42703" || code === "PGRST205" || code === "PGRST204";
}

function isRlsPermissionError(code: string) {
  return code === "42501";
}

function isForeignKeyError(code: string) {
  return code === "23503";
}

function escapeHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'escape',
  });
}

function buildVerificationEmailHtml(params: {
  code: string;
  email: string;
  universityName: string;
}) {
  const appUrl = resolveAppUrl();
  const safeUniversityName = escapeHtml(params.universityName);
  const safeEmail = escapeHtml(params.email);
  const safeCode = escapeHtml(params.code);
  const verifyUrl = `${appUrl}/verify`;

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#eef2f6;padding:28px 14px;font-family:'Segoe UI',Arial,sans-serif;color:#1f2933;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#f9fafb;border-radius:18px;overflow:hidden;border:1px solid rgba(31,41,51,0.14);">
      <tr>
        <td style="background:linear-gradient(135deg,#1f2933 0%,#172331 100%);padding:24px 28px;">
          <div style="font-size:29px;line-height:1;font-weight:800;color:#f9fafb;letter-spacing:0.2px;">LerenGO</div>
          <div style="margin-top:7px;font-size:13px;line-height:1.4;color:#c8d0da;">University email verification</div>
        </td>
      </tr>
      <tr>
        <td style="padding:26px 28px 10px;">
          <h1 style="margin:0;font-size:24px;line-height:1.2;color:#1f2933;font-weight:700;">Verify your campus email</h1>
          <p style="margin:13px 0 0;font-size:14px;line-height:1.55;color:#43505c;">
            Use this one-time code to verify <strong style="color:#1f2933;">${safeEmail}</strong> for
            <strong style="color:#1f2933;">${safeUniversityName}</strong>.
          </p>
          <div style="margin:18px 0 10px;padding:20px 14px;border:1px solid rgba(107,114,128,0.34);border-radius:14px;background:#ffffff;text-align:center;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;font-weight:600;">Verification code</div>
            <div style="margin-top:10px;font-size:34px;letter-spacing:0.34em;color:#1f2933;font-weight:800;font-family:'Courier New',monospace;">${safeCode}</div>
          </div>
          <p style="margin:10px 0 0;font-size:13px;line-height:1.5;color:#5d6671;">
            This code expires in <strong style="color:#1f2933;">${EMAIL_OTP_EXPIRY_MINUTES} minutes</strong>.
          </p>
          <p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:#5d6671;">
            If you did not request this verification, you can ignore this email.
          </p>
          <div style="margin:18px 0 6px;">
            <a href="${verifyUrl}" style="display:inline-block;background:#1f2933;color:#f9fafb;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:13px;font-weight:700;">Back to verification</a>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 28px 22px;font-size:12px;line-height:1.5;color:#6b7280;">
          LerenGO keeps verification steps private to your campus workflow.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildVerificationEmailText(params: {
  code: string;
  email: string;
  universityName: string;
}) {
  return [
    "LerenGO - University email verification",
    "",
    `Use this code to verify ${params.email} for ${params.universityName}:`,
    "",
    params.code,
    "",
    `This code expires in ${EMAIL_OTP_EXPIRY_MINUTES} minutes.`,
    "If you did not request this verification, ignore this email.",
    "",
    `Continue: ${resolveAppUrl()}/verify`,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const session = await getSessionProfileForApi();
    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const { profile, supabase } = session;
    const json = (await request.json()) as { email?: unknown };
    const normalizedEmail =
      typeof json.email === "string" ? json.email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data: university, error: uniError } = await supabase
      .from("universities")
      .select("domain, name")
      .eq("id", profile.university_id)
      .single();

    if (uniError) {
      const code = typeof uniError.code === "string" ? uniError.code : "";
      if (code === "PGRST205") {
        return NextResponse.json(
          { error: "Supabase setup incomplete. Run web/supabase/schema.sql first." },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Could not load selected campus details." },
        { status: 500 },
      );
    }

    if (!university) {
      return NextResponse.json({ error: "Selected campus not found." }, { status: 400 });
    }

    if (!university.domain) {
      return NextResponse.json(
        { error: "No university email domain configured for this campus." },
        { status: 400 },
      );
    }

    const domain = university.domain.toLowerCase().trim();
    if (!normalizedEmail.endsWith(`@${domain}`)) {
      return NextResponse.json(
        { error: `Email must end with @${domain}` },
        { status: 400 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const recentSendWindowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentCodes, error: recentCodesError } = await supabaseAdmin
      .from("verification_codes")
      .select("id, created_at")
      .eq("user_id", profile.id)
      .gte("created_at", recentSendWindowStart)
      .order("created_at", { ascending: false });

    if (recentCodesError) {
      console.error("DB error while checking OTP rate limits:", recentCodesError);
      const dbCode = typeof recentCodesError.code === "string" ? recentCodesError.code : "";
      if (isVerificationSchemaError(dbCode)) {
        return NextResponse.json(
          {
            error:
              "Verification table/schema is not ready. Re-run web/supabase/verification_schema.sql, then retry in 10 seconds.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Could not validate OTP rate limits." },
        { status: 500 },
      );
    }

    const latestCode = recentCodes?.[0] ?? null;
    if (latestCode) {
      const elapsedMs = Date.now() - Date.parse(latestCode.created_at);
      if (Number.isFinite(elapsedMs) && elapsedMs < EMAIL_OTP_RESEND_COOLDOWN_SECONDS * 1000) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((EMAIL_OTP_RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000),
        );

        return NextResponse.json(
          { error: `Please wait ${retryAfterSeconds}s before requesting another code.` },
          { status: 429 },
        );
      }
    }

    if ((recentCodes?.length ?? 0) >= EMAIL_OTP_MAX_SENDS_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many verification emails sent. Try again in an hour." },
        { status: 429 },
      );
    }

    const nowIso = new Date().toISOString();
    const { error: cleanupError } = await supabaseAdmin
      .from("verification_codes")
      .update({ expires_at: nowIso })
      .eq("user_id", profile.id)
      .gt("expires_at", nowIso);

    if (cleanupError) {
      console.error("DB error while clearing old OTPs:", cleanupError);
      const dbCode = typeof cleanupError.code === "string" ? cleanupError.code : "";
      if (isVerificationSchemaError(dbCode)) {
        return NextResponse.json(
          {
            error:
              "Verification table/schema is not ready. Re-run web/supabase/verification_schema.sql, then retry in 10 seconds.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Could not rotate the previous verification code." },
        { status: 500 },
      );
    }

    const code = createOtpCode();
    const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MINUTES * 60 * 1000);
    const hashedCode = hashOtpCode(code);
    const { data: insertedRecord, error: dbError } = await supabaseAdmin
      .from("verification_codes")
      .insert({
        attempt_count: 0,
        code: hashedCode,
        email: normalizedEmail,
        expires_at: expiresAt.toISOString(),
        university_id: profile.university_id,
        user_id: profile.id,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB error while creating OTP:", dbError);
      const dbCode = typeof dbError.code === "string" ? dbError.code : "";

      if (isVerificationSchemaError(dbCode)) {
        return NextResponse.json(
          {
            error:
              "Verification table/schema is not ready. Re-run web/supabase/verification_schema.sql, then retry in 10 seconds.",
          },
          { status: 500 },
        );
      }

      if (isRlsPermissionError(dbCode)) {
        return NextResponse.json(
          {
            error:
              "Database permission denied for OTP write. Check SUPABASE_SERVICE_ROLE_KEY in .env.local and restart the server.",
          },
          { status: 500 },
        );
      }

      if (isForeignKeyError(dbCode)) {
        return NextResponse.json(
          {
            error:
              "Your account session is out of sync. Sign out, sign in again, then retry OTP.",
          },
          { status: 400 },
        );
      }

      const detailSuffix =
        process.env.NODE_ENV !== "production" && dbCode
          ? ` (db code: ${dbCode})`
          : "";
      return NextResponse.json(
        { error: `Failed to generate code${detailSuffix}` },
        { status: 500 },
      );
    }

    const smtpPort = Number.parseInt(getRequiredEnv("SMTP_PORT"), 10);
    const normalizedPort = Number.isNaN(smtpPort) ? 587 : smtpPort;
    const transporter = nodemailer.createTransport({
      host: getRequiredEnv("SMTP_HOST"),
      port: normalizedPort,
      secure: normalizedPort === 465,
      auth: {
        user: getRequiredEnv("SMTP_USER"),
        pass: getRequiredEnv("SMTP_PASS"),
      },
    });

    try {
      await transporter.sendMail({
        from: `"LerenGO Verification" <${getRequiredEnv("SMTP_FROM")}>`,
        to: normalizedEmail,
        subject: `Verify your ${university.name} email`,
        text: buildVerificationEmailText({
          code,
          email: normalizedEmail,
          universityName: university.name,
        }),
        html: buildVerificationEmailHtml({
          code,
          email: normalizedEmail,
          universityName: university.name,
        }),
      });
    } catch (mailError) {
      await supabaseAdmin.from("verification_codes").delete().eq("id", insertedRecord.id);
      throw mailError;
    }

    return NextResponse.json({ success: true, email: normalizedEmail });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
