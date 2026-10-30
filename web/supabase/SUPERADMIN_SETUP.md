# Superadmin (Platform Control Plane) — Setup

Follow these steps in order to provision the LerenGO platform-wide **superadmin** control
plane at `/admin/control`. **Order matters:** run the SQL first, then the provision script —
the script writes `role='superadmin'` and the ban columns, which don't exist until the SQL runs.

---

## Step 1 — Run the SQL in Supabase

Open your Supabase project → **SQL Editor** → **New query** → paste the entire contents of this
file and run it:

```
web/supabase/superadmin_schema.sql
```

This adds:
- the `superadmin` role value
- the ban columns (`is_banned`, `banned_at`, `banned_by`, `banned_reason`)
- the `is_superadmin()` function
- superadmin RLS policies
- the `admin_audit_log` table

It is idempotent — safe to re-run.

---

## Step 2 — Run the provision script (from your terminal, not Supabase)

```bash
cd web
npm run provision:superadmin
```

This needs two variables already present in `web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — the **service role** key from
  Supabase → **Settings → API** (not the anon key)

The script is idempotent: it creates the auth user (or resets its password + confirms the
email if it already exists) and upserts the matching `public.users` row as
`role='superadmin', verified=true`.

---

## Credentials (built-in defaults)

The script uses these unless you override them:

| Field    | Value                  |
| -------- | ---------------------- |
| Email    | `anand01ts@gmail.com`  |
| Password | `Anand.1105`           |

To use different credentials instead:

```bash
SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='YourStrongPass' npm run provision:superadmin
```

Other optional overrides: `SUPERADMIN_FULL_NAME`, `SUPERADMIN_ADMIN_USER_ID`.

> The password is never stored in application code — it lives (hashed) in Supabase Auth,
> and the role lives in the `public.users` row.

---

## Step 3 — Sign in

Go to **`/admin/control/login`** and sign in with the email + password above.

---

## Troubleshooting

If the provision script fails, it prints a checklist. The usual causes:

- **SQL not applied yet** — run Step 1 first (the `superadmin` role + ban columns must exist).
- **Missing env vars** — confirm `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
  are set in `web/.env.local`.
- **Wrong key** — `SUPABASE_SERVICE_ROLE_KEY` must be the **service role** key, not the anon key.
