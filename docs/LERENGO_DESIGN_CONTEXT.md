# LerenGO Design Context

Last audited: 2026-05-11

This document is the source of truth for future LerenGO UI work. It documents the product model and design system that actually exists in the repository. Do not invent a new visual system when adding features.

## 1. Product Understanding

LerenGO is one guided platform for practical skills, project building, university collaboration, mentorship, and opportunity discovery. The product should feel like one serious system, not separate products stitched together.

Current and planned module model:

- **SkillGO**: practical learning tracks, paid course access, certificates, assessments, proof of work, and career momentum.
- **ForgeGO**: idea intake, research direction, prototype planning, patent/publication support, and guided build execution.
- **CampusGO**: verified university-scoped notes, mentorship, community, project support, campus validation, and admin/reviewer workflows.
- **MentorGO**: verified mentor discovery, mentor profiles, session types, availability, paid bookings, mentor dashboard, student booking views, and admin verification.
- **HunterGO**: verified talent discovery and headhunting based on SkillGO proof, ForgeGO projects, CampusGO validation, and privacy-controlled MentorGO signals.

The core journey is:

**learn -> build -> validate/support -> get expert guidance -> get discovered**

Main existing flows:

- Public platform homepage at `web/src/app/page.tsx` explains the SkillGO -> ForgeGO -> CampusGO system.
- SkillGO uses `/courses` and `/courses/[slug]` for catalog, paid access, curriculum, assessment, and certificates.
- ForgeGO uses `/labs` and `/labs/submit` for public positioning and idea intake.
- CampusGO uses `/campus-network`, `/browse-notes`, `/community`, `/community/project-board`, and `/mentorship` for verified campus workflows.
- Auth/onboarding uses `/signin`, `/signup`, `/onboarding/university`, `/onboarding/campus-profile`, and `/verify`.
- Admin uses `/admin` plus workspace routes for notes, verification, community, mentorship, courses, labs, payments, universities, and analytics.

## 2. Frontend Architecture

Stack:

- Next.js App Router, `next@16.1.6`
- React `19.2.3`
- TypeScript
- Supabase SSR/client/admin libraries
- Razorpay dependency for payments
- Plain CSS and CSS Modules; there is no Tailwind config in the app.

Important files:

- App root: `web/src/app/layout.tsx`
- Global CSS/tokens: `web/src/app/globals.css`
- Homepage: `web/src/app/page.tsx`, `web/src/app/page.module.css`
- SkillGO: `web/src/app/courses/page.tsx`, `web/src/app/courses/page.module.css`
- ForgeGO: `web/src/app/labs/page.tsx`, `web/src/app/labs/page.module.css`
- CampusGO: `web/src/app/campus-network/page.tsx`, `web/src/app/campus-network/page.module.css`
- In-app CampusGO surfaces: `web/src/app/browse-notes`, `web/src/app/community`, `web/src/app/mentorship`
- Shared components: `web/src/components/profile-menu.tsx`, `site-footer.tsx`, `transition-link.tsx`, `scroll-reveal-controller.tsx`, `page-transition-controller.tsx`, `info-page-shell.tsx`
- Admin shared styles: `web/src/app/admin/workspace.module.css`
- Auth shared styles: `web/src/app/(auth)/auth-flow.module.css`
- Middleware/subdomain routing: `web/middleware.ts`

Data and access patterns:

- Server components and server-side Supabase queries are common.
- Auth/session helpers live in `web/src/lib/auth.ts` and `web/src/lib/tenant.ts`.
- Verified CampusGO access goes through `requireVerifiedProfile`.
- Admin access goes through `requireAdminUser`.
- Course and lab domain logic is centralized under `web/src/lib/courses.ts` and `web/src/lib/labs.ts`.
- APIs live under `web/src/app/api`.
- Route/subdomain rewriting maps root module paths to `skillgo`, `forgego`, `campusgo`, and `admin` host patterns.

## 3. Brand and Tone

LerenGO should feel:

- calm
- structured
- credible
- academic/productive
- trust-first
- low-noise
- outcome-oriented
- practical
- institutional without feeling stale

Copy should be direct and precise. Avoid hype, inflated startup language, fake credibility, and vague claims. Good copy explains the next step, the trust boundary, or the outcome. Bad copy makes unsupported claims like "world-class", "revolutionary", "AI-powered future", or fake partner/placement promises.

## 4. Visual Design Language

### Color

The working palette is charcoal, off-white, and cool grey.

Global tokens in `web/src/app/globals.css` include:

- `--charcoal: #1f2933`
- `--offwhite: #f9fafb`
- `--gray: #6b7280`
- `--bg`, `--text`, `--muted`, `--panel`, `--border`, `--accent`, `--accent-dark`
- `--danger: #b91c1c`
- `--success: #047857`

Public module pages commonly define local CSS variables:

- background: `#23282f`, `#252b32`
- surface: `#2b3138`, `#323941`, `rgba(43, 49, 56, 0.78)`
- text: `#f5f0e8`, `#f9fafb`
- soft text: `rgba(245, 240, 232, 0.74)` or similar
- accent: `#96a1ab`, `#bcc4cb`
- line/ring: `rgba(188, 196, 203, 0.08)` to `0.18`

Use the 60/30/10 balance already present: mostly charcoal, off-white for reading hierarchy, cool grey for accents and primary actions. Do not introduce random purple, orange, neon, or unrelated brand colors. Some older CSS contains amber/orange remnants later overridden by clean retheme blocks; future work should follow the rethemed charcoal/off-white/cool-grey layer.

### Typography

The app imports Sora in `globals.css`. Preserve it.

Global type variables:

- `--type-display`
- `--type-hero`
- `--type-section`
- `--type-title`
- `--type-body-lg`
- `--type-body`
- `--type-body-sm`

Patterns:

- Hero titles are large, heavy, tight, and editorial: often `font-weight: 800`, tight line-height, negative letter spacing in existing CSS.
- Section headings are strong and compact.
- Body copy is lower contrast with generous line-height around `1.6` to `1.7`.
- Eyebrows are uppercase, letter-spaced, cool grey, and small.
- Buttons are bold and compact.

Do not change fonts or create a new type scale.

### Layout and Spacing

Common public page pattern:

- full viewport charcoal background
- `main` canvas with subtle radial/linear background
- max-width containers around `1280px` to `1320px`
- top utility bar when useful
- glassy/soft dark header
- clear hero
- structured sections
- grid/card systems
- CTA band and global footer for public-facing routes

Spacing uses `clamp()` heavily. Preserve responsive spacing rather than hardcoding fixed desktop-only gaps.

### Radius, Borders, and Elevation

Existing radii:

- global `--radius-panel: 18px`
- global `--radius-control: 12px`
- public module cards often `24px` to `30px`
- admin cards often `18px`
- pills use `999px`

Existing elevation:

- public module shadow: `0 24px 58px rgba(7, 9, 11, 0.24)` or nearby
- card hover: subtle lift `translate3d(0, -1px/-2px, 0)` and stronger shadow
- ring/border language: usually `box-shadow: inset 0 0 0 1px rgba(188, 196, 203, 0.08)`

Do not add loud outlines, aggressive borders, or heavy decorative glow.

### Cards and Panels

Cards are dark, quiet, elevated surfaces:

- translucent charcoal fills
- soft shadow
- subtle inset ring
- large but consistent radius
- strong title, softer body
- restrained hover lift

Admin cards are denser and use `workspace.module.css` patterns: dark panels, compact stat cards, tables, pills, empty states, and form grids.

Do not put white marketing cards inside core dark module surfaces. Auth/forms may use dark form panels after the clean retheme.

### Buttons and CTAs

Primary CTAs:

- cool-grey gradient such as `linear-gradient(180deg, #a0aab3 0%, #8b96a0 100%)`
- dark ink text `#20252b`
- bold weight
- shadow
- radius around `18px` or pill depending on context

Secondary CTAs:

- translucent dark fill
- subtle inset ring
- off-white or soft off-white text
- gentle hover brightness/lift

CTA hierarchy should be clear. One primary action per decision area is usually enough.

### Forms and Inputs

Inputs use:

- dark translucent fill on dark surfaces
- subtle inset ring
- `min-height` around `44px` to `50px`
- radius `12px` to `16px`
- visible labels
- focus state using brighter ring/shadow, not color explosions

Use existing auth and admin form patterns before creating new form styling.

### Navigation

Public pages use top headers with logo, compact nav links, and primary/secondary actions. Campus in-app pages use a workspace nav/top-bar pattern with module links, university pill, and `ProfileMenu`.

The compact university badge pattern is important:

- logo
- university name
- small cool-grey status dot
- horizontal pill/card treatment

Do not inflate it into a large fake credibility block unless the screen needs real operational context.

### Icons and Media

Existing icon usage is mostly image assets in `web/public`, such as module icons, notes, mentorship, community, arrow, and university logo. There is no icon library dependency. Do not add one unless a real technical/design need exists.

Profile images should reuse existing avatar/fallback conventions.

### Empty, Loading, and Error States

Loading states use dark skeleton blocks with shimmer in `globals.css` and `info-page-loading.module.css`.

Empty states are dark panels with:

- concise title
- direct explanation
- optional reset/next action

Errors/success messages are plain, compact, and state-colored only where necessary. Avoid dramatic alert styling.

### Motion

Motion is subtle:

- route transition via `PageTransitionController`
- link transition via `TransitionLink`
- reveal-on-scroll via `ScrollRevealController`
- cards/buttons lift slightly on hover
- loading shimmer

Respect `prefers-reduced-motion`. Do not add bouncy animations, looping decorative motion, or attention-seeking effects.

### Responsive Behavior

Existing behavior:

- desktop grids collapse to one column at tablet/mobile widths
- nav wraps or hides compactly
- buttons become full width on mobile
- max-width containers and `clamp()` type keep pages balanced
- `overflow-x: clip` is used to prevent horizontal scroll

Every future page must be checked for mobile text wrapping, non-overlapping controls, and no horizontal overflow.

## 5. Page Composition Patterns

New public module pages should usually follow:

1. Calm header/nav with logo and concise module links.
2. Clear hero with direct product statement.
3. Short explanatory subcopy.
4. Structured sections with restrained card grids or panels.
5. Clear primary/secondary CTA hierarchy.
6. FAQ or support block only when it answers real objections.
7. Footer/legal links when public-facing.

New dashboard/workspace pages should usually follow:

1. Existing workspace shell/top-bar pattern.
2. University/profile context where relevant.
3. Dense but readable cards/tables/forms.
4. Explicit state badges.
5. Empty states and permission gates.
6. Server-side role validation.

## 6. Module-Specific Rules

### SkillGO

SkillGO should feel curated, premium, learning/career oriented, and catalog-like without becoming noisy.

Use patterns from `web/src/app/courses`. Preserve:

- searchable catalog header
- course columns/cards
- category chips
- partner signals only when data supports them
- proof/certificate/outcome language

Do not add fake partner claims or imply official affiliations unless backed by real data/content.

### ForgeGO

ForgeGO should feel serious, review-driven, pipeline-based, and execution-oriented.

Use patterns from `web/src/app/labs`. Preserve:

- track cards
- step/process cards
- review/classification panels
- idea maturity, research, prototype, patent, publication, and build support language

Do not make it a casual idea wall.

### CampusGO

CampusGO should feel verified, university-scoped, secure, mentorship/community oriented, and trust-heavy.

Use patterns from `web/src/app/campus-network`, `browse-notes`, `community`, and current `mentorship`.

Preserve:

- verified profile gate
- university badge
- workspace nav
- live campus signals where real data exists
- admin/reviewer support boundaries

Do not make CampusGO a public social network.

### MentorGO

MentorGO is a trust-first mentor marketplace, not a casual social app.

Required product concepts from the new specs:

- mentor directory
- mentor cards with display picture/avatar, name, headline, mentor type, expertise tags, rating/review count if real, starting price, and next available slot
- full mentor profile with bio, expertise, experience, education, achievements, session offerings, pricing, availability, reviews, policies, and proof links
- mentor-owned profile editor
- availability/free slot management
- session types/pricing
- paid booking flow with booking and payment states
- student booking views
- mentor dashboard
- admin verification/moderation

Critical state model:

- mentor verification: `draft`, `submitted`, `approved`, `rejected`, `suspended`
- booking: `draft`, `pending_payment`, `payment_failed`, `pending_mentor_approval`, `confirmed`, `reschedule_requested`, `cancelled_by_student`, `cancelled_by_mentor`, `completed`, `no_show`, `refunded`, `disputed`
- payment: `not_required`, `pending`, `paid`, `failed`, `refunded`, `partial_refund`

Hard rules:

- Only approved and published mentors appear publicly.
- Mentors can edit only their own profiles unless admin.
- Booking must prevent double booking at service/database level, not only in UI.
- Payment logic must be abstracted or use the existing provider boundary; do not hardcode payment logic into UI components.
- Profile credibility fields may require re-approval.
- Student booking context is private to student, mentor, and admins.

### HunterGO

HunterGO is a verified talent discovery and headhunting module. It must not become a generic job board or resume dump.

Required product concepts from the new specs:

- student talent profile activation and editing
- conservative privacy/discoverability defaults
- proof signals from SkillGO, ForgeGO, CampusGO, and privacy-controlled MentorGO
- recruiter/company onboarding
- recruiter/company verification
- talent search for verified recruiters
- candidate profile view with allowed fields only
- shortlists
- opportunities
- candidate invites
- basic hiring pipeline
- admin moderation, reports, invite limits, and audit

Critical state model:

- discoverability: `private`, `lerengo_only`, `verified_recruiters`, `public_link`
- recruiter/company verification: `pending`, `verified`, `rejected`, `suspended`
- opportunity: `draft`, `pending_review`, `published`, `paused`, `closed`, `archived`
- invite: `sent`, `viewed`, `accepted`, `declined`, `expired`, `withdrawn`
- pipeline: `invited`, `interested`, `applied`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`

Hard rules:

- Students must opt in before being discoverable.
- Candidate profiles should default to private or conservative visibility.
- Recruiters must be verified before broad search/outreach.
- Contact details must stay hidden unless the student opts in or reaches the allowed pipeline stage.
- Recruiter private notes must never be visible to candidates.
- Invite quotas and abuse controls are mandatory.
- Proof-first profile design is the differentiator; do not lead with resume-only/job-board patterns.

## 7. Credibility Rules

Do not make fake partner claims, fake mentor/recruiter/company claims, fake success metrics, fake placement guarantees, fake testimonials, or implied official relationships unless existing repo data/content supports them.

Prefer precise product language:

- "verified mentors"
- "published courses"
- "campus-scoped notes"
- "proof signals"
- "pending verification"
- "available slots"
- "confirmed booking"

Avoid inflated language:

- "world-class"
- "industry-leading"
- "revolutionary"
- "guaranteed placements"
- "AI-powered everything"

## 8. Implementation Rules

For every future UI change:

- Read this file first.
- Read relevant module specs in `md/` for MentorGO/HunterGO work.
- Identify the module: LerenGO, SkillGO, ForgeGO, CampusGO, MentorGO, HunterGO, or shared admin/auth.
- Inspect the closest existing screen/component before coding.
- Reuse existing components and CSS patterns first.
- Match existing typography, spacing, colors, radius, cards, buttons, forms, shadows, motion, and responsive behavior.
- Keep the diff minimal and reviewable.
- Add no dependency unless there is a strong technical reason.
- Use server-side validation/authorization for sensitive actions.
- Do not trust client-only enforcement for roles, payments, bookings, recruiter access, or private candidate data.
- Add loading, empty, and error states for new major screens.
- Run available checks before finalizing when product code changes.

Closest pattern guide:

- Public module landing: homepage, `/courses`, `/labs`, `/campus-network`
- Catalog/directory: `/courses`, current `/mentorship`, `/browse-notes`
- Profile card/detail: current mentorship cards, course detail, community cards
- Dashboard/workspace: `/admin`, `/admin/*`, current CampusGO in-app shells
- Forms/settings: auth forms, admin workspace forms, onboarding forms, labs submit
- Tables/review queues: `web/src/app/admin/workspace.module.css`
- Loading: global loading skeletons and `info-page-loading`
- Policy/info pages: `InfoPageShell`

## 9. Future-Work Checklist

Before coding any requested feature, answer internally:

- Which module does this belong to?
- Does this preserve the learn -> build -> validate/support -> guidance -> discovery model?
- Which existing page/component pattern is closest?
- Which CSS variables/classes should be reused?
- What is the CTA hierarchy?
- What role and permission boundaries apply?
- What states are required?
- Does the feature touch money, identity, private user data, booking, recruiter outreach, or candidate privacy?
- Does the UI feel calm, structured, credible, and native to LerenGO?
- Is any requested visual direction off-brand?
- Can the feature be built with a smaller, cleaner diff?

If a request conflicts with this design context, choose the closest native LerenGO pattern and state the conflict directly.
