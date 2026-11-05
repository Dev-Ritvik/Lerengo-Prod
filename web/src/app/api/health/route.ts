import { NextResponse } from "next/server";

function isConfigured(value: string | undefined) {
  return Boolean(value?.trim());
}

export async function GET() {
  const checks = {
    supabase: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      isConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY),
    smtp: isConfigured(process.env.SMTP_HOST) &&
      isConfigured(process.env.SMTP_PORT) &&
      isConfigured(process.env.SMTP_USER) &&
      isConfigured(process.env.SMTP_PASS) &&
      isConfigured(process.env.SMTP_FROM),
    razorpay: isConfigured(process.env.RAZORPAY_KEY_ID) &&
      isConfigured(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) &&
      isConfigured(process.env.RAZORPAY_KEY_SECRET) &&
      isConfigured(process.env.RAZORPAY_WEBHOOK_SECRET),
    appUrl: isConfigured(process.env.NEXT_PUBLIC_APP_URL),
  };

  const missing = Object.entries(checks)
    .filter(([, configured]) => !configured)
    .map(([name]) => name);

  return NextResponse.json(
    {
      status: missing.length === 0 ? "ready" : "degraded",
      environment: process.env.NODE_ENV ?? "unknown",
      checks,
      missing,
    },
    { status: checks.supabase ? 200 : 503 },
  );
}
