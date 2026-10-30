import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuthShell } from "../../admin-auth-shell";
import styles from "../../admin-auth-shell.module.css";
import { signInSuperAdmin } from "./actions";
import { resolveAppUrl } from "@/lib/app-url";
import { getSessionUser } from "@/lib/tenant";

type Props = {
  searchParams: Promise<{
    error?: string;
    email?: string;
  }>;
};

function getErrorMessage(error: string | undefined) {
  if (!error) {
    return null;
  }

  switch (error) {
    case "missing_credentials":
      return "Enter both the superadmin email and password.";
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "not_superadmin":
      return "This account does not have platform superadmin access.";
    case "suspended":
      return "This account has been suspended.";
    case "not_verified":
      return "This superadmin account is not verified yet.";
    case "email_not_confirmed":
      return "Confirm the account email before signing in.";
    default:
      return "Sign-in failed. Please retry.";
  }
}

export const dynamic = "force-dynamic";

export default async function SuperAdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const appUrl = resolveAppUrl();
  const defaultEmail = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  const errorMessage = getErrorMessage(params.error);

  const session = await getSessionUser();
  if (session) {
    const { data: profile } = await session.supabase
      .from("users")
      .select("role, verified, is_banned")
      .eq("id", session.authUser.id)
      .maybeSingle();

    if (profile?.role === "superadmin" && profile?.verified && !profile?.is_banned) {
      redirect("/admin/control");
    }
  }

  return (
    <AdminAuthShell
      backHref={appUrl}
      backLabel="Back to main site"
      checklist={[
        "Platform superadmin has full cross-campus control: users, mentors, courses, and every module.",
        "Access is granted by the 'superadmin' role in Supabase — provisioned with scripts/provision-superadmin.mjs.",
        "This lane is separate from the campus admin workspace and from the student product.",
      ]}
      chips={["Superadmin", "Password sign in", "Whole-platform control"]}
      description="Sign in to the LerenGO platform control plane with your superadmin email and password."
      eyebrow="Platform control"
      spotlightBody="The control plane governs every campus at once — banning users, approving mentors, publishing courses, and moderating each module from one surface."
      spotlightEyebrow="God mode"
      spotlightTitle="One dashboard to control anything and everything on LerenGO."
      title="Superadmin sign in"
    >
      <div>
        <p className={styles.panelEyebrow}>Superadmin access</p>
        <h2 className={styles.panelTitle}>Enter your platform superadmin credentials</h2>
        <p className={styles.panelCopy}>
          Only the verified <code>superadmin</code> role can open this dashboard. Every action here
          is recorded in the admin audit log.
        </p>
      </div>

      {errorMessage ? <p className={`${styles.message} ${styles.error}`}>{errorMessage}</p> : null}

      <form className={styles.form} action={signInSuperAdmin}>
        <label className={styles.label} htmlFor="superadmin-email">
          Superadmin email
        </label>
        <input
          autoComplete="email"
          className={styles.input}
          defaultValue={defaultEmail}
          id="superadmin-email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />

        <label className={styles.label} htmlFor="superadmin-password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className={styles.input}
          id="superadmin-password"
          name="password"
          placeholder="Your password"
          required
          type="password"
        />

        <button className={styles.primaryButton} type="submit">
          Sign in to control plane
        </button>
      </form>

      <div className={styles.helperStack}>
        <div className={styles.helperRow}>
          <span>Campus admin instead?</span>
          <Link className={styles.helperLink} href="/admin/login">
            Go to campus admin login
          </Link>
        </div>
        <div className={styles.helperRow}>
          <span>Need access?</span>
          <Link className={styles.helperLink} href="/admin/request-access">
            Request admin access
          </Link>
        </div>
      </div>
    </AdminAuthShell>
  );
}
