## LerenGO Web

Campus-facing web app for LerenGO. This app contains:

- public LerenGO homepage
- sign in / sign up / onboarding flow
- campus verification flow
- campus network modules:
  - notes
  - mentorship
  - campus community
- admin workspace:
  - `/admin`
  - `/admin/notes`
  - `/admin/verification`
  - `/admin/community`

## Local Development

1. Copy `.env.example` to `.env.local`.
2. Fill required Supabase and SMTP values.
3. (Optional, only for local smoke tests) Leave Supabase blank to use the
   built-in mock client in development. Production builds refuse to serve
   data routes without real Supabase credentials.
4. Run:

```bash
npm run dev
```

This uses webpack in development to avoid the Turbopack cache corruption issue
that can happen on some Windows setups. If you want to try Turbopack anyway,
run:

```bash
npm run dev:turbo
```

4. Open `http://localhost:3000`.
5. Check readiness (no secrets are returned):

```bash
curl http://localhost:3000/api/health
```

`status: "ready"` means all integration checks pass. Otherwise `missing`
names the integrations to configure: `supabase`, `supabaseServiceRole`,
`smtp`, `razorpay`, `appUrl`.

### Supabase setup (required before production)

Apply the SQL files in `supabase/` to the target Supabase project, in this
order:

1. `supabase/schema.sql` — core users, universities, notes, verification
2. `supabase/verification_schema.sql` — campus verification requests
3. Feature schemas you ship: `courses_schema.sql`, `labs_schema.sql`,
   `mentorgo_schema.sql`, `mentorship_chat.sql`, `huntergo_schema.sql`,
   `campus_weekly_schema.sql`, `module_expansion_schema.sql`

Then create these **private** storage buckets and verify RLS:

- `notes-private` (`SUPABASE_NOTES_BUCKET`)
- `id-cards` (`SUPABASE_ID_CARDS_BUCKET`)

Finally, create at least one real admin row in `public.users` and configure
Supabase Auth redirect URLs for every app origin listed below.

## Important Environment Variables

- `NEXT_PUBLIC_APP_URL`
  - main user-facing app URL (must match the port you run locally on,
    e.g. `http://localhost:3000`, or the production domain)
- `NEXT_PUBLIC_ADMIN_APP_URL`
  - admin app origin used by middleware for admin routing
  - local default can stay `http://localhost:3000`
  - production should be `https://admin.lerengo.com`
- `NEXT_PUBLIC_CAMPUS_NETWORK_APP_URL`, `NEXT_PUBLIC_COURSES_APP_URL`,
  `NEXT_PUBLIC_LABS_APP_URL`, `NEXT_PUBLIC_MENTORGO_APP_URL`,
  `NEXT_PUBLIC_HUNTERGO_APP_URL`
  - sibling origins for CampusGO, SkillGO, ForgeGO, MentorGO, HunterGO.
    See `.env.vercel.example` for the production values.
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - required in production; data routes return 500 without them
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - required in production for admin/client-backed routes
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - all required for the verification email routes
  (`/api/verify/email/send`). `SMTP_FROM` must be a sender address
  authorized by your provider.
- Razorpay: `RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`,
  `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
  - required for `/api/create-order` and `/api/webhook`; otherwise those
    routes return 503. Set the webhook URL/secret in the Razorpay dashboard
    after configuring `RAZORPAY_WEBHOOK_SECRET`.

## Admin Subdomain Routing

The app is prepared for a separate admin surface.

Behavior:

- user site can live on `https://lerengo`
- admin site can live on `https://admin.lerengo`
- middleware redirects `/admin/*` traffic to the admin origin when `NEXT_PUBLIC_ADMIN_APP_URL` is configured
- visiting `admin.lerengo/` redirects to `/admin`

## Production Setup For `admin.lerengo`

You still need to do these outside the repo:

1. Create DNS record for `admin.lerengo`.
2. Attach that domain/subdomain in your hosting provider.
3. Set:

```bash
NEXT_PUBLIC_ADMIN_APP_URL=https://admin.lerengo
```

4. Redeploy.

## Sample Data and Sample Login

1. Set `ENABLE_SAMPLE_LOGIN=true`.
2. Run:

```bash
npm run seed:sample
```

3. Open `/signin`.
