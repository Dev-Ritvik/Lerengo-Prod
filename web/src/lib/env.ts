export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function parsePositiveInteger(value: string | undefined, defaultValue: number) {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
}

export function resolveSampleLoginAvailability(params?: {
  enabledValue?: string;
  nodeEnv?: string;
}) {
  return (
    parseBoolean(params?.enabledValue, false) &&
    (params?.nodeEnv ?? process.env.NODE_ENV) !== "production"
  );
}

export function resolveCoursesFallbackAvailability(params?: {
  enabledValue?: string;
  nodeEnv?: string;
}) {
  return parseBoolean(
    params?.enabledValue,
    (params?.nodeEnv ?? process.env.NODE_ENV) !== "production",
  );
}

export const env = {
  ALLOW_COURSE_FALLBACK: resolveCoursesFallbackAvailability({
    enabledValue: process.env.ALLOW_COURSE_FALLBACK,
    nodeEnv: process.env.NODE_ENV,
  }),
  ENABLE_SAMPLE_LOGIN: resolveSampleLoginAvailability({
    enabledValue: process.env.ENABLE_SAMPLE_LOGIN,
    nodeEnv: process.env.NODE_ENV,
  }),
  ID_VERIFICATION_AUTO_APPROVE: parseBoolean(
    process.env.ID_VERIFICATION_AUTO_APPROVE,
    false,
  ),
  ID_VERIFICATION_AUTO_APPROVE_DELAY_SECONDS: parsePositiveInteger(
    process.env.ID_VERIFICATION_AUTO_APPROVE_DELAY_SECONDS,
    10,
  ),
  ID_VERIFICATION_MAX_ATTEMPTS_PER_DAY: parsePositiveInteger(
    process.env.ID_VERIFICATION_MAX_ATTEMPTS_PER_DAY,
    3,
  ),
  ID_VERIFICATION_RETENTION_HOURS: parsePositiveInteger(
    process.env.ID_VERIFICATION_RETENTION_HOURS,
    72,
  ),
  NOTES_FREE_OFFER_SEMESTER: parsePositiveInteger(
    process.env.NOTES_FREE_OFFER_SEMESTER,
    1,
  ),
  SUPABASE_ID_CARDS_BUCKET: process.env.SUPABASE_ID_CARDS_BUCKET ?? "id-cards",
  SUPABASE_NOTES_BUCKET: process.env.SUPABASE_NOTES_BUCKET ?? "notes-private",
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: process.env.SMTP_PORT ?? "587",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  SMTP_FROM: process.env.SMTP_FROM ?? "onboarding@resend.dev",
};
