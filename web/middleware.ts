import { NextResponse, type NextRequest } from "next/server";
import { resolvePostAuthDestination, type JourneyProfile } from "@/lib/auth-journey";
import { updateSession } from "@/lib/supabase/middleware";
import { checkGlobalRateLimit, resolveClientIp } from "@/lib/local-rate-limit";

const AUTH_ENTRY_PATHS = new Set(["/signin", "/signup"]);

// Global rate-limit defaults — override via env vars in production.
const GLOBAL_RATE_LIMIT_WINDOW_MS = Number(
  process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || "60000",
);
const GLOBAL_RATE_LIMIT_MAX = Number(
  process.env.RATE_LIMIT_GLOBAL_MAX || "300",
);


function getConfiguredOrigin(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue.replace(/\/+$/, "") : null;
}

function getConfiguredAdminOrigin() {
  return getConfiguredOrigin(process.env.NEXT_PUBLIC_ADMIN_APP_URL);
}

function getConfiguredCampusOrigin() {
  return getConfiguredOrigin(process.env.NEXT_PUBLIC_CAMPUS_NETWORK_APP_URL);
}

function getConfiguredCoursesOrigin() {
  return getConfiguredOrigin(process.env.NEXT_PUBLIC_COURSES_APP_URL);
}

function getConfiguredLabsOrigin() {
  return getConfiguredOrigin(process.env.NEXT_PUBLIC_LABS_APP_URL);
}

function getConfiguredMentorGoOrigin() {
  return getConfiguredOrigin(process.env.NEXT_PUBLIC_MENTORGO_APP_URL);
}

function getConfiguredHunterGoOrigin() {
  return getConfiguredOrigin(process.env.NEXT_PUBLIC_HUNTERGO_APP_URL);
}

function getConfiguredMainOrigin() {
  return getConfiguredOrigin(process.env.NEXT_PUBLIC_APP_URL);
}

function getSubdomainOrigin(request: NextRequest, subdomain: string, configuredOrigin: string | null) {
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const hostname = getRequestHostname(request);
  if (hostname.endsWith(".vercel.app")) {
    return null;
  }

  const mainOrigin = getConfiguredMainOrigin();
  if (mainOrigin) {
    try {
      const url = new URL(mainOrigin);
      if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
        return mainOrigin;
      }
      const rootHostname = url.hostname.startsWith("www.") ? url.hostname.slice(4) : url.hostname;
      url.hostname = `${subdomain}.${rootHostname}`;
      return url.origin;
    } catch {
      return mainOrigin;
    }
  }

  const host = getRequestHost(request);
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return null;
  }

  const port = host.match(/:\d+$/)?.[0] ?? "";
  const rootHostname =
    hostname.split(".").length > 2
      ? hostname.split(".").slice(-2).join(".")
      : hostname;

  return `${getRequestProtocol(request)}://${subdomain}.${rootHostname}${port}`;
}

function getDerivedAdminOrigin(request: NextRequest) {
  return getSubdomainOrigin(request, "admin", getConfiguredAdminOrigin());
}

function getDerivedCampusOrigin(request: NextRequest) {
  return getSubdomainOrigin(request, "campusgo", getConfiguredCampusOrigin());
}

function getDerivedCoursesOrigin(request: NextRequest) {
  return getSubdomainOrigin(request, "skillgo", getConfiguredCoursesOrigin());
}

function getDerivedLabsOrigin(request: NextRequest) {
  return getSubdomainOrigin(request, "forgego", getConfiguredLabsOrigin());
}

function getDerivedMentorGoOrigin(request: NextRequest) {
  return getSubdomainOrigin(request, "mentorgo", getConfiguredMentorGoOrigin());
}

function getDerivedHunterGoOrigin(request: NextRequest) {
  return getSubdomainOrigin(request, "huntergo", getConfiguredHunterGoOrigin());
}

function getRewrittenResponse(source: NextResponse, request: NextRequest, pathname: string) {
  const rewrittenResponse = NextResponse.rewrite(new URL(pathname, request.url));
  return copyCookies(source, rewrittenResponse);
}

function getRedirectResponse(source: NextResponse, request: NextRequest, pathname: string) {
  const redirectResponse = NextResponse.redirect(new URL(pathname, request.url));
  return copyCookies(source, redirectResponse);
}

function isCampusNetworkHost(hostname: string) {
  return hostname === "campusgo.lerengo" || hostname.startsWith("campusgo.");
}

function isCoursesHost(hostname: string) {
  return hostname === "skillgo.lerengo" || hostname.startsWith("skillgo.");
}

function isLabsHost(hostname: string) {
  return hostname === "forgego.lerengo" || hostname.startsWith("forgego.");
}

function isMentorGoHost(hostname: string) {
  return hostname === "mentorgo.lerengo" || hostname.startsWith("mentorgo.");
}

function isHunterGoHost(hostname: string) {
  return hostname === "huntergo.lerengo" || hostname.startsWith("huntergo.");
}

function isRootPath(pathname: string) {
  return pathname === "/";
}

function isAdminLandingPath(pathname: string) {
  return pathname === "/" || pathname === "/admin-portal";
}

function shouldRedirectToMainAdminLogin(pathname: string) {
  return pathname === "/signin" || pathname === "/signup" || pathname === "/admin/otp";
}

function shouldRedirectResetFlow(pathname: string) {
  return pathname === "/admin/reset-password" || pathname.startsWith("/admin/reset-password/");
}

function shouldRedirectRootDomainSection(hostname: string, pathname: string) {
  return !hostname.startsWith("admin.") && (pathname === "/admin" || pathname.startsWith("/admin/"));
}

function shouldRedirectCampusHostRoot(pathname: string) {
  return isRootPath(pathname);
}

function shouldRedirectCoursesHostRoot(pathname: string) {
  return isRootPath(pathname);
}

function shouldRedirectLabsHostRoot(pathname: string) {
  return isRootPath(pathname);
}

function shouldRedirectMentorGoHostRoot(pathname: string) {
  return isRootPath(pathname);
}

function shouldRedirectHunterGoHostRoot(pathname: string) {
  return isRootPath(pathname);
}

function shouldRedirectPublicRouteToCampusHost(pathname: string) {
  return pathname === "/campus-network";
}

function shouldRedirectPublicRouteToCoursesHost(pathname: string) {
  return pathname === "/courses" || pathname.startsWith("/courses/");
}

function shouldRedirectPublicRouteToLabsHost(pathname: string) {
  return pathname === "/labs" || pathname.startsWith("/labs/");
}

function shouldRedirectPublicRouteToMentorGoHost(pathname: string) {
  return pathname === "/mentorgo" || pathname.startsWith("/mentorgo/");
}

function shouldRedirectPublicRouteToHunterGoHost(pathname: string) {
  return pathname === "/huntergo" || pathname.startsWith("/huntergo/");
}

function getRootHostDestination(request: NextRequest, pathname: string) {
  const hostname = getRequestHostname(request);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".vercel.app")
  ) {
    return null;
  }

  const requestOrigin = request.nextUrl.origin;

  if (shouldRedirectPublicRouteToCampusHost(pathname)) {
    const campusOrigin = getDerivedCampusOrigin(request);
    if (campusOrigin) {
      if (campusOrigin === requestOrigin) {
        return null;
      }
      const destination = new URL("/", campusOrigin);
      destination.search = request.nextUrl.search;
      return destination.toString();
    }
    return null;
  }

  if (shouldRedirectPublicRouteToCoursesHost(pathname)) {
    const coursesOrigin = getDerivedCoursesOrigin(request);
    if (coursesOrigin) {
      if (coursesOrigin === requestOrigin) {
        return null;
      }
      const destination = new URL(pathname === "/courses" ? "/" : pathname, coursesOrigin);
      destination.search = request.nextUrl.search;
      return destination.toString();
    }
    return null;
  }

  if (shouldRedirectPublicRouteToLabsHost(pathname)) {
    const labsOrigin = getDerivedLabsOrigin(request);
    if (labsOrigin) {
      if (labsOrigin === requestOrigin) {
        return null;
      }
      const destination = new URL(pathname === "/labs" ? "/" : pathname, labsOrigin);
      destination.search = request.nextUrl.search;
      return destination.toString();
    }
    return null;
  }

  if (shouldRedirectPublicRouteToMentorGoHost(pathname)) {
    const mentorGoOrigin = getDerivedMentorGoOrigin(request);
    if (mentorGoOrigin) {
      const destination = new URL(pathname === "/mentorgo" ? "/" : pathname, mentorGoOrigin);
      destination.search = request.nextUrl.search;
      return destination.toString();
    }
    return null;
  }

  if (shouldRedirectPublicRouteToHunterGoHost(pathname)) {
    const hunterGoOrigin = getDerivedHunterGoOrigin(request);
    if (hunterGoOrigin) {
      const destination = new URL(pathname === "/huntergo" ? "/" : pathname, hunterGoOrigin);
      destination.search = request.nextUrl.search;
      return destination.toString();
    }
    return null;
  }

  return null;
}

function getRequestHost(request: NextRequest) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const hostHeader = request.headers.get("host")?.split(",")[0]?.trim();

  return (forwardedHost || hostHeader || request.nextUrl.host).toLowerCase();
}

function getRequestHostname(request: NextRequest) {
  return getRequestHost(request).replace(/:\d+$/, "");
}

function getRequestProtocol(request: NextRequest) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    ?.replace(/:$/, "");

  return forwardedProtocol || request.nextUrl.protocol.replace(/:$/, "");
}

function isAdminHost(hostname: string) {
  return hostname === "admin.lerengo" || hostname.startsWith("admin.");
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });

  return target;
}

export async function middleware(request: NextRequest) {
  // ── Global IP-based rate limit (first-line defence) ──────────────────
  const clientIp = resolveClientIp(request);
  const globalRateResult = checkGlobalRateLimit(clientIp, {
    limit: GLOBAL_RATE_LIMIT_MAX,
    windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
  });

  if (!globalRateResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(globalRateResult.retryAfterSeconds),
        },
      },
    );
  }

  const pathname = request.nextUrl.pathname;
  const hostname = getRequestHostname(request);
  const adminHost = isAdminHost(hostname);
  const campusHost = isCampusNetworkHost(hostname);
  const coursesHost = isCoursesHost(hostname);
  const labsHost = isLabsHost(hostname);
  const mentorGoHost = isMentorGoHost(hostname);
  const hunterGoHost = isHunterGoHost(hostname);

  if (!pathname.startsWith("/api")) {
    if (shouldRedirectRootDomainSection(hostname, pathname)) {
      const adminOrigin = getDerivedAdminOrigin(request);
      if (adminOrigin) {
        const redirectUrl = new URL(`${pathname}${request.nextUrl.search}`, adminOrigin);
        return NextResponse.redirect(redirectUrl);
      }
    }
    if (!adminHost && !campusHost && !coursesHost && !labsHost && !mentorGoHost && !hunterGoHost) {
      const redirectedDestination = getRootHostDestination(request, pathname);
      if (redirectedDestination) {
        return NextResponse.redirect(new URL(redirectedDestination));
      }
    }
  }

  const { authUser, response } = await updateSession(request);

  if (!pathname.startsWith("/api") && adminHost) {
    if (isAdminLandingPath(pathname)) {
      return getRewrittenResponse(response, request, "/admin/login");
    }

    if (shouldRedirectToMainAdminLogin(pathname) || shouldRedirectResetFlow(pathname)) {
      return getRedirectResponse(response, request, "/admin/login");
    }
  }

  if (!pathname.startsWith("/api") && campusHost && shouldRedirectCampusHostRoot(pathname)) {
    if (authUser?.id) {
      return getRewrittenResponse(response, request, "/campus-network");
    }

    return getRedirectResponse(response, request, "/signin?next=/campus-network");
  }

  if (!pathname.startsWith("/api") && campusHost && pathname === "/campus-network" && !authUser?.id) {
    return getRedirectResponse(response, request, "/signin?next=/campus-network");
  }

  if (!pathname.startsWith("/api") && coursesHost && shouldRedirectCoursesHostRoot(pathname)) {
    return getRewrittenResponse(response, request, "/courses");
  }

  if (!pathname.startsWith("/api") && labsHost && shouldRedirectLabsHostRoot(pathname)) {
    return getRewrittenResponse(response, request, "/labs");
  }

  if (!pathname.startsWith("/api") && mentorGoHost && shouldRedirectMentorGoHostRoot(pathname)) {
    return getRewrittenResponse(response, request, "/mentorgo");
  }

  if (!pathname.startsWith("/api") && hunterGoHost && shouldRedirectHunterGoHostRoot(pathname)) {
    return getRewrittenResponse(response, request, "/huntergo");
  }

  if (!AUTH_ENTRY_PATHS.has(pathname) || !authUser?.id) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    return response;
  }

  try {
    let profile: JourneyProfile | null = null;

    if (serviceRoleKey) {
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(authUser.id)}&select=batch,campus_name,department,program_domain,university_id,verified`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          cache: "no-store",
        },
      );

      if (profileResponse.ok) {
        const payload = (await profileResponse.json()) as JourneyProfile[];
        profile = payload[0] ?? null;
      }
    }

    const nextPath = request.nextUrl.searchParams.get("next");
    const destination = resolvePostAuthDestination(profile, nextPath);

    if (destination === pathname) {
      return response;
    }

    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    return copyCookies(response, redirectResponse);
  } catch {
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
