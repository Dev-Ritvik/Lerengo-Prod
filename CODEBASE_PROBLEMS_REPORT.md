# LerenGO Codebase Audit & Problems Report

**Date:** October 29, 2026  
**Audited Target:** `web/` (Next.js 16.2.10, React 19.2.3, TypeScript 5, Supabase SSR)  
**Status:** Detailed Technical Findings & Remediation Roadmap  

---

## Executive Summary

A comprehensive architectural, security, reliability, and code quality audit was performed on the LerenGO codebase. While the platform boasts a rich institutional dark-mode design system, clean domain separation (CampusGO, SkillGO, ForgeGO, MentorGO, HunterGO), and multi-tenant isolation patterns, several **critical blockers, high-severity security vulnerabilities, and architectural bottlenecks** currently impact CI/CD, deployment stability, and production readiness.

### Key Finding Metrics:
- **CI/CD Status:** ✅ **FIXED & PASSING** (`npm run lint`: 0 errors; `npx tsc --noEmit`: 0 errors; `npm test`: 9/9 passed; `npx next build`: successful)
- **Security Vulnerabilities Fixed:** P0 & P1 Patches Applied (Timing attacks, IP spoofing, TLS bypass, OTP rate limiting flaw, and production mock fallback)
- **Remaining Items:** Long-term database schema migration tool adoption & Redis rate limiting persistence.

---

## 1. Critical Build, Lint & CI/CD Blockers

The continuous integration pipeline (`.github/workflows/ci.yml`) runs `npm run lint` and `npm run build` on every push and pull request. **The build pipeline currently fails on CI due to the following hard errors:**

### 1.1. Unhandled Scratch Script Committed to Repo (`web/fix.js`)
* **Location:** [web/fix.js](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/fix.js#L1)
* **Error:** `A 'require()' style import is forbidden (@typescript-eslint/no-require-imports)`
* **Root Cause:** A temporary refactoring helper script (`fix.js`) was committed into the `web/` source root. ESLint parses it as TypeScript/ES module project file and fails the lint step.
* **Fix:** Delete `web/fix.js` or move it to a dedicated non-linted directory.

### 1.2. HTML `<a>` Navigation in Admin Panel
* **Location:** [web/src/app/admin/control/(panel)/layout.tsx:22](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/admin/control/%28panel%29/layout.tsx#L22)
* **Error:** `Do not use an '<a>' element to navigate to '/'. Use '<Link />' from 'next/link' instead (@next/next/no-html-link-for-pages)`
* **Root Cause:** The superadmin layout uses `<a href="/">` for "Browse Main Site", which triggers full page reloads and breaks Next.js client-side cache and transitions.
* **Fix:** Replace `<a className={...} href="/">` with `<Link className={...} href="/">`.

### 1.3. React 19 Synchronous State Update in Effect (`loading.tsx`)
* **Location:** [web/src/app/loading.tsx:20-23](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/loading.tsx#L20-L23)
* **Error:** `Error: Calling setState synchronously within an effect can trigger cascading renders (react-hooks/set-state-in-effect)`
* **Root Cause:** `setMessage(LOADING_MESSAGES[randomIndex])` is called directly in an empty-dependency `useEffect`. Under React 19 and Next.js 16, this is classified as a render anti-pattern.
* **Fix:** Initialize state using a lazy initializer function `useState(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])` or compute dynamically.

### 1.4. TypeScript Import Extensions Error (`test/security.test.ts`)
* **Location:** [web/test/security.test.ts:6,12](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/test/security.test.ts#L6-L12)
* **Error:** `error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.`
* **Root Cause:** `tsconfig.json` includes `**/*.ts` (matching `test/security.test.ts`), which uses `import ... from "../src/lib/env.ts"`. In TypeScript without `allowImportingTsExtensions`, explicit `.ts` extensions are prohibited.
* **Fix:** Change imports to extensionless module specifiers (`"../src/lib/env"` and `"../src/lib/local-rate-limit"`) or add `test` to `exclude` in `tsconfig.json`.

---

## 2. Security Vulnerabilities & Audit Findings

### 2.1. [CRITICAL] Timing Attack Vulnerability in Razorpay Webhook
* **Location:** [web/src/app/api/webhook/route.ts:29-31](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/api/webhook/route.ts#L29-L31)
* **Risk:** Attacker forging Razorpay payment webhook notifications to unlock paid notes or courses without paying.
* **Vulnerability Details:**
  ```typescript
  // Current vulnerable code:
  if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  ```
  Comparing HMAC hashes using the standard string equality operator (`!==`) terminates evaluation early upon the first mismatched byte. This makes the endpoint susceptible to a timing attack where an adversary gradually guesses the HMAC secret signature.
* **Remediation:**
  Use constant-time comparison:
  ```typescript
  const sigBuffer = Buffer.from(signature, "utf8");
  const expBuffer = Buffer.from(expectedSignature, "utf8");
  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  ```

### 2.2. [HIGH] Client IP Spoofing & Global Rate Limit Bypass
* **Location:** [web/src/lib/local-rate-limit.ts:27-36](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/lib/local-rate-limit.ts#L27-L36)
* **Risk:** Complete circumvention of global middleware protection, brute-force limits, and OTP abuse limits.
* **Vulnerability Details:**
  ```typescript
  export function resolveClientIp(request: Request) {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = request.headers.get("x-real-ip")?.trim();
    const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
    return forwardedFor || realIp || cfConnectingIp || "unknown";
  }
  ```
  `x-forwarded-for` takes the **first** entry supplied in the header, which is set directly by the client. An attacker can supply `X-Forwarded-For: 1.1.1.1` and rotate it on every HTTP request. Because `forwardedFor` takes precedence over Cloudflare's non-spoofable `cf-connecting-ip` and reverse-proxy `x-real-ip`, any attacker can bypass rate limiting at will.
* **Remediation:**
  Prioritize trusted proxy headers (e.g., `cf-connecting-ip` on Cloudflare or `x-real-ip` on Vercel) over raw `x-forwarded-for`.

### 2.3. [HIGH] Global Disabling of SSL/TLS Certificate Verification in Development
* **Location:** [web/next.config.ts:3-5](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/next.config.ts#L3-L5)
* **Risk:** Developer machine credential leakage and Man-in-the-Middle (MITM) attacks.
* **Vulnerability Details:**
  ```typescript
  if (process.env.NODE_ENV === "development") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  ```
  Setting `NODE_TLS_REJECT_UNAUTHORIZED = "0"` completely turns off certificate validation for all outbound Node.js HTTPS requests (including Supabase, Razorpay, Cal.com, SMTP). If developers test over public networks (coffee shops, campus Wi-Fi), tokens and secret keys can be intercepted.
* **Remediation:** Remove this override and install valid local root CA certificates (e.g., via `mkcert`) if local HTTPS proxies are required.

### 2.4. [HIGH] OTP Hourly Rate Limit Bypass Logic Flaw
* **Location:** [web/src/app/api/verify/email/send/route.ts:215-219](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/api/verify/email/send/route.ts#L215-L219)
* **Risk:** Unlimited SMS/Email OTP spamming, high SMTP costs, and reputation destruction.
* **Vulnerability Details:**
  ```typescript
  // Step A: Check recent codes in the last 1 hour
  const { data: recentCodes } = await supabaseAdmin
    .from("verification_codes")
    .select("id, created_at")
    .eq("user_id", profile.id)
    .gte("created_at", recentSendWindowStart);
  
  // Step B: Delete all previous codes for the user!
  const { error: cleanupError } = await supabaseAdmin
    .from("verification_codes")
    .delete()
    .eq("user_id", profile.id);
  
  // Step C: Insert new code
  ```
  Because Step B deletes all existing rows for `user_id`, on the very next request Step A will always find **zero** historical records! The hourly limit (`EMAIL_OTP_MAX_SENDS_PER_HOUR = 4`) is completely neutralized.
* **Remediation:**
  Instead of deleting past rows, maintain a separate `consumed_at` or `status` column, or mark the previous active code as superseded (`status = 'superseded'`) without deleting historical records needed for rate limit audits.

### 2.5. [HIGH] Silent Mock Authentication Fallback in Production
* **Location:** [web/src/lib/supabase/server.ts:12-15](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/lib/supabase/server.ts#L12-L15), [web/src/lib/supabase/admin.ts:19-22](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/lib/supabase/admin.ts#L19-L22)
* **Risk:** Data corruption, phantom users, and silent security failures in production.
* **Vulnerability Details:**
  When `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` is omitted, the helpers log a console warning and return `createMockSupabaseClient()`, which hardcodes:
  - User: `demo@lerengo.dev` (`mock-user-id`)
  - Full Name: `Siddharth S.`
  - University: `Lovely Professional University`
  In a production environment where an environment variable fails to load, the application will not fail safely with a 500 error; instead, it will quietly present mock user data to unauthenticated visitors.
* **Remediation:**
  Only return `createMockSupabaseClient()` if `process.env.NODE_ENV !== "production"` and explicit flag `ALLOW_MOCK_SUPABASE=true` is set. Throw a hard error in production.

### 2.6. [MEDIUM] User Profile Email Overwrite & Authentication Desync
* **Location:** [web/src/app/api/verify/email/confirm/route.ts:140-146](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/api/verify/email/confirm/route.ts#L140-L146) vs [web/src/app/signin/actions.ts:87-96](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/signin/actions.ts#L87-L96)
* **Risk:** Inconsistent user state and broken verification indicators.
* **Vulnerability Details:**
  When a user verifies via campus email, `api/verify/email/confirm` overwrites `public.users.email` with the newly verified university email. However, `auth.users.email` remains the user's primary login email. The next time the user logs in via password or OAuth, `signin/actions.ts` runs:
  ```typescript
  await supabase.from("users").upsert({
    id: data.user.id,
    email: data.user.email ?? username,
    full_name: fullName,
  });
  ```
  This immediately reverts `public.users.email` back to `auth.users.email`.
* **Remediation:**
  Store the verified university email in a dedicated column `university_email` rather than mutating `public.users.email`.

### 2.7. [MEDIUM] Incomplete File Inspection on Admin Note Uploads
* **Location:** [web/src/app/admin/notes/actions.ts:130-135](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/admin/notes/actions.ts#L130-L135)
* **Risk:** Upload of disguised malicious files (e.g. polyglot PDFs, executable files with `.pdf` extension) and server memory exhaustion.
* **Vulnerability Details:**
  `uploadNote` checks `fileEntry.name.toLowerCase().endsWith(".pdf")` and `fileEntry.type === "application/pdf"`. Unlike the ID card verification upload (which inspects image headers and magic bytes), PDF uploads do not verify the `%PDF-` magic header or enforce a maximum upload size.
* **Remediation:**
  Validate the first 5 bytes (`%PDF-`) from `fileBytes` and enforce a hard size limit (e.g., 25MB).

---

## 3. Architecture & Operational Risks

### 3.1. In-Memory Rate Limiting on Ephemeral Serverless Instances
* **Location:** [web/src/lib/local-rate-limit.ts:15-25](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/lib/local-rate-limit.ts#L15-L25)
* **Problem:** Rate limit buckets are stored in `globalThis.__lerengoRouteRateLimitStore` (`new Map()`).
* **Impact:** In a serverless cloud environment (Vercel, AWS Lambda), each incoming request can hit a different container or edge node. In-memory state is never synchronized across lambdas. Rate limits will reset randomly and provide negligible protection against distributed traffic.
* **Recommendation:** Integrate Upstash Redis (`@upstash/ratelimit`) or use Supabase Postgres RPC for durable rate-limiting.

### 3.2. Extreme Schema Fragmentation & Absence of Migration Tools
* **Location:** [web/supabase/](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/supabase)
* **Problem:** There are **10 standalone `.sql` files** in `web/supabase`:
  1. `schema.sql` (Core)
  2. `superadmin_schema.sql`
  3. `courses_schema.sql`
  4. `labs_schema.sql`
  5. `mentorgo_schema.sql`
  6. `huntergo_schema.sql`
  7. `campus_weekly_schema.sql`
  8. `verification_schema.sql`
  9. `mentorship_chat.sql`
  10. `module_expansion_schema.sql`
* **Impact:** There is no Supabase CLI migration pipeline (`supabase/migrations/`) or tool to apply them sequentially. Code contains defensive runtime checks for missing tables (`code === "42P01" || code === "PGRST205"`), which hides database setup failures until users hit specific routes.
* **Recommendation:** Consolidate these scripts into ordered timestamped Supabase migrations (e.g., `00001_core.sql`, `00002_courses.sql`, etc.) and provide an automated deployment script.

### 3.3. Subdomain vs Single-Origin Routing Complexity
* **Location:** [web/middleware.ts:50-112](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/middleware.ts#L50-L112), [web/src/lib/app-url.ts](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/lib/app-url.ts)
* **Problem:** The codebase splits features into multiple subdomains (`campusgo.`, `skillgo.`, `forgego.`, `admin.`, `mentorgo.`, `huntergo.`) while running on a single Next.js App Router application.
* **Impact:**
  - Requires wildcard DNS and custom cookie domain settings (`.lerengo.com`).
  - On preview deployments (`*.vercel.app`), wildcard subdomains fail, requiring complex middleware rewriting and fallback logic.
  - If `NEXT_PUBLIC_APP_URL` is omitted, `resolveAppUrl()` defaults to `http://localhost:3000`, causing cookies to be set with `secure: false` in production.
* **Recommendation:** Add a production assertion that fails the build if `NEXT_PUBLIC_APP_URL` does not start with `https://`.

---

## 4. Code Quality & Dependency Debt

### 4.1. Duplicate & Bloated Animation Dependencies
* **Location:** [web/package.json:26,27,29](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/package.json#L26-L29)
* **Problem:**
  - `"framer-motion": "^12.40.0"`
  - `"motion": "^12.40.0"`
  - `"gsap": "^3.15.0"`
* **Impact:** `framer-motion` and `motion` are identical packages (the library was officially renamed to Motion). Having both installed results in dual bundling of physics engines, adding ~150KB+ to the JavaScript bundle size.
* **Recommendation:** Standardize on `"motion"` and uninstall `"framer-motion"`.

### 4.2. Missing Automated Test Coverage
* **Location:** [web/test/security.test.ts](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/test/security.test.ts)
* **Problem:** Only 8 unit assertions exist across the entire repository (strictly testing in-memory rate-limiting and env helper functions).
* **Missing Test Coverage:**
  - ❌ Authentication & RBAC guards (`requireAdminUser`, `requireSuperAdminUser`, `requireVerifiedProfile`)
  - ❌ Payment order calculation and Razorpay webhook processing
  - ❌ University isolation & note access authorization
  - ❌ Assessment scoring and course progression
  - ❌ Subdomain routing resolution in middleware
* **Recommendation:** Expand test coverage with integration tests for key API routes using `@playwright/test` and Vitest/Node test runner.

### 4.3. Raw `<img>` Elements Harming Core Web Vitals
* **Locations:**
  - [web/src/components/site-footer.tsx:23](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/components/site-footer.tsx#L23)
  - [web/src/components/ui/card-stack.tsx:385](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/components/ui/card-stack.tsx#L385)
  - [web/src/app/card-stack-demo/page.tsx:85](file:///c:/Users/Dev%20Ritvik/OneDrive/Documents/Erripuka/Lerengo/lerngo-main/web/src/app/card-stack-demo/page.tsx#L85)
* **Warning:** `@next/next/no-img-element`
* **Impact:** Unoptimized images without automatic WebP/AVIF compression or modern responsive srcsets degrade LCP (Largest Contentful Paint).
* **Recommendation:** Replace with Next.js `<Image />` component.

---

## 5. Prioritized Remediation Action Plan

| Priority | Issue | Action Item | Estimated Effort |
| :--- | :--- | :--- | :--- |
| **P0 (Immediate)** | CI Build Broken | Remove `web/fix.js`, fix `layout.tsx` `<a>` tag, fix `loading.tsx` React 19 hook, and fix `test/security.test.ts` imports. | 15 mins |
| **P0 (Immediate)** | Timing Attack on Webhook | Update `web/src/app/api/webhook/route.ts` to use `crypto.timingSafeEqual()`. | 10 mins |
| **P1 (High)** | IP Spoofing Rate Limit Bypass | Fix `resolveClientIp` in `web/src/lib/local-rate-limit.ts` to prioritize non-spoofable headers. | 15 mins |
| **P1 (High)** | OTP Hourly Limit Bypass | Stop deleting historical records in `api/verify/email/send/route.ts`. | 20 mins |
| **P1 (High)** | Silent Mock Fallback in Prod | Throw explicit error in `server.ts` and `admin.ts` if Supabase keys are missing in production. | 15 mins |
| **P1 (High)** | TLS Verification Disabled | Remove `NODE_TLS_REJECT_UNAUTHORIZED = "0"` from `next.config.ts`. | 5 mins |
| **P2 (Medium)** | Profile Email Desync | Separate `university_email` from auth email in `users` table. | 45 mins |
| **P2 (Medium)** | Bundle Optimization | Remove duplicate `framer-motion` dependency in favor of `motion`. | 15 mins |
| **P2 (Medium)** | Schema Consolidation | Group the 10 `.sql` files into numbered sequential Supabase migrations. | 1 hour |
| **P3 (Low)** | Rate Limiting Persistence | Migrate rate limiting from in-memory Map to Upstash Redis or Supabase RPC. | 2 hours |

---

*Report prepared autonomously by Antigravity Agent.*
