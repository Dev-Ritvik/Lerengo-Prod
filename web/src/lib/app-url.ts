import { headers } from "next/headers";

function normalizeOrigin(value: string | undefined | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.replace(/\/+$/, "");
}

function deriveSiblingOrigin(subdomain: string) {
  const appUrl = resolveAppUrl();

  try {
    const baseUrl = new URL(appUrl);
    const hostname = baseUrl.hostname.toLowerCase();

    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return appUrl;
    }

    const rootHostname = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    baseUrl.hostname = `${subdomain}.${rootHostname}`;
    return baseUrl.origin;
  } catch {
    return appUrl;
  }
}

function deriveSiblingOriginAsync(appUrl: string, subdomain: string) {
  try {
    const baseUrl = new URL(appUrl);
    const hostname = baseUrl.hostname.toLowerCase();

    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return appUrl;
    }

    const rootHostname = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
    baseUrl.hostname = `${subdomain}.${rootHostname}`;
    return baseUrl.origin;
  } catch {
    return appUrl;
  }
}

export function resolveAppUrl() {
  const envUrl = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export async function resolveAppUrlAsync() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    if (host) {
      const proto = headerList.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    }
  } catch {
    // Suppress error outside request contexts (e.g. static rendering)
  }

  return resolveAppUrl();
}

function shouldDisableSubdomains(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

export function resolveAdminAppUrl() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_ADMIN_APP_URL);
  if (configured) return configured;

  const appUrl = resolveAppUrl();
  if (shouldDisableSubdomains(appUrl)) {
    return "/admin";
  }
  return deriveSiblingOrigin("admin");
}

export function resolveCampusNetworkAppUrl() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_CAMPUS_NETWORK_APP_URL);
  if (configured) return configured;

  const appUrl = resolveAppUrl();
  if (shouldDisableSubdomains(appUrl)) {
    return "/campus-network";
  }
  return deriveSiblingOrigin("campusgo");
}

export function resolveCoursesAppUrl() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_COURSES_APP_URL);
  if (configured) return configured;

  const appUrl = resolveAppUrl();
  if (shouldDisableSubdomains(appUrl)) {
    return "/courses";
  }
  return deriveSiblingOrigin("skillgo");
}

export function resolveLabsAppUrl() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_LABS_APP_URL);
  if (configured) return configured;

  const appUrl = resolveAppUrl();
  if (shouldDisableSubdomains(appUrl)) {
    return "/labs";
  }
  return deriveSiblingOrigin("forgego");
}

export function resolveMentorGoAppUrl() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_MENTORGO_APP_URL);
  if (configured) return configured;

  const appUrl = resolveAppUrl();
  if (shouldDisableSubdomains(appUrl)) {
    return "/mentorgo";
  }
  return deriveSiblingOrigin("mentorgo");
}

export function resolveHunterGoAppUrl() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_HUNTERGO_APP_URL);
  if (configured) return configured;

  const appUrl = resolveAppUrl();
  if (shouldDisableSubdomains(appUrl)) {
    return "/huntergo";
  }
  return deriveSiblingOrigin("huntergo");
}

export async function resolveAdminAppUrlAsync() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_ADMIN_APP_URL);
  if (configured) return configured;

  const appUrl = await resolveAppUrlAsync();
  if (shouldDisableSubdomains(appUrl)) {
    return "/admin";
  }
  return deriveSiblingOriginAsync(appUrl, "admin");
}

export async function resolveCampusNetworkAppUrlAsync() {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_CAMPUS_NETWORK_APP_URL);
  if (configured) return configured;

  const appUrl = await resolveAppUrlAsync();
  if (shouldDisableSubdomains(appUrl)) {
    return "/campus-network";
  }
  return deriveSiblingOriginAsync(appUrl, "campusgo");
}
