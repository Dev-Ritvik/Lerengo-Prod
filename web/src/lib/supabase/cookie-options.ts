import { resolveAppUrl } from "@/lib/app-url";

function normalizeCookieDomain(value: string | undefined | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.startsWith(".") ? normalizedValue : `.${normalizedValue}`;
}

function deriveCookieDomainFromAppUrl() {
  try {
    const appUrl = new URL(resolveAppUrl());
    const hostname = appUrl.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
    ) {
      return null;
    }

    const rootHostname = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    return `.${rootHostname}`;
  } catch {
    return null;
  }
}

export function getSupabaseCookieOptions(requestHostname?: string) {
  const explicitDomain = normalizeCookieDomain(process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN);
  let domain = explicitDomain ?? deriveCookieDomainFromAppUrl();

  // If the derived cookie domain doesn't match the actual request hostname,
  // the browser silently rejects the cookie — breaking PKCE auth flows.
  // This happens when testing on *.vercel.app while NEXT_PUBLIC_APP_URL
  // points to a custom domain like lerengo.com.
  if (domain && requestHostname) {
    const bare = domain.startsWith(".") ? domain.slice(1) : domain;
    if (!requestHostname.endsWith(bare)) {
      domain = null;
    }
  }

  const secure = resolveAppUrl().startsWith("https://");

  return {
    domain: domain ?? undefined,
    path: "/",
    sameSite: "lax" as const,
    secure,
  };
}
