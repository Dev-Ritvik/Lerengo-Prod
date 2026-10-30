import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const EMAIL_OTP_EXPIRY_MINUTES = 10;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_MAX_SENDS_PER_HOUR = 5;
export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;

export function createOtpCode() {
  return randomInt(100000, 1_000_000).toString();
}

export function normalizeOtpCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\D+/g, "");
}

export function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function otpMatchesHash(storedCode: string, candidateCode: string) {
  const candidateHash = hashOtpCode(candidateCode);

  if (storedCode.length !== candidateHash.length) {
    return storedCode === candidateCode;
  }

  return timingSafeEqual(Buffer.from(storedCode), Buffer.from(candidateHash));
}
