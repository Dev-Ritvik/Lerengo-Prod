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
3. Run:

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

## Important Environment Variables

- `NEXT_PUBLIC_APP_URL`
  - main user-facing app URL
- `NEXT_PUBLIC_ADMIN_APP_URL`
  - admin app origin used by middleware for admin routing
  - local default can stay `http://localhost:3000`
  - production should be `https://admin.lerengo`

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
